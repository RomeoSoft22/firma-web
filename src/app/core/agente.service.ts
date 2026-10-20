import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Certificado,
  EstadoAgente,
  FirmarCarpetaResultado,
  FirmarResultado,
  OpcionesFirma,
  VerificacionResultado,
} from './modelos';

/**
 * Cliente del agente local (127.0.0.1): es el único componente que accede al almacén de
 * certificados de Windows / token y realiza la operación con la clave privada.
 */
@Injectable({ providedIn: 'root' })
export class AgenteService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private url(ruta: string): string {
    return `${this.config.agenteUrl()}/api/${ruta}`;
  }

  /** Estado del agente; con `base` prueba otra dirección sin guardarla. */
  estado(base?: string): Promise<EstadoAgente> {
    const url = base ? `${base}/api/estado` : this.url('estado');
    return firstValueFrom(this.http.get<EstadoAgente>(url).pipe(timeout(3000)));
  }

  certificados(todos = false): Promise<Certificado[]> {
    return firstValueFrom(this.http.get<Certificado[]>(this.url('certificados'), { params: { todos } }));
  }

  firmar(thumbprint: string, pdfBase64: string, nombreArchivo: string, opciones: OpcionesFirma): Promise<FirmarResultado> {
    return firstValueFrom(
      this.http.post<FirmarResultado>(this.url('firmar'), { thumbprint, pdfBase64, nombreArchivo, opciones }),
    );
  }

  firmarCarpeta(datos: {
    thumbprint: string;
    carpetaOrigen: string;
    carpetaDestino?: string;
    sufijo: string;
    recursivo: boolean;
    opciones: OpcionesFirma;
  }): Promise<FirmarCarpetaResultado> {
    return firstValueFrom(this.http.post<FirmarCarpetaResultado>(this.url('firmar-carpeta'), datos));
  }

  verificar(pdfBase64: string): Promise<VerificacionResultado> {
    return firstValueFrom(this.http.post<VerificacionResultado>(this.url('verificar'), { pdfBase64 }));
  }
}
