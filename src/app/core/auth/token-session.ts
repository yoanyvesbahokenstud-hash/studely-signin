import { computed, signal } from '@angular/core';
import { AuthUser } from './auth-user';
import { readIdToken } from './jwt';

/**
 * Jeton d'une session ouverte, gardé en `sessionStorage` (limité à l'onglet) sous `storageKey`.
 * La session est restaurée au chargement si le jeton est encore valide et accepté,
 * et se ferme d'elle-même à l'expiration du jeton.
 */
export class TokenSession {
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<AuthUser | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly user = this.userState.asReadonly();
  readonly isOpen = computed(() => this.userState() !== null);

  constructor(
    private readonly storageKey: string,
    private readonly accepts: (user: AuthUser) => boolean,
  ) {
    const token = this.readStorage();
    const user = token ? readIdToken(token) : null;
    if (token && user && user.expiresAt.getTime() > Date.now() && accepts(user)) {
      this.open(token, user);
    } else if (token) {
      this.writeStorage(null);
    }
  }

  /** Jeton courant, `null` si la session est absente ou expirée. */
  token(): string | null {
    const user = this.userState();
    if (user && user.expiresAt.getTime() <= Date.now()) {
      this.close();
    }
    return this.tokenState();
  }

  open(token: string, user: AuthUser): void {
    this.tokenState.set(token);
    this.userState.set(user);
    this.writeStorage(token);
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.close(), user.expiresAt.getTime() - Date.now());
  }

  /** Arrête le minuteur d'expiration sans fermer la session (destruction de l'injecteur). */
  dispose(): void {
    clearTimeout(this.expiryTimer);
  }

  close(): void {
    clearTimeout(this.expiryTimer);
    this.tokenState.set(null);
    this.userState.set(null);
    this.writeStorage(null);
  }

  private readStorage(): string | null {
    try {
      return sessionStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private writeStorage(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(this.storageKey, token);
      } else {
        sessionStorage.removeItem(this.storageKey);
      }
    } catch {
      // Stockage indisponible : la session reste valable tant que l'onglet est ouvert.
    }
  }
}
