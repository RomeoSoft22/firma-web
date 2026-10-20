import { HttpErrorResponse } from '@angular/common/http';

export function archivoABase64(archivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = lector.result as string;
      resolve(resultado.substring(resultado.indexOf(',') + 1));
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}

export function archivoADataUrl(archivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}

export function base64ABlob(base64: string, tipo = 'application/pdf'): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function sha256Hex(archivo: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function esPdf(archivo: File): boolean {
  return archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Mensaje para el usuario a partir de un error del agente o del servicio de registro.
 * Nunca muestra códigos, nombres de excepción ni detalles internos del servidor.
 */
export function mensajeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'No hay conexión con el servicio. Verifique que esté iniciado.';
    if (e.status >= 500) return 'Ocurrió un error inesperado. Intente nuevamente o comuníquese con el administrador.';
    const cuerpo = e.error as { mensaje?: string; message?: string; errors?: Record<string, string[]> } | null;
    if (cuerpo?.mensaje) return cuerpo.mensaje;
    if (cuerpo?.errors) return Object.values(cuerpo.errors).flat().join(' ');
    // Los mensajes 4xx de la API son textos para el usuario (clave incorrecta, intentos restantes, bloqueo…).
    if (cuerpo?.message) return cuerpo.message;
    if (e.status === 429) return 'Demasiadas solicitudes. Espere un momento e intente nuevamente.';
    if (e.status === 404) return 'El recurso solicitado no existe.';
    if (e.status === 403) return 'Operación no autorizada.';
    return 'No se pudo completar la operación.';
  }
  console.error(e);
  return 'No se pudo completar la operación.';
}
