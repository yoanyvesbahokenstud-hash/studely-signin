import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { AppError } from '@shared/domain/app-error';
import { AuthSession } from './auth-session';

/**
 * Ajoute le jeton du gestionnaire aux appels back-office, et ferme la session si le backend
 * le refuse (401) : jeton expiré ou révoqué. Placé avant `apiErrorInterceptor`, il reçoit des `AppError`.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const { apiBaseUrl } = inject(APP_CONFIG);
  if (!req.url.startsWith(`${apiBaseUrl}/bo/`)) {
    return next(req);
  }
  const session = inject(AuthSession);
  return from(session.accessToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
    catchError((error: unknown) => {
      // La coquille back-office redirige vers /login dès que la session se ferme.
      if (AppError.isAppError(error) && error.status === 401) {
        void session.signOut();
      }
      return throwError(() => error);
    }),
  );
};
