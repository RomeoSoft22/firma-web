import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ConfigService } from './config.service';
import { Documento, Estadisticas, FirmarResultado, Lote, Motivo, Paginado, Parametros } from './modelos';

/** Cliente de la API Laravel: historial, lotes, motivos y parámetros. Nunca recibe claves privadas. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  url(ruta: string): string {
    return `${this.config.apiUrl()}/${ruta}`;
  }

  /** Estado del servicio; con `base` prueba otra dirección sin guardarla. */
  estado(base?: string): Promise<unknown> {
    const url = base ? `${base}/estado` : this.url('estado');
    return firstValueFrom(this.http.get(url).pipe(timeout(3000)));
  }

  // ---- Documentos ----

  documentos(filtros: { page?: number; estado?: string; q?: string; lote_id?: number }): Promise<Paginado<Documento>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return firstValueFrom(this.http.get<Paginado<Documento>>(this.url('documentos'), { params }));
  }

  estadisticas(): Promise<Estadisticas> {
    return firstValueFrom(this.http.get<Estadisticas>(this.url('documentos/estadisticas')));
  }

  subirDocumento(archivo: File, loteId?: number): Promise<Documento> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    if (loteId) datos.append('lote_id', String(loteId));
    return firstValueFrom(this.http.post<Documento>(this.url('documentos'), datos));
  }

  registrarFirma(id: number, pdf: Blob, r: FirmarResultado, motivo: string, ubicacion: string, equipo?: string): Promise<Documento> {
    const datos = new FormData();
    datos.append('archivo', pdf, r.nombreArchivo);
    datos.append('firmante', r.firmante);
    if (r.documentoFirmante) datos.append('documento_firmante', r.documentoFirmante);
    datos.append('emisor', r.emisor);
    datos.append('numero_serie', r.numeroSerie);
    datos.append('motivo', motivo);
    datos.append('ubicacion', ubicacion);
    datos.append('sello_tiempo', r.selloTiempo ? '1' : '0');
    datos.append('fecha_firma', r.fechaFirma);
    if (equipo) datos.append('equipo', equipo);
    return firstValueFrom(this.http.post<Documento>(this.url(`documentos/${id}/firmado`), datos));
  }

  registrarError(id: number, mensaje: string): Promise<Documento> {
    return firstValueFrom(this.http.post<Documento>(this.url(`documentos/${id}/error`), { mensaje }));
  }

  buscarPorHash(hash: string): Promise<Documento> {
    return firstValueFrom(this.http.get<Documento>(this.url(`documentos/hash/${hash}`)));
  }

  eliminarDocumento(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(this.url(`documentos/${id}`)));
  }

  urlDescarga(id: number, tipo: 'original' | 'firmado'): string {
    return this.url(`documentos/${id}/descargar/${tipo}`);
  }

  // ---- Lotes ----

  crearLote(nombre: string, total: number): Promise<Lote> {
    return firstValueFrom(this.http.post<Lote>(this.url('lotes'), { nombre, total }));
  }

  // ---- Motivos ----

  motivos(soloActivos = false): Promise<Motivo[]> {
    return firstValueFrom(this.http.get<Motivo[]>(this.url('motivos'), { params: soloActivos ? { activos: 1 } : {} }));
  }

  guardarMotivo(m: Partial<Motivo>): Promise<Motivo> {
    return firstValueFrom(
      m.id
        ? this.http.put<Motivo>(this.url(`motivos/${m.id}`), m)
        : this.http.post<Motivo>(this.url('motivos'), m),
    );
  }

  eliminarMotivo(id: number): Promise<unknown> {
    return firstValueFrom(this.http.delete(this.url(`motivos/${id}`)));
  }

  urlImagenMotivo(id: number): string {
    return this.url(`motivos/${id}/imagen`);
  }

  imagenMotivo(id: number): Promise<Blob> {
    return firstValueFrom(this.http.get(this.urlImagenMotivo(id), { responseType: 'blob' }));
  }

  subirImagenMotivo(id: number, imagen: File): Promise<Motivo> {
    const datos = new FormData();
    datos.append('imagen', imagen, imagen.name);
    return firstValueFrom(this.http.post<Motivo>(this.url(`motivos/${id}/imagen`), datos));
  }

  eliminarImagenMotivo(id: number): Promise<Motivo> {
    return firstValueFrom(this.http.delete<Motivo>(this.url(`motivos/${id}/imagen`)));
  }

  // ---- Parámetros ----

  parametros(): Promise<Parametros> {
    return firstValueFrom(this.http.get<Parametros>(this.url('parametros')));
  }

  guardarParametros(p: Parametros): Promise<Parametros> {
    return firstValueFrom(this.http.put<Parametros>(this.url('parametros'), p));
  }
}
