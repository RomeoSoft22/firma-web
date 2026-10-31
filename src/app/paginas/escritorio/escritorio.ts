import { DatePipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Icono, NombreIcono } from '../../compartido/icono';
import { Colocacion, VisorDocumento } from '../../compartido/visor-documento';
import { AgenteService } from '../../core/agente.service';
import { ApiService } from '../../core/api.service';
import { base64ABlob, mensajeError } from '../../core/archivos';
import { EscritorioService } from '../../core/escritorio.service';
import { EstadoService } from '../../core/estado.service';
import { MarcaService } from '../../core/marca.service';
import { Certificado, DocumentoSubido, PosicionFirma, VerificacionResultado } from '../../core/modelos';

interface DocumentoAbierto {
  ruta: string | null;
  nombre: string;
  base64: string;
  bytes: Uint8Array;
}

type TipoFirma = 'titular' | 'vb';
type Menu = 'archivo' | 'firmar' | 'vb' | null;
type Dialogo = 'certificado' | 'verificar' | 'estado' | 'acerca' | null;

interface Comprobacion {
  nombre: string;
  detalle: string;
  ok: boolean | null;
  icono: NombreIcono;
}

/**
 * Aplicación de escritorio Firma Digital: abrir un PDF, firmar como titular o con V° B° (posición
 * automática según el motivo), firma / V° B° avanzada (el usuario elige dónde con el mouse),
 * verificar, imprimir, acercar / alejar / ajustar. Usa el agente local y la API de firma.juarezcampos.net.
 */
@Component({
  selector: 'app-escritorio',
  imports: [Icono, VisorDocumento, DatePipe],
  templateUrl: './escritorio.html',
  styleUrl: './escritorio.scss',
})
export class EscritorioPagina implements OnInit, OnDestroy {
  private readonly agente = inject(AgenteService);
  private readonly api = inject(ApiService);
  protected readonly estado = inject(EstadoService);
  protected readonly marca = inject(MarcaService);
  protected readonly puente = inject(EscritorioService);

  private readonly visor = viewChild(VisorDocumento);

  protected readonly documento = signal<DocumentoAbierto | null>(null);
  protected readonly menu = signal<Menu>(null);
  protected readonly dialogo = signal<Dialogo>(null);
  protected readonly ocupado = signal<string | null>(null);
  protected readonly aviso = signal<{ texto: string; error: boolean } | null>(null);
  protected readonly ahora = signal(new Date());

  // Firma
  protected readonly colocacion = signal<{ ancho: number; alto: number } | null>(null);
  private tipoEnCurso: TipoFirma = 'titular';
  private posicionElegida: Colocacion | null = null;
  protected readonly certificados = signal<Certificado[]>([]);
  protected readonly certificadoElegido = signal<Certificado | null>(null);
  protected readonly cargandoCertificados = signal(false);
  private resolverCertificado: ((c: Certificado | null) => void) | null = null;

  // Verificación / estado
  protected readonly verificacion = signal<VerificacionResultado | null>(null);
  protected readonly comprobaciones = signal<Comprobacion[]>([]);

  protected readonly titulo = computed(() => this.documento()?.nombre ?? '');
  protected readonly todoBien = computed(() => this.estado.agenteOk() === true && this.estado.apiOk() === true);
  protected readonly version = computed(() => this.estado.infoAgente()?.version ?? '');
  protected readonly enColocacion = computed(() => !!this.colocacion());

