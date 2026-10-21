import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccesoService } from '../core/acceso.service';
import { mensajeError } from '../core/archivos';

/** Destino de la redirección de identidad: canjea el código y vuelve a la página que se quería abrir. */
@Component({
  selector: 'app-callback',
  imports: [RouterLink],
  template: `
    <div class="acceso">
      <div class="tarjeta">
        @if (error()) {
          <h1>No se pudo iniciar sesión</h1>
          <div class="alerta alerta-error">{{ error() }}</div>
          <a class="btn btn-primario btn-bloque" routerLink="/acceso">Volver a ingresar</a>
        } @else {
          <p class="ayuda centro">Validando tu sesión…</p>
        }
      </div>
    </div>
  `,
})
export class CallbackPagina implements OnInit {
  private readonly acceso = inject(AccesoService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const params = this.ruta.snapshot.queryParamMap;
    const code = params.get('code');
    const state = params.get('state');

    if (params.get('error')) {
      this.error.set('Identidad no permitió el ingreso. Vuelve a intentarlo.');
      return;
    }
    if (!code || !state) {
      this.error.set('El enlace de ingreso está incompleto. Vuelve a intentarlo.');
      return;
    }
    try {
      const volver = await this.acceso.completar(code, state);
      await this.router.navigateByUrl(volver, { replaceUrl: true });
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
