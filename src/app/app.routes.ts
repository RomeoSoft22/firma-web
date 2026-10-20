import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'firmar' },
  { path: 'firmar', title: 'Firmar documento', loadComponent: () => import('./paginas/firmar').then((m) => m.FirmarPagina) },
  { path: 'masiva', title: 'Firma masiva', loadComponent: () => import('./paginas/masiva').then((m) => m.MasivaPagina) },
  { path: 'verificar', title: 'Verificar firma', loadComponent: () => import('./paginas/verificar').then((m) => m.VerificarPagina) },
  { path: 'historial', title: 'Historial', loadComponent: () => import('./paginas/historial').then((m) => m.HistorialPagina) },
  {
    path: 'configuracion',
    title: 'Configuración',
    loadComponent: () => import('./paginas/configuracion').then((m) => m.ConfiguracionPagina),
  },
  { path: '**', redirectTo: 'firmar' },
];
