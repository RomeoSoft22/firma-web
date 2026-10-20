import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { OpcionesFirmaComponent } from '../compartido/opciones-firma';
import { ResultadoVerificacion } from '../compartido/resultado-verificacion';
import { SelectorCertificado } from '../compartido/selector-certificado';
import { VisorPdf } from '../compartido/visor-pdf';
import { AgenteService } from '../core/agente.service';
import { ApiService } from '../core/api.service';
import { archivoABase64, base64ABlob, descargarBlob, esPdf, mensajeError, tamanoLegible } from '../core/archivos';
import { EstadoService } from '../core/estado.service';
import { Certificado, DocumentoSubido, FirmarResultado, OpcionesFirma, VerificacionResultado } from '../core/modelos';

@Component({
  selector: 'app-firmar',
  imports: [SelectorCertificado, OpcionesFirmaComponent, VisorPdf, DatePipe, ResultadoVerificacion],
  template: `
    <header class="pagina-cabecera">
      <h1>Firmar documento</h1>
      <p>Firma PAdES con el certificado de su token, DNIe o almacén de Windows. El documento no sale de su red.</p>
    </header>

    @if (resultado(); as r) {
      <!-- Documento ya firmado: vista del PDF con el sello y acciones -->
      <div class="rejilla-firma">
        <div class="tarjeta visor">
          <app-visor-pdf [archivo]="archivoFirmado()!" [opciones]="opciones()" [soloLectura]="true"
            [paginaInicial]="paginaFirma()" />
        </div>
        <div class="tarjeta exito">
          <h2>Documento firmado</h2>
          <div class="acciones acciones-columna">
            <button class="btn btn-primario" (click)="descargar()">Descargar PDF firmado</button>
            <button class="btn btn-sec" (click)="verificarResultado()" [disabled]="verificando()">
              {{ verificando() ? 'Verificando…' : 'Verificar firma' }}
            </button>
            <button class="btn btn-sec" (click)="limpiar()">Firmar otro documento</button>
          </div>
          <dl class="datos datos-compactos">
            <dt>Archivo</dt><dd>{{ r.nombreArchivo }}</dd>
            <dt>Firmante</dt><dd>{{ r.firmante }}</dd>
            @if (r.documentoFirmante) {<dt>Documento</dt><dd>{{ r.documentoFirmante }}</dd>}
            <dt>Motivo</dt><dd>{{ opciones().motivo }}</dd>
            <dt>Fecha</dt><dd>{{ r.fechaFirma | date: 'dd/MM/yyyy HH:mm:ss' }}</dd>
            <dt>Sello de tiempo</dt><dd>{{ r.selloTiempo ? 'Sí' : 'No' }}</dd>
            <dt>Registro</dt>
            <dd>{{ registrado() ? 'Guardado en el historial (#' + registrado() + ')' : 'No registrado en el historial' }}</dd>
          </dl>
          @if (error()) {
            <div class="alerta alerta-error">{{ error() }}</div>
          }
          @if (verificacion(); as v) {
            <app-resultado-verificacion [resultado]="v" />
          }
        </div>
      </div>
    } @else {
      <app-selector-certificado [(seleccionado)]="certificado" />

      <div class="tarjeta">
        <div class="tarjeta-cabecera">
          <h2><span class="paso">2</span> Documento PDF</h2>
          @if (archivo()) {
            <button class="btn btn-enlace" (click)="limpiar()">Cambiar documento</button>
          }
        </div>
        @if (!archivo()) {
          <label class="zona-carga" [class.encima]="encima()"
            (dragover)="$event.preventDefault(); encima.set(true)"
            (dragleave)="encima.set(false)"
            (drop)="soltar($event)">
            <input type="file" accept="application/pdf,.pdf" (change)="elegir($event)" hidden />
            <strong>Arrastre aquí su PDF</strong>
            <span>o haga clic para seleccionarlo</span>
          </label>
          @if (error()) {
            <div class="alerta alerta-error">{{ error() }}</div>
          }
        } @else {
          <div class="archivo-elegido">
            <span class="icono-pdf">PDF</span>
            <div>
              <div class="nombre">{{ archivo()!.name }}</div>
              <div class="ayuda">{{ tamano(archivo()!.size) }}</div>
            </div>
          </div>
        }
      </div>

      @if (archivo()) {
        <div class="rejilla-firma">
          <div class="tarjeta visor">
            <app-visor-pdf [archivo]="archivo()!" [opciones]="opciones()" />
          </div>
          <div class="tarjeta">
            <h2><span class="paso">3</span> Datos de la firma</h2>
            <app-opciones-firma [(opciones)]="opciones" />
            @if (error()) {
              <div class="alerta alerta-error">{{ error() }}</div>
            }
            <button class="btn btn-primario btn-bloque" [disabled]="!certificado() || firmando()" (click)="firmar()">
              {{ firmando() ? 'Firmando… (ingrese su PIN si se solicita)' : 'Firmar documento' }}
            </button>
            @if (!certificado()) {
              <p class="ayuda centro">Seleccione un certificado para continuar.</p>
            }
          </div>
        </div>
      }
    }
  `,
})
export class FirmarPagina {
  private readonly agente = inject(AgenteService);
  private readonly api = inject(ApiService);
  private readonly estado = inject(EstadoService);

