import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ResultadoVerificacion } from '../compartido/resultado-verificacion';
import { AgenteService } from '../core/agente.service';
import { ApiService } from '../core/api.service';
import { archivoABase64, esPdf, mensajeError, sha256Hex } from '../core/archivos';
import { EstadoService } from '../core/estado.service';
import { Documento, VerificacionResultado } from '../core/modelos';

/** Validación de documentos firmados (equivalente a ServiceValidationSignedDoc). */
@Component({
  selector: 'app-verificar',
  imports: [ResultadoVerificacion, DatePipe],
  template: `
    <header class="pagina-cabecera">
      <h1>Verificar firma</h1>
      <p>Compruebe la integridad, el firmante y la vigencia de las firmas de un PDF.</p>
    </header>

    <div class="tarjeta">
      <label class="zona-carga" [class.encima]="encima()"
        (dragover)="$event.preventDefault(); encima.set(true)"
        (dragleave)="encima.set(false)"
        (drop)="soltar($event)">
        <input type="file" accept="application/pdf,.pdf" hidden (change)="elegir($event)" />
        <strong>{{ nombre() ?? 'Arrastre aquí el PDF firmado' }}</strong>
        <span>{{ verificando() ? 'Verificando…' : 'o haga clic para seleccionarlo' }}</span>
      </label>

      @if (error()) {
        <div class="alerta alerta-error">{{ error() }}</div>
      }
      @if (!estado.agenteOk()) {
        <div class="alerta">La verificación criptográfica la realiza el agente local; inícielo para continuar.</div>
      }
    </div>

    @if (registro(); as d) {
      <div class="tarjeta">
        <h2>Registrado en este sistema</h2>
        <p>
          Documento #{{ d.id }} «{{ d.nombre_original }}», firmado por {{ d.firmante }}
          el {{ d.fecha_firma | date: 'dd/MM/yyyy HH:mm' }}. El archivo es idéntico al emitido (mismo SHA-256).
        </p>
      </div>
    }

    @if (resultado(); as r) {
      <div class="tarjeta">
        <h2>Resultado</h2>
        <app-resultado-verificacion [resultado]="r" />
        <p class="ayuda mono">SHA-256: {{ hash() }}</p>
      </div>
    }
  `,
})
export class VerificarPagina {
  private readonly agente = inject(AgenteService);
  private readonly api = inject(ApiService);
  protected readonly estado = inject(EstadoService);

  protected readonly nombre = signal<string | null>(null);
  protected readonly encima = signal(false);
  protected readonly verificando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<VerificacionResultado | null>(null);
  protected readonly registro = signal<Documento | null>(null);
  protected readonly hash = signal('');

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.verificar(entrada.files?.[0]);
    entrada.value = '';
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.encima.set(false);
    this.verificar(evento.dataTransfer?.files?.[0]);
  }

  private async verificar(archivo?: File): Promise<void> {
    if (!archivo) return;
    if (!esPdf(archivo)) {
      this.error.set('Solo se admiten archivos PDF.');
      return;
    }
    this.nombre.set(archivo.name);
    this.error.set(null);
    this.resultado.set(null);
    this.registro.set(null);
    this.verificando.set(true);
    try {
      this.hash.set(await sha256Hex(archivo));
      if (this.estado.apiOk()) {
        this.api.buscarPorHash(this.hash()).then((d) => this.registro.set(d), () => undefined);
      }
      this.resultado.set(await this.agente.verificar(await archivoABase64(archivo)));
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.verificando.set(false);
    }
  }
}
