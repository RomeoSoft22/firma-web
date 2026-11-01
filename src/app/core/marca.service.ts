import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { EstadoService } from './estado.service';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

const CLAVE_TEMA = 'firma.tema';
const esPreferencia = (v: unknown): v is PreferenciaTema => v === 'sistema' || v === 'claro' || v === 'oscuro';

function leerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE_TEMA);
    return esPreferencia(v) ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}

/** Variantes del logo: "claro" se usa sobre fondos claros (logo oscuro) y "oscuro" sobre fondos oscuros (logo blanco). */
export type VarianteMarca = 'simbolo-claro' | 'simbolo-oscuro' | 'logo-claro' | 'logo-oscuro';

interface MarcaServidor {
  version: number;
  personalizados: Partial<Record<VarianteMarca, boolean>>;
}

/**
 * Identidad visual: símbolo y logo horizontal de la marca en versión para fondo claro y oscuro.
 * Si en Configuración se subió un logo propio se usa ese; si no, los incluidos en /marca.
 * Sigue el tema de Windows / del navegador (claro u oscuro).
 */
@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly estado = inject(EstadoService);
  private readonly consulta = matchMedia('(prefers-color-scheme: dark)');
  private readonly sistemaOscuro = signal(this.consulta.matches);

  /** Tema elegido en Configuración (parámetro «tema»); se recuerda en el equipo para aplicarlo al abrir. */
  readonly preferencia = signal<PreferenciaTema>(leerPreferencia());
  /** true cuando se muestra el tema oscuro (elegido o porque Windows / el navegador lo usa). */
  readonly temaOscuro = computed(() => this.preferencia() === 'oscuro' || (this.preferencia() === 'sistema' && this.sistemaOscuro()));
  private readonly servidor = signal<MarcaServidor | null>(null);

  /** Símbolo adecuado para el fondo de la página según el tema. */
  readonly simboloTema = computed(() => this.url(this.temaOscuro() ? 'simbolo-oscuro' : 'simbolo-claro'));
  /** Logo horizontal adecuado para el fondo de la página según el tema. */
  readonly logoTema = computed(() => this.url(this.temaOscuro() ? 'logo-oscuro' : 'logo-claro'));

  constructor() {
    this.consulta.addEventListener('change', (e) => this.sistemaOscuro.set(e.matches));
    // El tema guardado en el servidor manda (es el mismo en la web y en la aplicación de escritorio).
    effect(() => {
      const tema = this.estado.parametros()['tema'];
      if (esPreferencia(tema)) untracked(() => this.preferencia.set(tema));
    });
    effect(() => {
      document.documentElement.dataset['theme'] = this.temaOscuro() ? 'dark' : 'light';
      try { localStorage.setItem(CLAVE_TEMA, this.preferencia()); } catch { /* sin almacenamiento */ }
    });
  }

  /** URL de una variante (personalizada en el servidor o la incluida por defecto). */
  url(variante: VarianteMarca): string {
    const s = this.servidor();
    return s?.personalizados?.[variante]
      ? `${this.config.apiUrl()}/marca/${variante}?v=${s.version}`
      : `/marca/${variante}.png`;
  }

  async cargar(): Promise<void> {
    try {
      this.servidor.set(await firstValueFrom(this.http.get<MarcaServidor>(`${this.config.apiUrl()}/marca`)));
    } catch {
      this.servidor.set(null); // se usan los logos incluidos
    }
  }

  subir(variante: VarianteMarca, archivo: File): Promise<unknown> {
    const datos = new FormData();
    datos.append('imagen', archivo, archivo.name);
    return firstValueFrom(this.http.post(`${this.config.apiUrl()}/marca/${variante}`, datos)).then(() => this.cargar());
  }

  restaurar(variante: VarianteMarca): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.config.apiUrl()}/marca/${variante}`)).then(() => this.cargar());
  }

  personalizado(variante: VarianteMarca): boolean {
    return !!this.servidor()?.personalizados?.[variante];
  }
}
