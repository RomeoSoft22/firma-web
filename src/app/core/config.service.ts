import { Injectable, signal } from '@angular/core';

const CLAVE = 'firma-digital.config';

interface ConfigLocal {
  agenteUrl: string;
  apiUrl: string;
}

const DEFECTO: ConfigLocal = {
  agenteUrl: 'http://127.0.0.1:9876',
  apiUrl: 'http://127.0.0.1:8000/api',
};

/** Direcciones del agente local y de la API, guardadas en el navegador de cada usuario. */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  readonly agenteUrl = signal(DEFECTO.agenteUrl);
  readonly apiUrl = signal(DEFECTO.apiUrl);

  constructor() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<ConfigLocal>;
      if (guardado.agenteUrl) this.agenteUrl.set(guardado.agenteUrl);
      if (guardado.apiUrl) this.apiUrl.set(guardado.apiUrl);
    } catch {
      /* sin almacenamiento: usar valores por defecto */
    }
  }

  guardar(cfg: ConfigLocal): void {
    this.agenteUrl.set(cfg.agenteUrl.replace(/\/+$/, ''));
    this.apiUrl.set(cfg.apiUrl.replace(/\/+$/, ''));
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ agenteUrl: this.agenteUrl(), apiUrl: this.apiUrl() }));
    } catch {
      /* ignorar */
    }
  }

  restablecer(): void {
    this.guardar(DEFECTO);
  }
}
