import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  // Portail public du signataire : pas de coquille back-office, pas d'authentification Cognito.
  {
    path: 'sign',
    loadChildren: () =>
      import('@features/signing-portal/signing-portal.routes').then((m) => m.SIGNING_PORTAL_ROUTES),
  },
  {
    path: 'login',
    title: 'Connexion',
    canMatch: [guestGuard],
    loadComponent: () => import('@core/auth/login/login').then((m) => m.Login),
  },
  // Back-office du gestionnaire.
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('@core/layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'requests' },
      {
        path: 'requests',
        loadChildren: () =>
          import('@features/signature-requests/signature-requests.routes').then(
            (m) => m.SIGNATURE_REQUEST_ROUTES,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
