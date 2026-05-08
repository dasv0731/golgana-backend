import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'selecciones',
        loadComponent: () => import('./features/entities/selecciones.component').then((m) => m.SeleccionesComponent),
      },
      {
        path: 'selecciones/:slug/plantilla',
        loadComponent: () => import('./features/entities/plantilla.component').then((m) => m.PlantillaComponent),
      },
      {
        path: 'jugadores',
        loadComponent: () => import('./features/entities/jugadores.component').then((m) => m.JugadoresComponent),
      },
      {
        path: 'partidos',
        loadComponent: () => import('./features/entities/partidos.component').then((m) => m.PartidosComponent),
      },
      {
        path: 'edicion-mundial',
        loadComponent: () => import('./features/entities/edicion-mundial.component').then((m) => m.EdicionMundialComponent),
      },
      {
        path: 'grupos',
        loadComponent: () => import('./features/entities/grupos.component').then((m) => m.GruposComponent),
      },
      {
        path: 'temas',
        loadComponent: () => import('./features/entities/temas.component').then((m) => m.TemasComponent),
      },
      {
        path: 'noticias',
        loadComponent: () => import('./features/entities/noticias.component').then((m) => m.NoticiasComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
