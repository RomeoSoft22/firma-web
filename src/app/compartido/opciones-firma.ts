import { Component, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoService } from '../core/estado.service';
import { OpcionesFirma } from '../core/modelos';

/**
 * Datos de la firma (equivalente a MotivoBean). El lugar, la imagen del sello y el TSA vienen
 * de la Configuración: el usuario solo elige el motivo y, si corresponde, la apariencia.
 */
@Component({
  selector: 'app-opciones-firma',
  imports: [FormsModule],
  template: `
    @let op = opciones();
    <div class="formulario">
      <label class="campo">
        <span>Motivo</span>
        <select [ngModel]="op.motivo" (ngModelChange)="cambiarMotivo($event)">
          @for (m of estado.motivos(); track m.descripcion) {
            <option [value]="m.descripcion">{{ m.descripcion }}</option>
          }
        </select>
      </label>

      <label class="check"><input type="checkbox" [(ngModel)]="op.visible" /> Firma visible en el documento</label>
      @if (op.visible) {
        <p class="ayuda">
          Tamaño del sello: {{ op.ancho }} × {{ op.alto }} pt
          ({{ estado.motivoPorDescripcion(op.motivo)?.ancho ? 'definido en el motivo' : 'tamaño por defecto' }}).
        </p>
      }

      @if (op.visible && modoMasivo()) {
        <div class="fila-2">
          <label class="campo">
            <span>Página</span>
            <select [(ngModel)]="op.pagina">
              <option [ngValue]="1">Primera</option>
              <option [ngValue]="0">Última</option>
            </select>
          </label>
          <label class="campo">
            <span>Posición</span>
            <select [(ngModel)]="op.posicion">
              <option value="superior-derecha">Superior derecha</option>
              <option value="superior-izquierda">Superior izquierda</option>
              <option value="inferior-derecha">Inferior derecha</option>
              <option value="inferior-centro">Inferior centro</option>
              <option value="inferior-izquierda">Inferior izquierda</option>
            </select>
          </label>
        </div>
      }

      <details class="avanzado">
        <summary>Opciones avanzadas</summary>
        <label class="check">
          <input type="checkbox" [(ngModel)]="op.usarSelloTiempo" /> Agregar sello de tiempo (TSA)
        </label>
        <label class="check">
          <input type="checkbox" [(ngModel)]="op.incluirRevocacion" /> Incluir estado de revocación (OCSP / CRL)
        </label>
        <label class="check">
          <input type="checkbox" [(ngModel)]="op.certificar" /> Firma de certificación (bloquea cambios posteriores)
        </label>
      </details>
    </div>
  `,
})
export class OpcionesFirmaComponent {
  protected readonly estado = inject(EstadoService);
  readonly opciones = model.required<OpcionesFirma>();
  readonly modoMasivo = input(false);

  protected cambiarMotivo(descripcion: string): void {
    // Cada motivo trae su propio tamaño de sello (o el de Parámetros de firma).
    this.opciones.set({ ...this.opciones(), motivo: descripcion, ...this.estado.tamanoDeMotivo(descripcion) });
  }
}
