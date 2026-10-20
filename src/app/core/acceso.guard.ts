import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccesoService } from './acceso.service';

/** Historial y Configuración solo con sesión de administración vigente. */
export const accesoGuard: CanActivateFn = async (_ruta, estado) => {
  const acceso = inject(AccesoService);
  const router = inject(Router);
  if (await acceso.verificar()) return true;
  return router.createUrlTree(['/acceso'], { queryParams: { volver: estado.url } });
};
