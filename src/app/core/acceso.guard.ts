import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AccesoService } from './acceso.service';

/**
 * Historial y Configuración solo con sesión de identidad vigente. Sin sesión, lleva a la
 * pantalla de acceso, que redirige al login de identidad.juarezcampos.net. En la aplicación de
 * escritorio vuelve a la ventana principal, donde «Configurar» pide la clave de administración.
 */
export const accesoGuard: CanActivateFn = async (_ruta, estado) => {
  const acceso = inject(AccesoService);
  const router = inject(Router);
  if (environment.escritorio) return acceso.autenticado() || router.createUrlTree(['/escritorio']);
  if (await acceso.asegurar()) return true;
  return router.createUrlTree(['/acceso'], { queryParams: { volver: estado.url } });
};
