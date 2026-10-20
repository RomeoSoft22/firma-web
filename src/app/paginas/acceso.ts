import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccesoService } from '../core/acceso.service';
import { mensajeError } from '../core/archivos';

@Component({
  selector: 'app-acceso',
  imports: [FormsModule],
  template: `
    <div class="acceso">
      <form class="tarjeta" (ngSubmit)="entrar()">
        <div class="candado">🔒</div>
        <h1>Acceso de administración</h1>
        <p class="ayuda">Historial y Configuración requieren la clave de administración.</p>
        <label class="campo">
          <span>Clave</span>
          <input type="password" name="clave" [(ngModel)]="clave" autocomplete="current-password"
            [disabled]="enviando()" autofocus required />
        </label>
        @if (error()) {
          <div class="alerta alerta-error">{{ error() }}</div>
        }
        <button class="btn btn-primario btn-bloque" type="submit" [disabled]="enviando() || !clave">
          {{ enviando() ? 'Verificando…' : 'Ingresar' }}
        </button>
        <p class="ayuda centro">Por seguridad, varios intentos fallidos bloquean el acceso temporalmente.</p>
      </form>
    </div>
  `,
})
export class AccesoPagina {
  private readonly acceso = inject(AccesoService);
  private readonly router = inject(Router);

  /** Ruta a la que volver tras ingresar (?volver=/historial). */
  readonly volver = input<string>('/historial');

  protected clave = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  async entrar(): Promise<void> {
    if (!this.clave) return;
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.acceso.entrar(this.clave);
      this.clave = '';
      const destino = this.volver()?.startsWith('/') && !this.volver().startsWith('/acceso') ? this.volver() : '/historial';
      await this.router.navigateByUrl(destino);
    } catch (e) {
      this.error.set(mensajeError(e));
      this.clave = '';
    } finally {
      this.enviando.set(false);
    }
  }
}
