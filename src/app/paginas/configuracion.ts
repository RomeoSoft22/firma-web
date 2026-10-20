import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgenteService } from '../core/agente.service';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/archivos';
import { ConfigService } from '../core/config.service';
import { EstadoService } from '../core/estado.service';
import { EstadoAgente, Motivo, Parametros } from '../core/modelos';

@Component({
  selector: 'app-configuracion',
  imports: [FormsModule],
  template: `
    <header class="pagina-cabecera">
      <h1>Configuración</h1>
      <p>Conexiones de este navegador y parámetros generales de firma.</p>
    </header>

    <div class="rejilla-2">
      <div class="tarjeta">
        <h2>Conexiones</h2>
        <label class="campo"><span>URL del agente local</span><input [(ngModel)]="agenteUrl" /></label>
        <label class="campo"><span>URL del servicio de registro</span><input [(ngModel)]="apiUrl" /></label>
        <div class="acciones">
          <button class="btn btn-sec" (click)="probarConexiones()" [disabled]="probando()">
            {{ probando() ? 'Probando…' : 'Probar conexión' }}
          </button>
          <button class="btn btn-primario" (click)="guardarConexiones()">Guardar</button>
          <button class="btn btn-enlace" (click)="restablecer()">Valores por defecto</button>
        </div>
        @if (prueba(); as pr) {
          <ul class="resultado-prueba">
            <li [class.ok]="pr.agente.ok" [class.mal]="!pr.agente.ok">
              <span class="punto"></span> Agente local: {{ pr.agente.texto }}
            </li>
            <li [class.ok]="pr.api.ok" [class.mal]="!pr.api.ok">
              <span class="punto"></span> Servicio de registro: {{ pr.api.texto }}
            </li>
          </ul>
        } @else {
          <ul class="estado-lista">
            <li>Agente: <strong>{{ estado.agenteOk() ? 'conectado' : 'sin conexión' }}</strong>
              @if (estado.infoAgente(); as a) { — v{{ a.version }} en {{ a.equipo }} }</li>
            <li>Servicio de registro: <strong>{{ estado.apiOk() ? 'conectado' : 'sin conexión' }}</strong></li>
          </ul>
        }
      </div>

      <div class="tarjeta">
        <h2>Parámetros de firma</h2>
        @if (!estado.apiOk()) {
          <div class="alerta">Se requiere conexión con el servicio de registro para guardar los parámetros.</div>
        }
        <label class="campo"><span>Lugar de firma</span><input [(ngModel)]="p['ubicacion']" /></label>
        <label class="campo">
          <span>Motivo por defecto</span>
          <select [(ngModel)]="p['motivo_defecto']">
            @for (m of motivos(); track m.id) {
              @if (m.activo) {<option [value]="m.descripcion">{{ m.descripcion }}</option>}
            }
          </select>
        </label>
        <label class="campo"><span>URL del TSA (sello de tiempo)</span><input [(ngModel)]="p['tsa_url']" /></label>
        <label class="campo"><span>Sufijo de archivos firmados</span><input [(ngModel)]="p['sufijo_firmado']" /></label>
        <div class="fila-2">
          <label class="campo"><span>Ancho del sello por defecto (pt)</span>
            <input type="number" min="60" max="600" [(ngModel)]="p['firma_ancho']" /></label>
          <label class="campo"><span>Alto del sello por defecto (pt)</span>
            <input type="number" min="30" max="300" [(ngModel)]="p['firma_alto']" /></label>
        </div>
        <p class="ayuda">Este tamaño solo se usa para los motivos que no tienen ancho y alto propios.</p>
        <label class="check"><input type="checkbox" [ngModel]="p['firma_visible'] === '1'" (ngModelChange)="p['firma_visible'] = $event ? '1' : '0'" /> Firma visible por defecto</label>
        <label class="check"><input type="checkbox" [ngModel]="p['usar_sello_tiempo'] === '1'" (ngModelChange)="p['usar_sello_tiempo'] = $event ? '1' : '0'" /> Sello de tiempo por defecto</label>
        <label class="check"><input type="checkbox" [ngModel]="p['incluir_revocacion'] === '1'" (ngModelChange)="p['incluir_revocacion'] = $event ? '1' : '0'" /> Incluir OCSP/CRL por defecto</label>
        <button class="btn btn-primario" [disabled]="!estado.apiOk()" (click)="guardarParametros()">Guardar parámetros</button>
      </div>
    </div>

    <div class="tarjeta">
      <h2>Motivos de firma</h2>
      <p class="ayuda">
        Cada motivo define la imagen (rúbrica, sello o logo, PNG/JPG hasta 1 MB) y el tamaño del sello de la firma
        visible; quien firma no puede cambiarlos. Si el ancho y el alto quedan vacíos se usan los de Parámetros de firma.
        Al eliminar un motivo se conserva en el registro (borrado lógico) y siempre debe quedar al menos uno activo.
      </p>
      <div class="filtros">
        <input placeholder="Nuevo motivo" [(ngModel)]="nuevoMotivo" (keyup.enter)="agregarMotivo()" />
        <button class="btn btn-sec" [disabled]="!estado.apiOk() || !nuevoMotivo.trim()" (click)="agregarMotivo()">Agregar</button>
      </div>
      <table class="tabla">
        <thead><tr><th>Descripción</th><th>Imagen del sello</th><th>Diseño del sello</th><th>Ancho (pt)</th><th>Alto (pt)</th><th>Activo</th><th></th></tr></thead>
        <tbody>
          @for (m of motivos(); track m.id) {
            <tr>
              <td><input class="en-linea" [(ngModel)]="m.descripcion" (change)="guardarMotivo(m)" /></td>
              <td>
                <div class="imagen-motivo">
                  @if (m.tiene_imagen) {
                    <img [src]="api.urlImagenMotivo(m.id) + '?v=' + version()" [alt]="'Imagen de ' + m.descripcion" />
                  } @else {
                    <span class="ayuda">Sin imagen</span>
                  }
                  <label class="btn btn-enlace">
                    {{ m.tiene_imagen ? 'Cambiar' : 'Cargar' }}
                    <input type="file" accept="image/png,image/jpeg" hidden (change)="subirImagen(m, $event)" />
                  </label>
                  @if (m.tiene_imagen) {
                    <button class="btn btn-enlace peligro" (click)="quitarImagen(m)">Quitar</button>
                  }
                </div>
              </td>
              <td>
                <select class="en-linea" [(ngModel)]="m.disposicion" (change)="guardarMotivo(m)">
                  <option value="horizontal">Imagen a la izquierda</option>
                  <option value="vertical">Imagen arriba</option>
                </select>
              </td>
              <td>
                <input class="en-linea numero" type="number" min="60" max="600" [(ngModel)]="m.ancho"
                  [placeholder]="p['firma_ancho']" (change)="guardarMotivo(m)" />
              </td>
              <td>
                <input class="en-linea numero" type="number" min="30" max="300" [(ngModel)]="m.alto"
                  [placeholder]="p['firma_alto']" (change)="guardarMotivo(m)" />
              </td>
              <td><input type="checkbox" [(ngModel)]="m.activo" (change)="guardarMotivo(m)" /></td>
              <td>
                <button class="btn btn-enlace peligro" (click)="eliminarMotivo(m)" [disabled]="esUltimoActivo(m)"
                  [title]="esUltimoActivo(m) ? 'Debe existir al menos un motivo activo' : ''">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="ayuda centro">Sin motivos registrados.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (mensaje()) {
      <div class="aviso-flotante" [class.error]="mensajeError()">{{ mensaje() }}</div>
    }
  `,
})
export class ConfiguracionPagina implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly agente = inject(AgenteService);
  private readonly config = inject(ConfigService);
  protected readonly probando = signal(false);
  protected readonly prueba = signal<{
    agente: { ok: boolean; texto: string };
    api: { ok: boolean; texto: string };
  } | null>(null);
  /** Evita que el navegador muestre una imagen de motivo anterior tras reemplazarla. */
  protected readonly version = signal(Date.now());
  protected readonly estado = inject(EstadoService);

  protected agenteUrl = this.config.agenteUrl();
  protected apiUrl = this.config.apiUrl();
  protected p: Parametros = { ...this.estado.parametros() };
  protected readonly motivos = signal<Motivo[]>([]);
  protected nuevoMotivo = '';
  protected readonly mensaje = signal<string | null>(null);
  protected readonly mensajeError = signal(false);

  async ngOnInit(): Promise<void> {
    await this.estado.comprobar();
    this.p = { ...this.estado.parametros() };
    await this.cargarMotivos();
  }

  private avisar(texto: string, error = false): void {
    this.mensaje.set(texto);
    this.mensajeError.set(error);
    setTimeout(() => this.mensaje.set(null), 3500);
  }

  /** Prueba las URL escritas (aunque aún no se hayan guardado) y mide el tiempo de respuesta. */
  async probarConexiones(): Promise<void> {
    this.probando.set(true);
    const medir = async (prueba: () => Promise<unknown>, detalle: (r: unknown) => string) => {
      const inicio = performance.now();
      try {
        const r = await prueba();
        return { ok: true, texto: `conexión correcta${detalle(r)} (${Math.round(performance.now() - inicio)} ms)` };
      } catch (e) {
        const error = e as { status?: number };
        return {
          ok: false,
          texto: error?.status === 403 ? 'responde, pero rechaza este sitio (origen no autorizado)' : 'sin respuesta en esa dirección',
        };
      }
    };
    const [agente, api] = await Promise.all([
      medir(
        () => this.agente.estado(this.agenteUrl.trim().replace(/\/+$/, '')),
        (r) => ` — v${(r as EstadoAgente).version} en ${(r as EstadoAgente).equipo}`,
      ),
      medir(() => this.api.estado(this.apiUrl.trim().replace(/\/+$/, '')), () => ''),
    ]);
    this.prueba.set({ agente, api });
    this.probando.set(false);
  }

  async guardarConexiones(): Promise<void> {
    this.prueba.set(null);
    this.config.guardar({ agenteUrl: this.agenteUrl, apiUrl: this.apiUrl });
    await this.estado.comprobar();
    this.p = { ...this.estado.parametros() };
    await this.cargarMotivos();
    this.avisar('Conexiones guardadas.');
  }

  restablecer(): void {
    this.config.restablecer();
    this.agenteUrl = this.config.agenteUrl();
    this.apiUrl = this.config.apiUrl();
    this.guardarConexiones();
  }

  async guardarParametros(): Promise<void> {
    try {
      // Los inputs numéricos entregan números; la API guarda todos los parámetros como texto.
      const datos = Object.fromEntries(Object.entries(this.p).map(([k, v]) => [k, v == null ? '' : String(v)]));
      this.p = await this.api.guardarParametros(datos);
      await this.estado.cargarCatalogos();
      this.avisar('Parámetros guardados.');
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  private async cargarMotivos(): Promise<void> {
    if (!this.estado.apiOk()) return;
    try {
      this.motivos.set(await this.api.motivos());
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  async agregarMotivo(): Promise<void> {
    const descripcion = this.nuevoMotivo.trim();
    if (!descripcion) return;
    try {
      await this.api.guardarMotivo({ descripcion, activo: true, orden: this.motivos().length });
      this.nuevoMotivo = '';
      await this.cargarMotivos();
      await this.estado.cargarCatalogos();
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  /** El último motivo activo no se puede eliminar (el sistema nunca queda sin motivos). */
  protected esUltimoActivo(m: Motivo): boolean {
    return m.activo && this.motivos().filter((x) => x.activo).length <= 1;
  }

  async guardarMotivo(m: Motivo): Promise<void> {
    try {
      // Un campo de tamaño vacío significa "usar el de Parámetros de firma".
      const datos = { ...m, ancho: m.ancho || null, alto: m.alto || null };
      await this.api.guardarMotivo(datos);
      await this.estado.cargarCatalogos();
    } catch (e) {
      this.avisar(mensajeError(e), true);
      await this.cargarMotivos(); // revierte en pantalla el cambio rechazado
    }
  }

  async subirImagen(m: Motivo, evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const imagen = entrada.files?.[0];
    entrada.value = '';
    if (!imagen) return;
    if (!['image/png', 'image/jpeg'].includes(imagen.type) || imagen.size > 1024 * 1024) {
      this.avisar('La imagen debe ser PNG o JPG de hasta 1 MB.', true);
      return;
    }
    try {
      await this.api.subirImagenMotivo(m.id, imagen);
      this.version.set(Date.now());
      await this.cargarMotivos();
      await this.estado.cargarCatalogos();
      this.avisar('Imagen del motivo actualizada.');
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  async quitarImagen(m: Motivo): Promise<void> {
    try {
      await this.api.eliminarImagenMotivo(m.id);
      await this.cargarMotivos();
      await this.estado.cargarCatalogos();
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }

  async eliminarMotivo(m: Motivo): Promise<void> {
    if (this.esUltimoActivo(m)) {
      this.avisar('Debe existir al menos un motivo activo.', true);
      return;
    }
    if (!confirm(`¿Eliminar el motivo «${m.descripcion}»? Dejará de estar disponible para firmar.`)) return;
    try {
      await this.api.eliminarMotivo(m.id);
      await this.cargarMotivos();
      await this.estado.cargarCatalogos();
      this.avisar('Motivo eliminado.');
    } catch (e) {
      this.avisar(mensajeError(e), true);
    }
  }
}
