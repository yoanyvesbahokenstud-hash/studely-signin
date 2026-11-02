import { Signal } from '@angular/core';
import { AuthUser } from './auth-user';

/** Challenge renvoyé par la première étape de connexion, à repasser tel quel à `confirmSignIn`. */
export interface SignInChallenge {
  /** Nom du challenge Cognito (ex. `EMAIL_OTP`). */
  name: string;
  session: string;
  userId: string;
  /** Adresse (masquée) à laquelle le code a été envoyé. */
  destination?: string;
}

/**
 * Port de la session du gestionnaire. Deux implémentations :
 * `AviAuthSession` (service d'auth AVI / Cognito) et `DevAuthSession` (mode mock).
 */
export abstract class AuthSession {
  abstract readonly user: Signal<AuthUser | null>;
  abstract readonly isAuthenticated: Signal<boolean>;

  /** Vérifie les identifiants et déclenche l'envoi d'un code par e-mail. Lève une `AppError` s'ils sont refusés. */
  abstract signIn(email: string, password: string): Promise<SignInChallenge>;

  /**
   * Ouvre la session avec le code reçu. Lève une `AppError` si le code est refusé
   * ou si l'utilisateur n'a pas de rôle back-office (`MISSING_BACK_OFFICE_ROLE`).
   */
  abstract confirmSignIn(challenge: SignInChallenge, code: string): Promise<void>;

  /** Jeton à envoyer au backend, `null` si la session est absente ou expirée. */
  abstract accessToken(): Promise<string | null>;

  abstract signOut(): Promise<void>;
}