  protected readonly certificado = signal<Certificado | null>(null);
  protected readonly archivo = signal<File | null>(null);
  protected readonly archivoFirmado = signal<File | null>(null);
  protected readonly paginaFirma = signal(1);
  protected readonly opciones = signal<OpcionesFirma>(this.estado.opcionesPorDefecto());
  protected readonly firmando = signal(false);
  protected readonly verificando = signal(false);
  protected readonly encima = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<FirmarResultado | null>(null);
  protected readonly registrado = signal<number | null>(null);
  protected readonly verificacion = signal<VerificacionResultado | null>(null);
  protected readonly tamano = tamanoLegible;

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.usar(entrada.files?.[0]);
    entrada.value = '';
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.encima.set(false);
    this.usar(evento.dataTransfer?.files?.[0]);
  }

  private usar(archivo?: File): void {
    if (!archivo) return;
    if (!esPdf(archivo)) {
      this.error.set('Solo se admiten archivos PDF.');
      return;
    }
    this.error.set(null);
    this.opciones.set(this.estado.opcionesPorDefecto());
    this.archivo.set(archivo);
  }

  protected limpiar(): void {
    this.archivo.set(null);
    this.archivoFirmado.set(null);
    this.resultado.set(null);
    this.verificacion.set(null);
    this.registrado.set(null);
    this.error.set(null);
  }

  protected async firmar(): Promise<void> {
    const cert = this.certificado();
    const archivo = this.archivo();
    if (!cert || !archivo) return;

    this.firmando.set(true);
    this.error.set(null);
    this.registrado.set(null);
    let registro: DocumentoSubido | null = null;

    try {
      // Lugar, TSA e imagen del sello se toman de la configuración y del motivo elegido.
      const op = await this.estado.opcionesParaFirmar(this.opciones());

      // 1. Registrar el original en la API (opcional: si no está disponible se firma igual).
      //    La API devuelve un token de carga de un solo uso para adjuntar luego el firmado.
      if (this.estado.apiOk()) {
        registro = await this.api.subirDocumento(archivo).catch(() => null);
      }

      // 2. Firmar en el agente local (aquí Windows pide el PIN del token si corresponde).
      const r = await this.agente.firmar(cert.thumbprint, await archivoABase64(archivo), archivo.name, op);
      const pdfFirmado = base64ABlob(r.pdfBase64);

      // 3. Guardar la versión firmada en el historial.
      if (registro) {
        const doc = registro;
        await this.api
          .registrarFirma(doc, pdfFirmado, r, op.motivo, op.ubicacion, this.estado.infoAgente()?.equipo)
          .then(() => this.registrado.set(doc.id), () => this.registrado.set(null));
      }

      // 4. Mostrar el documento firmado en la página donde quedó la firma.
      this.paginaFirma.set(op.visible ? op.pagina : 1);
      this.archivoFirmado.set(new File([pdfFirmado], r.nombreArchivo, { type: 'application/pdf' }));
      this.verificacion.set(null);
      this.resultado.set(r);
      this.archivo.set(null);
    } catch (e) {
      const mensaje = mensajeError(e);
      this.error.set(mensaje);
      if (registro) this.api.registrarError(registro, mensaje).catch(() => undefined);
    } finally {
      this.firmando.set(false);
    }
  }

  protected descargar(): void {
    const r = this.resultado();
    if (r) descargarBlob(base64ABlob(r.pdfBase64), r.nombreArchivo);
  }

  protected async verificarResultado(): Promise<void> {
    const r = this.resultado();
    if (!r) return;
    this.verificando.set(true);
    this.error.set(null);
    try {
      this.verificacion.set(await this.agente.verificar(r.pdfBase64));
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.verificando.set(false);
    }
  }
}
