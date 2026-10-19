import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'inicio',
    title: 'Início | Brasil Decide 2026',
    loadComponent: () => import('./features/home/home.page').then((module) => module.HomePage),
  },
  {
    path: 'graficos',
    title: 'Gráficos | Brasil Decide 2026',
    loadComponent: () => import('./features/charts/charts.page').then((module) => module.ChartsPage),
  },
  {
    path: 'alertas',
    title: 'Alertas | Brasil Decide 2026',
    loadComponent: () => import('./features/alerts/alerts.page').then((module) => module.AlertsPage),
  },
  {
    path: 'ajuda',
    title: 'Ajuda | Brasil Decide 2026',
    loadComponent: () => import('./features/help/help.page').then((module) => module.HelpPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
