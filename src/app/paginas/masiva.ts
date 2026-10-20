import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpcionesFirmaComponent } from '../compartido/opciones-firma';
import { SelectorCertificado } from '../compartido/selector-certificado';
import { AgenteService } from '../core/agente.service';
import { ApiService } from '../core/api.service';
import { archivoABase64, base64ABlob, descargarBlob, esPdf, mensajeError, tamanoLegible } from '../core/archivos';
import { EstadoService } from '../core/estado.service';
import { Certificado, DocumentoSubido, FirmarCarpetaResultado, FirmarResultado, OpcionesFirma } from '../core/modelos';

interface Elemento {
  archivo: File;
  estado: 'pendiente' | 'firmando' | 'firmado' | 'error';
  resultado?: FirmarResultado;
  error?: string;
}

/** Firma masiva (equivalente a ServiceFirmaMasiva / ServiceFirmaCarpeta). */
@Component({
  selector: 'app-masiva',
  imports: [SelectorCertificado, OpcionesFirmaComponent, FormsModule],
  template: `
    <header class="pagina-cabecera">
      <h1>Firma masiva</h1>
      <p>Firme varios PDF en una sola operación con la misma configuración de firma.</p>
    </header>

    <app-selector-certificado [(seleccionado)]="certificado" />

    <div class="rejilla-masiva">
      <div class="tarjeta">
        <div class="tarjeta-cabecera">
          <h2><span class="paso">2</span> Documentos</h2>
          <div class="pestanas">
            <button [class.activa]="modo() === 'archivos'" (click)="modo.set('archivos')">Desde el navegador</button>
            <button [class.activa]="modo() === 'carpeta'" (click)="modo.set('carpeta')">Carpeta local</button>
          </div>
        </div>

        @if (modo() === 'archivos') {
          <div class="acciones">
            <label class="btn btn-sec">
              Agregar archivos
              <input type="file" accept="application/pdf,.pdf" multiple hidden (change)="agregar($event)" />
            </label>
            <label class="btn btn-sec">
              Agregar carpeta
              <input type="file" webkitdirectory multiple hidden (change)="agregar($event)" />
            </label>
            @if (elementos().length) {
              <button class="btn btn-enlace" (click)="elementos.set([])" [disabled]="procesando()">Vaciar lista</button>
            }
          </div>

          @if (elementos().length === 0) {
            <p class="ayuda">Aún no hay documentos. Seleccione archivos PDF o una carpeta completa.</p>
          } @else {
            <div class="progreso">
              <div class="barra" [style.width.%]="porcentaje()"></div>
            </div>
            <p class="ayuda">{{ firmados() }} firmados · {{ errores() }} con error · {{ elementos().length }} en total</p>
            <table class="tabla">
              <thead><tr><th>Documento</th><th>Tamaño</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (e of elementos(); track $index) {
                  <tr>
                    <td>{{ e.archivo.name }}</td>
                    <td>{{ tamano(e.archivo.size) }}</td>
                    <td>
                      <span class="insignia" [class.ok]="e.estado === 'firmado'" [class.mal]="e.estado === 'error'"
                        [class.aviso]="e.estado === 'firmando'" [title]="e.error ?? ''">
                        {{ e.estado }}
                      </span>
                      @if (e.error) {<div class="ayuda error">{{ e.error }}</div>}
                    </td>
                    <td>
                      @if (e.resultado) {
                        <button class="btn btn-enlace" (click)="descargar(e)">Descargar</button>
                      } @else if (!procesando()) {
                        <button class="btn btn-enlace" (click)="quitar($index)">Quitar</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <div class="acciones">
            <button class="btn btn-primario" (click)="firmarTodos()"
              [disabled]="!certificado() || procesando() || pendientes() === 0">
              {{ procesando() ? 'Firmando ' + (firmados() + errores() + 1) + ' de ' + elementos().length + '…' : 'Firmar ' + pendientes() + ' documento(s)' }}
            </button>
            @if (firmados() > 0 && !procesando()) {
              <button class="btn btn-sec" (click)="descargarTodos()">Descargar firmados</button>
            }
          </div>
        } @else {
          <p class="ayuda">
            El agente lee y escribe directamente en las carpetas de esta PC (ideal para cientos de archivos).
          </p>
          <label class="campo"><span>Carpeta de origen</span>
            <input [(ngModel)]="carpetaOrigen" placeholder="C:\Documentos\por-firmar" /></label>
          <label class="campo"><span>Carpeta de destino (opcional)</span>
            <input [(ngModel)]="carpetaDestino" placeholder="Por defecto: subcarpeta «firmados»" /></label>
          <div class="fila-2">
            <label class="campo"><span>Sufijo del archivo</span><input [(ngModel)]="sufijo" /></label>
            <label class="check"><input type="checkbox" [(ngModel)]="recursivo" /> Incluir subcarpetas</label>
          </div>
          <button class="btn btn-primario" (click)="firmarCarpeta()"
            [disabled]="!certificado() || procesando() || !carpetaOrigen.trim()">
            {{ procesando() ? 'Firmando carpeta…' : 'Firmar carpeta' }}
          </button>

          @if (resultadoCarpeta(); as rc) {
            <div class="alerta" [class.alerta-ok]="rc.errores === 0" [class.alerta-error]="rc.errores > 0">
              {{ rc.firmados }} de {{ rc.total }} documentos firmados{{ rc.errores ? ' · ' + rc.errores + ' con error' : '' }}.
            </div>
            <table class="tabla">
              <thead><tr><th>Origen</th><th>Resultado</th></tr></thead>
              <tbody>
                @for (r of rc.resultados; track r.origen) {
                  <tr>
                    <td class="mono">{{ r.origen }}</td>
                    <td>
                      @if (r.ok) {<span class="mono">{{ r.destino }}</span>} @else {<span class="ayuda error">{{ r.error }}</span>}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
        @if (error()) {
          <div class="alerta alerta-error">{{ error() }}</div>
        }
      </div>

      <div class="tarjeta">
        <h2><span class="paso">3</span> Datos de la firma</h2>
        <app-opciones-firma [(opciones)]="opciones" [modoMasivo]="true" />
      </div>
    </div>
  `,
})
export class MasivaPagina {
  private readonly agente = inject(AgenteService);
  private readonly api = inject(ApiService);
  private readonly estado = inject(EstadoService);

