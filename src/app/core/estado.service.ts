import { Injectable, computed, inject, signal } from '@angular/core';
import { AgenteService } from './agente.service';
import { ApiService } from './api.service';
import { archivoADataUrl } from './archivos';
import { EstadoAgente, Motivo, OpcionesFirma, Parametros } from './modelos';

const PARAMETROS_DEFECTO: Parametros = {
  tsa_url: 'http://timestamp.digicert.com',
  usar_sello_tiempo: '0',
  incluir_revocacion: '0',
  ubicacion: 'Lima, Perú',
  motivo_defecto: 'Soy el autor del documento',
  firma_visible: '1',
  sufijo_firmado: '[FIRMADO]',
  firma_ancho: '200',
  firma_alto: '60',
};

const MOTIVOS_DEFECTO: Motivo[] = ['Soy el autor del documento', 'En señal de conformidad', 'Doy V° B°', 'Por encargo'].map(
  (descripcion, i) => ({ id: 0, descripcion, activo: true, orden: i, tiene_imagen: false, ancho: null, alto: null, disposicion: 'horizontal' }),
);

/** Estado compartido: conexión con el agente y la API, parámetros y motivos de firma. */
@Injectable({ providedIn: 'root' })
export class EstadoService {
  private readonly agente = inject(AgenteService);
  private readonly api = inject(ApiService);

  readonly agenteOk = signal<boolean | null>(null);
  readonly apiOk = signal<boolean | null>(null);
  readonly infoAgente = signal<EstadoAgente | null>(null);
  readonly parametros = signal<Parametros>(PARAMETROS_DEFECTO);
  readonly motivos = signal<Motivo[]>(MOTIVOS_DEFECTO);

  readonly listo = computed(() => this.agenteOk() === true);

  private intervalo?: ReturnType<typeof setInterval>;
  private readonly cacheImagenes = new Map<number, Promise<string | null>>();

  iniciar(): void {
    this.comprobar();
    this.intervalo ??= setInterval(() => this.comprobarConexion(), 15000);
  }

  async comprobar(): Promise<void> {
    await this.comprobarConexion();
    if (this.apiOk()) await this.cargarCatalogos();
  }

  async comprobarConexion(): Promise<void> {
    const [agente, api] = await Promise.allSettled([this.agente.estado(), this.api.estado()]);
    this.agenteOk.set(agente.status === 'fulfilled');
    this.infoAgente.set(agente.status === 'fulfilled' ? agente.value : null);
    const apiAntes = this.apiOk();
    this.apiOk.set(api.status === 'fulfilled');
    if (!apiAntes && this.apiOk()) await this.cargarCatalogos();
  }

  async cargarCatalogos(): Promise<void> {
    try {
      const [parametros, motivos] = await Promise.all([this.api.parametros(), this.api.motivos()]);
      this.parametros.set({ ...PARAMETROS_DEFECTO, ...parametros });
      if (motivos.length) this.motivos.set(motivos);
      this.cacheImagenes.clear();
    } catch {
      /* se mantienen los valores por defecto */
    }
  }

  motivoPorDescripcion(descripcion: string): Motivo | undefined {
    return this.motivos().find((m) => m.descripcion === descripcion);
  }

  /**
   * Tamaño del sello (puntos PDF): el del motivo si lo define; si no, el de Parámetros de firma.
   * El usuario no puede cambiarlo durante la firma.
   */
  tamanoDeMotivo(descripcion: string): { ancho: number; alto: number } {
    const p = this.parametros();
    const motivo = this.motivoPorDescripcion(descripcion);
    return {
      ancho: motivo?.ancho || Number(p['firma_ancho']) || 200,
      alto: motivo?.alto || Number(p['firma_alto']) || 60,
    };
  }

  /** Imagen del sello configurada para el motivo, como data URL (o null si no tiene). */
  imagenDeMotivo(motivo?: Motivo): Promise<string | null> {
    if (!motivo?.tiene_imagen || !motivo.id) return Promise.resolve(null);
    let imagen = this.cacheImagenes.get(motivo.id);
    if (!imagen) {
      imagen = this.api.imagenMotivo(motivo.id).then(archivoADataUrl, () => null);
      this.cacheImagenes.set(motivo.id, imagen);
    }
    return imagen;
  }

  /** Opciones iniciales de firma a partir de los parámetros configurados. */
  opcionesPorDefecto(): OpcionesFirma {
    const p = this.parametros();
    const motivos = this.motivos();
    const motivo = motivos.find((m) => m.descripcion === p['motivo_defecto']) ?? motivos[0];
    const tamano = this.tamanoDeMotivo(motivo?.descripcion ?? '');
    return {
      motivo: motivo?.descripcion ?? '',
      ubicacion: p['ubicacion'] ?? '',
      visible: p['firma_visible'] !== '0',
      pagina: 1,
      posicion: 'manual',
      x: 360,
      y: 40,
      ancho: tamano.ancho,
      alto: tamano.alto,
      textoPersonalizado: null,
      imagenBase64: null,
      usarSelloTiempo: p['usar_sello_tiempo'] === '1',
      tsaUrl: p['tsa_url'] ?? '',
      incluirRevocacion: p['incluir_revocacion'] === '1',
      certificar: false,
    };
  }

  /**
   * Completa las opciones con lo que viene de la configuración (lugar, TSA, tamaño)
   * y la imagen asociada al motivo elegido, justo antes de enviarlas al agente.
   */
  async opcionesParaFirmar(op: OpcionesFirma): Promise<OpcionesFirma> {
    const p = this.parametros();
    return {
      ...op,
      // El tamaño del sello siempre es el configurado (motivo o parámetros), nunca uno editado.
      ...this.tamanoDeMotivo(op.motivo),
      ubicacion: p['ubicacion'] ?? '',
      tsaUrl: p['tsa_url'] ?? '',
      textoPersonalizado: null,
      imagenBase64: await this.imagenDeMotivo(this.motivoPorDescripcion(op.motivo)),
      disposicion: this.motivoPorDescripcion(op.motivo)?.disposicion ?? 'horizontal',
    };
  }
}
