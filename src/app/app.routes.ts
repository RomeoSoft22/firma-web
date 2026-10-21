import { Routes } from '@angular/router';
import { accesoGuard } from './core/acceso.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'firmar' },
  { path: 'firmar', title: 'Firmar documento', loadComponent: () => import('./paginas/firmar').then((m) => m.FirmarPagina) },
  { path: 'masiva', title: 'Firma masiva', loadComponent: () => import('./paginas/masiva').then((m) => m.MasivaPagina) },
  { path: 'verificar', title: 'Verificar firma', loadComponent: () => import('./paginas/verificar').then((m) => m.VerificarPagina) },
  { path: 'acceso', title: 'Acceso de administración', loadComponent: () => import('./paginas/acceso').then((m) => m.AccesoPagina) },
  { path: 'callback', title: 'Validando sesión', loadComponent: () => import('./paginas/callback').then((m) => m.CallbackPagina) },
  // Protegidas con la cuenta de identidad.juarezcampos.net (rol ADMIN en el sistema FIRMA).
  {
    path: 'historial',
    title: 'Historial',
    canActivate: [accesoGuard],
    loadComponent: () => import('./paginas/historial').then((m) => m.HistorialPagina),
  },
  {
    path: 'configuracion',
    title: 'Configuración',
    canActivate: [accesoGuard],
    loadComponent: () => import('./paginas/configuracion').then((m) => m.ConfiguracionPagina),
  },
  { path: '**', redirectTo: 'firmar' },
];