  protected readonly certificado = signal<Certificado | null>(null);
  protected readonly modo = signal<'archivos' | 'carpeta'>('archivos');
  protected readonly elementos = signal<Elemento[]>([]);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultadoCarpeta = signal<FirmarCarpetaResultado | null>(null);
  protected readonly opciones = signal<OpcionesFirma>({
    ...this.estado.opcionesPorDefecto(),
    posicion: 'superior-derecha',
    pagina: 1,
  });

  protected carpetaOrigen = '';
  protected carpetaDestino = '';
  protected sufijo = this.estado.parametros()['sufijo_firmado'] ?? '[FIRMADO]';
  protected recursivo = false;

  protected readonly firmados = computed(() => this.elementos().filter((e) => e.estado === 'firmado').length);
  protected readonly errores = computed(() => this.elementos().filter((e) => e.estado === 'error').length);
  protected readonly pendientes = computed(() => this.elementos().filter((e) => e.estado !== 'firmado').length);
  protected readonly porcentaje = computed(() =>
    this.elementos().length ? ((this.firmados() + this.errores()) / this.elementos().length) * 100 : 0,
  );
  protected readonly tamano = tamanoLegible;

  protected agregar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const nuevos = [...(entrada.files ?? [])].filter(esPdf).map((archivo) => ({ archivo, estado: 'pendiente' as const }));
    this.elementos.update((lista) => [...lista, ...nuevos]);
    entrada.value = '';
  }

  protected quitar(indice: number): void {
    this.elementos.update((lista) => lista.filter((_, i) => i !== indice));
  }

  private actualizar(elemento: Elemento, cambios: Partial<Elemento>): void {
    Object.assign(elemento, cambios);
    this.elementos.update((lista) => [...lista]);
  }

  protected async firmarTodos(): Promise<void> {
    const cert = this.certificado();
    if (!cert) return;
    this.procesando.set(true);
    this.error.set(null);
    const op = { ...(await this.estado.opcionesParaFirmar(this.opciones())), x: 0, y: 0 };
    const pendientes = this.elementos().filter((e) => e.estado !== 'firmado');

    let loteId: number | undefined;
    if (this.estado.apiOk()) {
      const nombre = `Firma masiva ${new Date().toLocaleString('es-PE')}`;
      loteId = await this.api.crearLote(nombre, pendientes.length).then((l) => l.id, () => undefined);
    }

    for (const e of pendientes) {
      this.actualizar(e, { estado: 'firmando', error: undefined });
      let registro: DocumentoSubido | null = null;
      try {
        if (loteId) registro = await this.api.subirDocumento(e.archivo, loteId).catch(() => null);
        const r = await this.agente.firmar(cert.thumbprint, await archivoABase64(e.archivo), e.archivo.name, op);
        if (registro) {
          await this.api
            .registrarFirma(registro, base64ABlob(r.pdfBase64), r, op.motivo, op.ubicacion, this.estado.infoAgente()?.equipo)
            .catch(() => undefined);
        }
        this.actualizar(e, { estado: 'firmado', resultado: r });
      } catch (err) {
        const mensaje = mensajeError(err);
        this.actualizar(e, { estado: 'error', error: mensaje });
        if (registro) this.api.registrarError(registro, mensaje).catch(() => undefined);
        // Si se canceló el PIN o se desconectó el token, no tiene sentido seguir.
        if (/clave privada|PIN|cancel/i.test(mensaje)) {
          this.error.set('Proceso detenido: ' + mensaje);
          break;
        }
      }
    }
    this.procesando.set(false);
  }

  protected descargar(e: Elemento): void {
    if (e.resultado) descargarBlob(base64ABlob(e.resultado.pdfBase64), e.resultado.nombreArchivo);
  }

  protected async descargarTodos(): Promise<void> {
    for (const e of this.elementos().filter((x) => x.resultado)) {
      this.descargar(e);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  protected async firmarCarpeta(): Promise<void> {
    const cert = this.certificado();
    if (!cert) return;
    this.procesando.set(true);
    this.error.set(null);
    this.resultadoCarpeta.set(null);
    try {
      this.resultadoCarpeta.set(
        await this.agente.firmarCarpeta({
          thumbprint: cert.thumbprint,
          carpetaOrigen: this.carpetaOrigen.trim(),
          carpetaDestino: this.carpetaDestino.trim() || undefined,
          sufijo: this.sufijo,
          recursivo: this.recursivo,
          opciones: await this.estado.opcionesParaFirmar(this.opciones()),
        }),
      );
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.procesando.set(false);
    }
  }
}
