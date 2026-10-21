import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';

interface Sesion {
  access_token: string;
  expires_in: number;
  usuario: UsuarioIdentidad;
}

export interface UsuarioIdentidad {
  nombre: string | null;
  correo: string | null;
  roles: string[];
}

const CLAVE_LOGIN = 'firma-digital.login';

/**
 * Sesión de administración (Historial y Configuración) con identidad.juarezcampos.net:
 * OAuth 2.0 Authorization Code + PKCE. El access token (JWT) vive solo en memoria; el refresh
 * token lo guarda la API en una cookie HttpOnly. Firma nunca ve la contraseña del usuario.
 */
@Injectable({ providedIn: 'root' })
export class AccesoService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private renovacion?: ReturnType<typeof setTimeout>;
  private renovando: Promise<boolean> | null = null;

  readonly token = signal<string | null>(null);
  readonly usuario = signal<UsuarioIdentidad | null>(null);
  readonly autenticado = computed(() => !!this.token());

  private url(ruta: string): string {
    return `${this.config.apiUrl()}/${ruta}`;
  }

  /** Lleva al login de identidad; al volver, /callback completa el ingreso y regresa a `volver`. */
  async iniciar(volver = '/historial'): Promise<void> {
    const cfg = await firstValueFrom(
      this.http.get<{ authorize_endpoint: string; client_id: string; redirect_uri: string }>(this.url('acceso/config')),
    );
    const state = aleatorio(32);
    const verifier = aleatorio(64);
    sessionStorage.setItem(CLAVE_LOGIN, JSON.stringify({ state, verifier, volver }));

    const params = new URLSearchParams({
      client_id: cfg.client_id,
      redirect_uri: cfg.redirect_uri,
      response_type: 'code',
      scope: '',
      state,
      code_challenge: await sha256Base64Url(verifier),
      code_challenge_method: 'S256',
    });
    location.assign(`${cfg.authorize_endpoint}?${params}`);
  }

  /** Paso final: valida el state (anti-CSRF) y canjea el código. Devuelve la ruta a la que volver. */
  async completar(code: string, state: string): Promise<string> {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_LOGIN) ?? 'null');
    sessionStorage.removeItem(CLAVE_LOGIN);
    if (!guardado || guardado.state !== state) {
      throw new Error('La respuesta de identidad no corresponde a este navegador. Vuelve a ingresar.');
    }
    const sesion = await firstValueFrom(
      this.http.post<Sesion>(this.url('acceso/canjear'), { code, code_verifier: guardado.verifier }),
    );
    this.empezar(sesion);
    const volver = String(guardado.volver || '/historial');
    return volver.startsWith('/') && !volver.startsWith('//') ? volver : '/historial';
  }

  /** Pide un access token nuevo con la cookie de refresh. Varias llamadas a la vez comparten una sola petición. */
  renovar(): Promise<boolean> {
    this.renovando ??= firstValueFrom(this.http.post<Sesion>(this.url('acceso/renovar'), {}))
      .then(sesion => {
        this.empezar(sesion);
        return true;
      })
      .catch(() => {
        this.limpiar();
        return false;
      })
      .finally(() => (this.renovando = null));
    return this.renovando;
  }

  /** Hay sesión, o se pudo recuperar con la cookie de refresh (por ejemplo, tras recargar la página). */
  asegurar(): Promise<boolean> {
    return this.token() ? Promise.resolve(true) : this.renovar();
  }

  /** Cierra la sesión aquí y en identidad (y con ello en todos los sistemas). */
  async salir(): Promise<void> {
    try {
      const r = await firstValueFrom(this.http.post<{ logout_url: string }>(this.url('acceso/salir'), {}));
      this.limpiar();
      location.assign(r.logout_url);
    } catch {
      this.limpiar();
    }
  }

  limpiar(): void {
    clearTimeout(this.renovacion);
    this.token.set(null);
    this.usuario.set(null);
  }

  private empezar(sesion: Sesion): void {
    this.token.set(sesion.access_token);
    this.usuario.set(sesion.usuario);
    clearTimeout(this.renovacion);
    // Renueva un minuto antes de que venza el JWT (15 minutos por defecto).
    this.renovacion = setTimeout(() => this.renovar(), Math.max(30, sesion.expires_in - 60) * 1000);
  }
}

function aleatorio(bytes: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Base64Url(texto: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
