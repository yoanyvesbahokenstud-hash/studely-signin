import { AppError } from '@shared/domain/app-error';

/** Les ports ne lèvent que des `AppError` ; ce garde-fou couvre les erreurs inattendues. */
export function toAppError(error: unknown): AppError {
  return AppError.isAppError(error) ? error : new AppError(0, 'UNKNOWN', String(error));
}
