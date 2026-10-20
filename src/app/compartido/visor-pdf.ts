import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { OpcionesFirma } from '../core/modelos';

interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Previsualiza el PDF con pdf.js y permite ubicar el recuadro de la firma visible
 * (equivalente a PosicionFirmaService). Las coordenadas se guardan en puntos PDF
 * con origen en la esquina inferior izquierda, tal como las espera el agente.
 */
@Component({
  selector: 'app-visor-pdf',
  template: `
    <div class="visor-barra">
      <button type="button" class="btn btn-sec" (click)="irA(pagina() - 1)" [disabled]="pagina() <= 1">‹</button>
      <span>Página {{ pagina() }} de {{ total() }}</span>
      <button type="button" class="btn btn-sec" (click)="irA(pagina() + 1)" [disabled]="pagina() >= total()">›</button>
      <button type="button" class="btn btn-enlace" (click)="irA(total())">Ir a la última</button>
      @if (soloLectura()) {
        <span class="ayuda">Vista del documento firmado.</span>
      } @else if (opciones().visible) {
        <span class="ayuda">Arrastre el recuadro para ubicar la firma.</span>
      } @else {
        <span class="ayuda">Firma invisible: no se mostrará un sello en el documento.</span>
      }
    </div>
    <div class="visor-lienzo" #contenedor>
      <div class="visor-pagina" [style.width.px]="anchoPx()" [style.height.px]="altoPx()">
        <canvas #lienzo></canvas>
        @if (!soloLectura() && opciones().visible && total() > 0) {
          <div
            class="recuadro-firma"
            [style.left.px]="cajaPx().left"
            [style.top.px]="cajaPx().top"
            [style.width.px]="cajaPx().width"
            [style.height.px]="cajaPx().height"
            (pointerdown)="iniciar($event)"
          >
            <span>Firma digital</span>
          </div>
        }
      </div>
      @if (cargando()) {
        <div class="visor-cargando">Cargando documento…</div>
      }
    </div>
  `,
})
export class VisorPdf implements OnDestroy {
  readonly archivo = input.required<File>();
  readonly opciones = input.required<OpcionesFirma>();
  /** Solo muestra el documento (p. ej. el PDF ya firmado), sin recuadro de posición. */
  readonly soloLectura = input(false);
  /** Página a mostrar al abrir (0 = última). */
  readonly paginaInicial = input(1);

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly pagina = signal(1);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  private readonly escala = signal(1);
  private readonly tamanoPts = signal({ ancho: 595, alto: 842 });
  private readonly caja = signal<Caja>({ x: 360, y: 40, ancho: 200, alto: 60 });

  protected readonly anchoPx = computed(() => this.tamanoPts().ancho * this.escala());
  protected readonly altoPx = computed(() => this.tamanoPts().alto * this.escala());
  protected readonly cajaPx = computed(() => {
    const c = this.caja();
    const s = this.escala();
    return {
      left: c.x * s,
      top: (this.tamanoPts().alto - c.y - c.alto) * s,
      width: c.ancho * s,
      height: c.alto * s,
    };
  });

  private doc: PDFDocumentProxy | null = null;
  private tareaRender: { cancel(): void } | null = null;
  private arrastre: { x0: number; y0: number; caja: Caja } | null = null;

  constructor() {
    effect(() => {
      const archivo = this.archivo();
      untracked(() => this.abrir(archivo));
    });
    // El tamaño del recuadro es el del motivo (no editable): si cambia el motivo, se ajusta
    // conservando el borde superior para que el recuadro no "salte" en pantalla.
    effect(() => {
      const { ancho, alto } = this.opciones();
      untracked(() =>
        this.caja.update((c) =>
          c.ancho === ancho && c.alto === alto ? c : this.limitar({ x: c.x, y: c.y + c.alto - alto, ancho, alto }),
        ),
      );
    });
    // Sincroniza la posición del recuadro con las opciones que se enviarán al agente.
    effect(() => {
      const c = this.caja();
      if (untracked(() => this.soloLectura())) return;
      const op = untracked(() => this.opciones());
      op.x = Math.round(c.x);
      op.y = Math.round(c.y);
      op.pagina = this.pagina();
      op.posicion = 'manual';
    });
  }

