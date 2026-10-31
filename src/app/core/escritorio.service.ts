import { Injectable } from '@angular/core';
import { archivoABase64, base64ABlob, descargarBlob } from './archivos';

/** PDF abierto desde el equipo. `ruta` solo existe en la aplicación de escritorio. */
export interface ArchivoLocal {
  ruta: string | null;
  nombre: string;
  base64: string;
}

export interface Guardado {
  ruta: string | null;
  nombre: string;
}

interface PuenteWebView {
  postMessage(mensaje: unknown): void;
  addEventListener(tipo: 'message', manejador: (e: MessageEvent) => void): void;
}

interface Respuesta {
  id: number;
  ok: boolean;
  datos?: unknown;
  error?: string | null;
}

/**
 * Puente con la aplicación de escritorio (WebView2 → AgenteFirma): abrir y guardar PDF en las carpetas
 * del usuario e imprimir. En un navegador normal usa el selector de archivos y la descarga como respaldo.
 */
@Injectable({ providedIn: 'root' })
export class EscritorioService {
  private readonly puente: PuenteWebView | null =
    (window as unknown as { chrome?: { webview?: PuenteWebView } }).chrome?.webview ?? null;
  private readonly pendientes = new Map<number, { resolver: (v: unknown) => void; rechazar: (e: Error) => void }>();
  private siguiente = 1;

  /** true dentro de la aplicación de escritorio Firma Digital. */
  readonly disponible = !!this.puente;

  constructor() {
    this.puente?.addEventListener('message', (e) => {
      const r = e.data as Respuesta;
      const pendiente = this.pendientes.get(r?.id);
      if (!pendiente) return;
      this.pendientes.delete(r.id);
      if (r.ok) pendiente.resolver(r.datos);
      else pendiente.rechazar(new Error(r.error ?? 'No se pudo completar la operación.'));
    });
  }

  /** Abre un PDF del equipo. Devuelve null si el usuario cancela. */
  async abrir(): Promise<ArchivoLocal | null> {
    if (this.puente) return this.cancelable(this.llamar<ArchivoLocal>('abrir'));
    const archivo = await elegirArchivo();
    return archivo ? { ruta: null, nombre: archivo.name, base64: await archivoABase64(archivo) } : null;
  }

  /** Guarda el firmado junto al original como «nombre[F].pdf». */
  guardarFirmado(rutaOriginal: string | null, nombre: string, base64: string): Promise<Guardado | null> {
    if (this.puente) return this.cancelable(this.llamar<Guardado>('guardarFirmado', { rutaOriginal, nombre, base64 }));
    const destino = nombre.replace(/\.pdf$/i, '') + '[F].pdf';
    descargarBlob(base64ABlob(base64), destino);
    return Promise.resolve({ ruta: null, nombre: destino });
  }

  guardarComo(nombre: string, base64: string): Promise<Guardado | null> {
    if (this.puente) return this.cancelable(this.llamar<Guardado>('guardarComo', { nombre, base64 }));
    descargarBlob(base64ABlob(base64), nombre);
    return Promise.resolve({ ruta: null, nombre });
  }

  async imprimir(nombre: string, base64: string): Promise<void> {
    if (this.puente) {
      await this.llamar('imprimir', { nombre, base64 });
      return;
    }
    const url = URL.createObjectURL(base64ABlob(base64));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  mostrarEnCarpeta(ruta: string): void {
    if (this.puente) this.llamar('mostrarEnCarpeta', { ruta }).catch(() => undefined);
  }

  private llamar<T>(accion: string, datos: Record<string, unknown> = {}): Promise<T> {
    const id = this.siguiente++;
    return new Promise<T>((resolver, rechazar) => {
      this.pendientes.set(id, { resolver: resolver as (v: unknown) => void, rechazar });
      this.puente!.postMessage({ id, accion, ...datos });
    });
  }

  /** Convierte la cancelación del diálogo en null. */
  private async cancelable<T>(promesa: Promise<T>): Promise<T | null> {
    try {
      return await promesa;
    } catch (e) {
      if (e instanceof Error && e.message === 'cancelado') return null;
      throw e;
    }
  }
}

function elegirArchivo(): Promise<File | null> {
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = 'application/pdf,.pdf';
    entrada.onchange = () => resolver(entrada.files?.[0] ?? null);
    entrada.oncancel = () => resolver(null);
    entrada.click();
  });
}
