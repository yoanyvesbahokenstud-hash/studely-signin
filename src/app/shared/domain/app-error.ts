/**
 * Erreur métier ou technique, indépendante du transport.
 * `code` reprend le code `SigningError` du backend (ex. "400_413") quand il existe.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }
}
