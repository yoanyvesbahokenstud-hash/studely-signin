import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError } from '@shared/domain/app-error';

/**
 * Traduit les erreurs HTTP en `AppError`, pour que les couches application et présentation
 * ne manipulent jamais `HttpErrorResponse`.
 *
 * Le backend renvoie `{ status, message: <code SigningError>, data?: <message lisible> }`.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toAppError(error))));

export function toAppError(error: unknown): AppError {
  if (!(error instanceof HttpErrorResponse)) {
    return new AppError(0, 'UNKNOWN', error instanceof Error ? error.message : 'Unknown error');
  }
  if (error.status === 0) {
    return new AppError(0, 'NETWORK', 'Network unreachable');
  }
  const body = error.error as { message?: unknown; data?: unknown } | null;
  const code = typeof body?.message === 'string' ? body.message : `HTTP_${error.status}`;
  const message = typeof body?.data === 'string' ? body.data : error.message;
  return new AppError(error.status, code, message);
}
