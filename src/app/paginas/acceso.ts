import { Component, OnInit, inject, input, signal } from '@angular/core';
import { AccesoService } from '../core/acceso.service';
import { mensajeError } from '../core/archivos';

/**
 * Historial y Configuración se abren con la cuenta de Juarez Campos (identidad.juarezcampos.net).
 * Esta pantalla redirige sola al login de identidad; el botón queda por si la redirección falla.
 */
@Component({
  selector: 'app-acceso',
  template: `
    <div class="acceso">
      <div class="tarjeta">
        <div class="candado">🔒</div>
        <h1>Acceso de administración</h1>
        <p class="ayuda">Historial y Configuración se abren con tu cuenta de Juarez Campos.</p>
        @if (error()) {
          <div class="alerta alerta-error">{{ error() }}</div>
        }
        <button class="btn btn-primario btn-bloque" type="button" (click)="ingresar()" [disabled]="redirigiendo()">
          {{ redirigiendo() ? 'Abriendo el inicio de sesión…' : 'Ingresar con mi cuenta' }}
        </button>
      </div>
    </div>
  `,
})
export class AccesoPagina implements OnInit {
  private readonly acceso = inject(AccesoService);

  /** Ruta a la que volver tras ingresar (?volver=/historial). */
  readonly volver = input<string>('/historial');

  protected readonly redirigiendo = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.ingresar();
  }

  async ingresar(): Promise<void> {
    this.redirigiendo.set(true);
    this.error.set(null);
    try {
      const destino = this.volver()?.startsWith('/') && !this.volver().startsWith('/acceso') ? this.volver() : '/historial';
      await this.acceso.iniciar(destino);
    } catch (e) {
      this.error.set(mensajeError(e));
      this.redirigiendo.set(false);
    }
  }
}
