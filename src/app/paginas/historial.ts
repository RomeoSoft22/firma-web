import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/archivos';
import { EstadoService } from '../core/estado.service';
import { Documento, Estadisticas, Paginado } from '../core/modelos';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, FormsModule],
  template: `
    <header class="pagina-cabecera">
      <h1>Historial</h1>
      <p>Documentos firmados y registrados en el sistema.</p>
    </header>

    @if (estado.apiOk() === false) {
      <div class="alerta alerta-error">
        El servicio de registro no está disponible en este momento. Intente nuevamente o comuníquese con el administrador.
      </div>
    }

    @if (stats(); as s) {
      <div class="metricas">
        <div class="metrica"><span>{{ s.total }}</span>Documentos</div>
        <div class="metrica"><span>{{ s.firmados }}</span>Firmados</div>
        <div class="metrica"><span>{{ s.hoy }}</span>Firmados hoy</div>
        <div class="metrica"><span>{{ s.errores }}</span>Con error</div>
      </div>
    }

    <div class="tarjeta">
      <div class="filtros">
        <input placeholder="Buscar por nombre, firmante o DNI" [(ngModel)]="q" (keyup.enter)="cargar(1)" />
        <select [(ngModel)]="estadoFiltro" (change)="cargar(1)">
          <option value="">Todos los estados</option>
          <option value="firmado">Firmados</option>
          <option value="pendiente">Pendientes</option>
          <option value="error">Con error</option>
        </select>
        <button class="btn btn-sec" (click)="cargar(1)">Buscar</button>
      </div>

      @if (error()) {
        <div class="alerta alerta-error">{{ error() }}</div>
      }

      <table class="tabla">
        <thead>
          <tr><th>#</th><th>Documento</th><th>Firmante</th><th>Motivo</th><th>Fecha</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          @for (d of pagina()?.data ?? []; track d.id) {
            <tr>
              <td>{{ d.id }}</td>
              <td>
                {{ d.nombre_original }}
                @if (d.lote) {<div class="ayuda">{{ d.lote.nombre }}</div>}
              </td>
              <td>{{ d.firmante ?? '—' }} @if (d.documento_firmante) {<div class="ayuda">{{ d.documento_firmante }}</div>}</td>
              <td>{{ d.motivo ?? '—' }}</td>
              <td>{{ (d.fecha_firma ?? d.created_at) | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="insignia" [class.ok]="d.estado === 'firmado'" [class.mal]="d.estado === 'error'"
                  [title]="d.mensaje_error ?? ''">{{ d.estado }}</span>
              </td>
              <td class="acciones-fila">
                <a class="btn btn-enlace" [href]="api.urlDescarga(d.id, 'original')">Original</a>
                @if (d.estado === 'firmado') {
                  <a class="btn btn-enlace" [href]="api.urlDescarga(d.id, 'firmado')">Firmado</a>
                }
                <button class="btn btn-enlace peligro" (click)="eliminar(d)">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="centro ayuda">Sin registros.</td></tr>
          }
        </tbody>
      </table>

      @if (pagina(); as p) {
        @if (p.last_page > 1) {
          <div class="paginacion">
            <button class="btn btn-sec" [disabled]="p.current_page <= 1" (click)="cargar(p.current_page - 1)">Anterior</button>
            <span>Página {{ p.current_page }} de {{ p.last_page }} · {{ p.total }} registros</span>
            <button class="btn btn-sec" [disabled]="p.current_page >= p.last_page" (click)="cargar(p.current_page + 1)">Siguiente</button>
          </div>
        }
      }
    </div>
  `,
})
export class HistorialPagina implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly estado = inject(EstadoService);

  protected readonly pagina = signal<Paginado<Documento> | null>(null);
  protected readonly stats = signal<Estadisticas | null>(null);
  protected readonly error = signal<string | null>(null);
  protected q = '';
  protected estadoFiltro = '';

  ngOnInit(): void {
    this.cargar(1);
  }

  async cargar(numero: number): Promise<void> {
    this.error.set(null);
    try {
      const [pagina, stats] = await Promise.all([
        this.api.documentos({ page: numero, q: this.q.trim(), estado: this.estadoFiltro }),
        this.api.estadisticas(),
      ]);
      this.pagina.set(pagina);
      this.stats.set(stats);
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminar(d: Documento): Promise<void> {
    if (!confirm(`¿Eliminar el registro #${d.id} «${d.nombre_original}» y sus archivos?`)) return;
    try {
      await this.api.eliminarDocumento(d.id);
      await this.cargar(this.pagina()?.current_page ?? 1);
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
