import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

/** Back-office : sans session, redirige vers `/login` en mémorisant la page demandée. */
export const authGuard: CanMatchFn = (_route, segments) => {
  if (inject(AuthSession).isAuthenticated()) {
    return true;
  }
  const returnUrl = '/' + segments.map((segment) => segment.path).join('/');
  return inject(Router).createUrlTree(['/login'], {
    queryParams: returnUrl === '/' ? {} : { returnUrl },
  });
};

/** Page de connexion : inutile si une session est déjà ouverte. */
export const guestGuard: CanMatchFn = () =>
  !inject(AuthSession).isAuthenticated() || inject(Router).createUrlTree(['/']);
