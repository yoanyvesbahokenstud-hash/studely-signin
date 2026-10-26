import { Signal } from '@angular/core';
import { AuthUser } from './auth-user';

/**
 * Port de la session du gestionnaire. Deux implémentations :
 * `AviAuthSession` (service d'auth AVI / Cognito) et `DevAuthSession` (mode mock).
 */
export abstract class AuthSession {
  abstract readonly user: Signal<AuthUser | null>;
  abstract readonly isAuthenticated: Signal<boolean>;

  /**
   * Ouvre une session. Lève une `AppError` si les identifiants sont refusés
   * ou si l'utilisateur n'a pas de rôle back-office (`MISSING_BACK_OFFICE_ROLE`).
   */
  abstract signIn(email: string, password: string): Promise<void>;

  /** Jeton à envoyer au backend, `null` si la session est absente ou expirée. */
  abstract accessToken(): Promise<string | null>;

  abstract signOut(): Promise<void>;
}