  private reloj?: ReturnType<typeof setInterval>;
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    document.title = 'Firma Digital';
    this.estado.iniciar();
    this.marca.cargar();
    this.reloj = setInterval(() => this.ahora.set(new Date()), 15_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.reloj);
  }

  // ------------------------------------------------------------------ Menús

  protected alternar(menu: Menu, evento: Event): void {
    evento.stopPropagation();
    this.menu.update((m) => (m === menu ? null : menu));
  }

  @HostListener('document:click')
  protected cerrarMenus(): void {
    this.menu.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  protected teclas(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.colocacion()) this.cancelarColocacion();
      else if (this.dialogo() === 'certificado') this.elegirCertificado(null);
      else this.dialogo.set(null);
      this.menu.set(null);
      return;
    }
    if (!e.ctrlKey) return;
    const k = e.key.toLowerCase();
    if (k === 'o') { e.preventDefault(); this.abrir(); }
    else if (k === 'p' && this.documento()) { e.preventDefault(); this.imprimir(); }
    else if (k === 's' && this.documento()) { e.preventDefault(); this.guardarComo(); }
    else if ((k === '+' || k === '=') && this.documento()) { e.preventDefault(); this.visor()?.acercar(); }
    else if (k === '-' && this.documento()) { e.preventDefault(); this.visor()?.alejar(); }
  }

  // ------------------------------------------------------------------ Archivo

  protected async abrir(): Promise<void> {
    this.menu.set(null);
    try {
      const archivo = await this.puente.abrir();
      if (!archivo) return;
      this.cargar(archivo.ruta, archivo.nombre, archivo.base64);
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  private cargar(ruta: string | null, nombre: string, base64: string): void {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
      this.avisar('El archivo no es un PDF válido.', true);
      return;
    }
    this.cancelarColocacion();
    this.documento.set({ ruta, nombre, base64, bytes });
    document.title = `${nombre} — Firma Digital`;
  }

  protected cerrar(): void {
    this.menu.set(null);
    this.cancelarColocacion();
    this.documento.set(null);
    document.title = 'Firma Digital';
  }

  protected async guardarComo(): Promise<void> {
    this.menu.set(null);
    const doc = this.documento();
    if (!doc) return;
    try {
      const r = await this.puente.guardarComo(doc.nombre, doc.base64);
      if (r) this.avisar(`Guardado como ${r.ruta ?? r.nombre}.`);
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  protected async imprimir(): Promise<void> {
    this.menu.set(null);
    const doc = this.documento();
    if (!doc) return;
    try {
      await this.puente.imprimir(doc.nombre, doc.base64);
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  protected mostrarEnCarpeta(): void {
    const ruta = this.documento()?.ruta;
    if (ruta) this.puente.mostrarEnCarpeta(ruta);
  }

  // ------------------------------------------------------------------ Firma

  /** Motivo de cada tipo: titular = motivo por defecto; V° B° = el motivo de visto bueno. */
  private motivoDe(tipo: TipoFirma): string {
    const motivos = this.estado.motivos();
    const porDefecto = this.estado.parametros()['motivo_defecto'] || motivos[0]?.descripcion || '';
    if (tipo === 'titular') return porDefecto;
    const vb = motivos.find((m) => /v\s*°\s*b\s*°|visto bueno/i.test(m.descripcion));
    return vb?.descripcion ?? porDefecto;
  }

  /** Firma con posición automática (titular: arriba a la derecha; V° B°: abajo a la izquierda). */
  protected async firmar(tipo: TipoFirma): Promise<void> {
    this.menu.set(null);
    if (!this.exigirDocumento()) return;
    const posicion: PosicionFirma = tipo === 'titular' ? 'superior-derecha' : 'inferior-izquierda';
    const cert = await this.pedirCertificado();
    if (cert) await this.ejecutarFirma(tipo, cert, { posicion, pagina: 1, x: 0, y: 0 });
  }

  /** Firma avanzada: el rectángulo rojo sigue al mouse; con un clic se elige dónde va el sello. */
  protected firmarAvanzada(tipo: TipoFirma): void {
    this.menu.set(null);
    if (!this.exigirDocumento()) return;
    this.tipoEnCurso = tipo;
    this.colocacion.set(this.estado.tamanoDeMotivo(this.motivoDe(tipo)));
  }

  protected async alColocar(c: Colocacion): Promise<void> {
    this.posicionElegida = c;
    this.colocacion.set(null);
    const cert = await this.pedirCertificado();
    if (cert) await this.ejecutarFirma(this.tipoEnCurso, cert, { posicion: 'manual', pagina: c.pagina, x: c.x, y: c.y });
  }

  protected cancelarColocacion(): void {
    this.colocacion.set(null);
    this.posicionElegida = null;
  }

  private exigirDocumento(): boolean {
    if (this.documento()) return true;
    this.avisar('Primero abra un PDF (Archivo → Abrir PDF).', true);
    return false;
  }

  private async ejecutarFirma(
    tipo: TipoFirma,
    cert: Certificado,
    lugar: { posicion: PosicionFirma; pagina: number; x: number; y: number },
  ): Promise<void> {
    const doc = this.documento();
    if (!doc) return;
    const motivo = this.motivoDe(tipo);
    this.ocupado.set('Firmando… ingrese el PIN de su token si se solicita');
    let registro: DocumentoSubido | null = null;
    try {
      const op = await this.estado.opcionesParaFirmar({
        ...this.estado.opcionesPorDefecto(),
        motivo,
        visible: true,
        ...lugar,
      });

      if (this.estado.apiOk()) {
        const archivo = new File([base64ABlob(doc.base64)], doc.nombre, { type: 'application/pdf' });
        registro = await this.api.subirDocumento(archivo).catch(() => null);
      }

      const r = await this.agente.firmar(cert.thumbprint, doc.base64, doc.nombre, op);
      const guardado = await this.puente.guardarFirmado(doc.ruta, doc.nombre, r.pdfBase64);

      if (registro) {
        await this.api
          .registrarFirma(registro, base64ABlob(r.pdfBase64), r, op.motivo, op.ubicacion, this.estado.infoAgente()?.equipo)
          .catch(() => undefined);
      }

      const nombre = guardado?.nombre ?? doc.nombre.replace(/\.pdf$/i, '') + '[F].pdf';
      this.cargar(guardado?.ruta ?? null, nombre, r.pdfBase64);
      const pagina = lugar.posicion === 'manual' ? lugar.pagina : 1;
      setTimeout(() => this.visor()?.irA(pagina), 600);
      this.avisar(guardado?.ruta ? `Documento firmado y guardado en ${guardado.ruta}` : `Documento firmado: ${nombre}`);
    } catch (e) {
      const mensaje = mensajeError(e);
      this.avisar(mensaje, true);
      if (registro) this.api.registrarError(registro, mensaje).catch(() => undefined);
    } finally {
      this.ocupado.set(null);
      this.posicionElegida = null;
    }
  }

  // ------------------------------------------------------------------ Selección de certificado

  private pedirCertificado(): Promise<Certificado | null> {
    this.dialogo.set('certificado');
    this.cargarCertificados();
    return new Promise((resolver) => (this.resolverCertificado = resolver));
  }

  protected async cargarCertificados(): Promise<void> {
    this.cargandoCertificados.set(true);
    try {
      const lista = await this.agente.certificados(false);
      this.certificados.set(lista);
      const elegido = this.certificadoElegido();
      if (!elegido || !lista.some((c) => c.thumbprint === elegido.thumbprint)) {
        this.certificadoElegido.set(lista.find((c) => c.aptoFirma) ?? null);
      }
    } catch (e) {
      this.certificados.set([]);
      this.avisar(mensajeError(e), true);
    } finally {
      this.cargandoCertificados.set(false);
    }
  }

  protected elegirCertificado(cert: Certificado | null): void {
    this.dialogo.set(null);
    const resolver = this.resolverCertificado;
    this.resolverCertificado = null;
    resolver?.(cert);
  }

  // ------------------------------------------------------------------ Verificar, estado, acerca de

  protected async verificar(): Promise<void> {
    this.menu.set(null);
    const doc = this.documento();
    if (!doc) {
      this.avisar('Abra un PDF firmado para verificarlo.', true);
      return;
    }
    this.ocupado.set('Verificando firmas…');
    try {
      this.verificacion.set(await this.agente.verificar(doc.base64));
      this.dialogo.set('verificar');
    } catch (e) {
      this.avisar(mensajeError(e), true);
    } finally {
      this.ocupado.set(null);
    }
  }

  protected async verEstado(): Promise<void> {
    this.dialogo.set('estado');
    this.comprobaciones.set([
      { nombre: 'Agente de firma', detalle: 'Comprobando…', ok: null, icono: 'certificado' },
      { nombre: 'Servicio de registro', detalle: 'Comprobando…', ok: null, icono: 'configurar' },
      { nombre: 'Conectividad a Internet', detalle: 'Comprobando…', ok: null, icono: 'estado' },
    ]);
    await this.estado.comprobar();
    const agente = this.estado.infoAgente();
    const certs = await this.agente.certificados(false).catch(() => null);
    this.comprobaciones.set([
      {
        nombre: 'Agente de firma',
        detalle: agente ? `Versión ${agente.version} · ${certs?.length ?? 0} certificado(s) de firma` : 'No responde',
        ok: !!agente,
        icono: 'certificado',
      },
      {
        nombre: 'Servicio de registro',
        detalle: this.estado.apiOk() ? `Conectado con ${environment.sitioWeb}` : 'Sin conexión',
        ok: this.estado.apiOk() === true,
        icono: 'configurar',
      },
      {
        nombre: 'Conectividad a Internet',
        detalle: navigator.onLine && this.estado.apiOk() ? 'Conectado' : navigator.onLine ? 'Conectado, pero el servicio no responde' : 'Sin conexión',
        ok: navigator.onLine && this.estado.apiOk() === true,
        icono: 'estado',
      },
    ]);
  }

  /** La configuración (motivos, imágenes, parámetros, logo) se administra en la web con su cuenta. */
  protected configurar(): void {
    window.open(`${environment.sitioWeb}/configuracion`, '_blank');
  }

  protected acercaDe(): void {
    this.estado.comprobarConexion();
    this.dialogo.set('acerca');
  }

  protected cerrarDialogo(): void {
    if (this.dialogo() === 'certificado') this.elegirCertificado(null);
    else this.dialogo.set(null);
  }

  private avisar(texto: string, error = false): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, error });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), error ? 9000 : 6000);
  }

  protected acercar(): void { this.visor()?.acercar(); }
  protected alejar(): void { this.visor()?.alejar(); }
  protected ajustar(): void { this.visor()?.ajustar(); }
}