  ngOnDestroy(): void {
    this.soltar();
    this.doc?.destroy();
  }

  private async abrir(archivo: File): Promise<void> {
    this.cargando.set(true);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      await this.doc?.destroy();
      this.doc = await pdfjs.getDocument({
        data: new Uint8Array(await archivo.arrayBuffer()),
        // Fuentes estándar (Helvetica, etc.) para dibujar fielmente el texto de los sellos de firma.
        standardFontDataUrl: '/pdfjs/standard_fonts/',
        // Compatible con la Content-Security-Policy del sitio (sin eval / new Function).
        isEvalSupported: false,
      }).promise;
      this.total.set(this.doc.numPages);
      await this.irA(1, true);
      const inicial = this.paginaInicial();
      const destino = inicial <= 0 || inicial > this.doc.numPages ? this.doc.numPages : inicial;
      if (destino !== 1) await this.irA(destino);
    } finally {
      this.cargando.set(false);
    }
  }

  async irA(numero: number, nuevoDocumento = false): Promise<void> {
    if (!this.doc || numero < 1 || numero > this.doc.numPages) return;
    this.pagina.set(numero);

    const pagina = await this.doc.getPage(numero);
    const base = pagina.getViewport({ scale: 1 });
    const disponible = Math.max(this.contenedor().nativeElement.clientWidth - 24, 300);
    const escala = Math.min(disponible / base.width, 1.6);
    this.escala.set(escala);
    this.tamanoPts.set({ ancho: base.width, alto: base.height });

    const op = this.opciones();
    if (nuevoDocumento) {
      // Posición inicial: esquina superior derecha, visible sin desplazarse.
      this.caja.set(
        this.limitar({ x: base.width - op.ancho - 30, y: base.height - op.alto - 30, ancho: op.ancho, alto: op.alto }),
      );
    } else {
      this.caja.update((c) => this.limitar(c));
    }

    const dpr = window.devicePixelRatio || 1;
    const vista = pagina.getViewport({ scale: escala * dpr });
    const canvas = this.lienzo().nativeElement;
    canvas.width = vista.width;
    canvas.height = vista.height;
    canvas.style.width = `${base.width * escala}px`;
    canvas.style.height = `${base.height * escala}px`;

    this.tareaRender?.cancel();
    const tarea = pagina.render({ canvasContext: canvas.getContext('2d')!, viewport: vista });
    this.tareaRender = tarea;
    try {
      await tarea.promise;
    } catch {
      /* render cancelado por cambio de página */
    }
  }

  /** Solo se puede mover el recuadro; su tamaño lo fija la configuración del motivo. */
  protected iniciar(evento: PointerEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastre = { x0: evento.clientX, y0: evento.clientY, caja: { ...this.caja() } };
    window.addEventListener('pointermove', this.mover);
    window.addEventListener('pointerup', this.soltar);
  }

  private readonly mover = (evento: PointerEvent): void => {
    if (!this.arrastre) return;
    const s = this.escala();
    const dx = (evento.clientX - this.arrastre.x0) / s;
    const dy = (evento.clientY - this.arrastre.y0) / s;
    const c = this.arrastre.caja;
    // En pantalla Y crece hacia abajo; en PDF hacia arriba.
    this.caja.set(this.limitar({ ...c, x: c.x + dx, y: c.y - dy }));
  };

  private readonly soltar = (): void => {
    this.arrastre = null;
    window.removeEventListener('pointermove', this.mover);
    window.removeEventListener('pointerup', this.soltar);
  };

  private limitar(c: Caja): Caja {
    const { ancho, alto } = this.tamanoPts();
    const w = Math.min(c.ancho, ancho);
    const h = Math.min(c.alto, alto);
    return {
      ancho: w,
      alto: h,
      x: Math.min(Math.max(0, c.x), ancho - w),
      y: Math.min(Math.max(0, c.y), alto - h),
    };
  }
}
