import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';

const CLAVE = 'firma-digital.acceso';

/**
 * Sesión de administración (Historial y Configuración). El token se guarda en sessionStorage:
 * se pierde al cerrar la pestaña. La clave nunca se almacena en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class AccesoService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  readonly token = signal<string | null>(this.leer());
  readonly autenticado = computed(() => !!this.token());

  async entrar(clave: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<{ token: string; expira_en: number }>(`${this.config.apiUrl()}/acceso`, { clave }),
    );
    this.guardar(r.token);
  }

  /** Comprueba en el servidor que la sesión siga vigente. */
  async verificar(): Promise<boolean> {
    if (!this.token()) return false;
    try {
      await firstValueFrom(this.http.get(`${this.config.apiUrl()}/acceso/verificar`));
      return true;
    } catch {
      this.limpiar();
      return false;
    }
  }

  async salir(): Promise<void> {
    try {
      if (this.token()) await firstValueFrom(this.http.post(`${this.config.apiUrl()}/acceso/salir`, {}));
    } catch {
      /* la sesión igual se descarta localmente */
    }
    this.limpiar();
  }

  limpiar(): void {
    this.guardar(null);
  }

  private guardar(token: string | null): void {
    this.token.set(token);
    try {
      if (token) sessionStorage.setItem(CLAVE, token);
      else sessionStorage.removeItem(CLAVE);
    } catch {
      /* sin almacenamiento: la sesión vive solo en memoria */
    }
  }

  private leer(): string | null {
    try {
      return sessionStorage.getItem(CLAVE);
    } catch {
      return null;
    }
  }
}
