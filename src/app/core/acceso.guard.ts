import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccesoService } from './acceso.service';

/**
 * Historial y Configuración solo con sesión de identidad vigente. Sin sesión, lleva a la
 * pantalla de acceso, que redirige al login de identidad.juarezcampos.net.
 */
export const accesoGuard: CanActivateFn = async (_ruta, estado) => {
  const acceso = inject(AccesoService);
  const router = inject(Router);
  if (await acceso.asegurar()) return true;
  return router.createUrlTree(['/acceso'], { queryParams: { volver: estado.url } });
};
