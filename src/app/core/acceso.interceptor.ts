import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AccesoService } from './acceso.service';
import { ConfigService } from './config.service';

/**
 * Añade la sesión de administración solo a las llamadas a la API propia (nunca al agente local)
 * y, si la API responde 401 en una ruta protegida, descarta la sesión y pide la clave de nuevo.
 */
export const accesoInterceptor: HttpInterceptorFn = (req, next) => {
  const acceso = inject(AccesoService);
  const config = inject(ConfigService);
  const router = inject(Router);

  const esApi = req.url.startsWith(config.apiUrl());
  const esLogin = req.url.endsWith('/acceso');
  const token = acceso.token();
  const pedido = esApi && token && !esLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(pedido).pipe(
    catchError((error: unknown) => {
      if (esApi && !esLogin && error instanceof HttpErrorResponse && error.status === 401) {
        acceso.limpiar();
        const actual = router.url;
        if (!actual.startsWith('/acceso')) {
          router.navigate(['/acceso'], { queryParams: { volver: actual } });
        }
      }
      return throwError(() => error);
    }),
  );
};
