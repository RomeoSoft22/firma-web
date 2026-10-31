import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

interface Pagina {
  numero: number;
  ancho: number; // puntos PDF
  alto: number;
}

/** Posición elegida para el sello, en puntos PDF con origen en la esquina inferior izquierda. */
export interface Colocacion {
  pagina: number;
  x: number;
  y: number;
}

const ESCALA_MIN = 0.25;
const ESCALA_MAX = 4;
const PASO = 1.25;

/**
 * Visor de la aplicación de escritorio: todas las páginas una debajo de otra, con acercar, alejar y ajustar.
 * En modo colocación (firma / V° B° avanzada) un rectángulo rojo del tamaño del sello sigue al mouse y,
 * al hacer clic, emite la posición elegida.
 */
@Component({
  selector: 'app-visor-documento',
  template: `
    <div class="vd-contenedor" #contenedor [class.colocando]="!!colocacion()">
      @for (p of paginas(); track p.numero) {
        <div
          class="vd-hoja"
          [style.width.px]="p.ancho * escala()"
          [style.height.px]="p.alto * escala()"
          (mousemove)="mover($event, p)"
          (mouseleave)="cursor.set(null)"
          (click)="clic($event, p)"
        >
          <canvas [attr.data-pagina]="p.numero"></canvas>
          @if (colocacion() && cursor(); as c) {
            @if (c.pagina === p.numero) {
              <div
                class="vd-sello"
                [style.left.px]="c.x * escala()"
                [style.top.px]="(p.alto - c.y - colocacion()!.alto) * escala()"
                [style.width.px]="colocacion()!.ancho * escala()"
                [style.height.px]="colocacion()!.alto * escala()"
              ></div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class VisorDocumento implements OnDestroy {
  /** PDF a mostrar (bytes). */
  readonly pdf = input<Uint8Array | null>(null);
  /** Tamaño del sello a colocar (pt); null = modo normal. */
  readonly colocacion = input<{ ancho: number; alto: number } | null>(null);
  readonly colocado = output<Colocacion>();

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  protected readonly paginas = signal<Pagina[]>([]);
  protected readonly escala = signal(1);
  protected readonly cursor = signal<Colocacion | null>(null);
  readonly porcentaje = computed(() => Math.round(this.escala() * 100));

  private doc: PDFDocumentProxy | null = null;
  private tareas: { cancel(): void }[] = [];
  private generacion = 0;

  constructor() {
    effect(() => {
      const datos = this.pdf();
      untracked(() => this.abrir(datos));
    });
    effect(() => {
      this.escala();
      untracked(() => setTimeout(() => this.dibujar()));
    });
  }

  ngOnDestroy(): void {
    this.cancelar();
    this.doc?.destroy();
  }

  acercar(): void {
    this.escala.update((e) => Math.min(ESCALA_MAX, e * PASO));
  }

  alejar(): void {
    this.escala.update((e) => Math.max(ESCALA_MIN, e / PASO));
  }

  /** Página completa a lo alto o a lo ancho del panel (la que entre). */
  ajustar(): void {
    const p = this.paginas()[0];
    if (!p) return;
    const caja = this.contenedor().nativeElement;
    const ancho = (caja.clientWidth - 48) / p.ancho;
    const alto = (caja.clientHeight - 32) / p.alto;
    this.escala.set(Math.max(ESCALA_MIN, Math.min(ancho, alto)));
  }

  /** Ancho del panel (lectura cómoda). */
  ajustarAncho(): void {
    const p = this.paginas()[0];
    if (!p) return;
    this.escala.set(Math.min(1.6, Math.max(ESCALA_MIN, (this.contenedor().nativeElement.clientWidth - 48) / p.ancho)));
  }

  /** Lleva la vista a una página (p. ej. donde quedó la firma). */
  irA(numero: number): void {
    const hoja = this.contenedor().nativeElement.querySelectorAll('.vd-hoja')[numero - 1] as HTMLElement | undefined;
    hoja?.scrollIntoView({ block: 'start' });
  }

  protected mover(evento: MouseEvent, p: Pagina): void {
    const tam = this.colocacion();
    if (!tam) return;
    const s = this.escala();
    const r = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    // El mouse queda en el centro del sello; el sello nunca sale de la página.
    const x = Math.min(Math.max(0, (evento.clientX - r.left) / s - tam.ancho / 2), p.ancho - tam.ancho);
    const arriba = Math.min(Math.max(0, (evento.clientY - r.top) / s - tam.alto / 2), p.alto - tam.alto);
    this.cursor.set({ pagina: p.numero, x: Math.round(x), y: Math.round(p.alto - arriba - tam.alto) });
  }

  protected clic(evento: MouseEvent, p: Pagina): void {
    if (!this.colocacion()) return;
    this.mover(evento, p);
    const c = this.cursor();
    if (c) this.colocado.emit(c);
  }

  private async abrir(datos: Uint8Array | null): Promise<void> {
    this.cancelar();
    const generacion = ++this.generacion;
    await this.doc?.destroy();
    this.doc = null;
    this.paginas.set([]);
    if (!datos) return;

    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({
      data: datos.slice(),
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      isEvalSupported: false,
    }).promise;
    if (generacion !== this.generacion) {
      doc.destroy();
      return;
    }
    this.doc = doc;
    const paginas: Pagina[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const v = (await doc.getPage(n)).getViewport({ scale: 1 });
      paginas.push({ numero: n, ancho: v.width, alto: v.height });
    }
    this.paginas.set(paginas);
    // Tras crear los lienzos: ajusta al ancho y dibuja (aunque la escala no cambie).
    setTimeout(() => {
      this.ajustarAncho();
      this.dibujar();
    });
  }

  private async dibujar(): Promise<void> {
    const doc = this.doc;
    if (!doc) return;
    this.cancelar();
    const s = this.escala();
    const dpr = window.devicePixelRatio || 1;
    const lienzos = this.contenedor().nativeElement.querySelectorAll('canvas');
    for (const lienzo of Array.from(lienzos)) {
      const numero = Number(lienzo.dataset['pagina']);
      let pagina: PDFPageProxy;
      try {
        pagina = await doc.getPage(numero);
      } catch {
        return; // documento cerrado
      }
      const vista = pagina.getViewport({ scale: s * dpr });
      lienzo.width = vista.width;
      lienzo.height = vista.height;
      lienzo.style.width = `${vista.width / dpr}px`;
      lienzo.style.height = `${vista.height / dpr}px`;
      const tarea = pagina.render({ canvasContext: lienzo.getContext('2d')!, viewport: vista });
      this.tareas.push(tarea);
      tarea.promise.catch(() => undefined);
    }
  }

  private cancelar(): void {
    this.tareas.forEach((t) => t.cancel());
    this.tareas = [];
  }
}
