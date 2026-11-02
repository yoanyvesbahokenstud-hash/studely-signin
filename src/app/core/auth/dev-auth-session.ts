import { computed, Injectable, signal } from '@angular/core';
import { AuthSession, SignInChallenge } from './auth-session';
import { AuthUser } from './auth-user';

/** Session simulée utilisée quand `environment.useMocks` est vrai : n'importe quels identifiants sont acceptés. */
@Injectable()
export class DevAuthSession extends AuthSession {
  private readonly userState = signal<AuthUser | null>(null);
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);

  signIn(email: string): Promise<SignInChallenge> {
    return Promise.resolve({ name: 'EMAIL_OTP', session: 'dev-session', userId: email });
  }

  /** N'importe quel code est accepté. */
  confirmSignIn(challenge: SignInChallenge): Promise<void> {
    this.userState.set({
      email: challenge.userId,
      authorities: ['ROLE_GATEKEEPER_ADMIN'],
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
    });
    return Promise.resolve();
  }

  accessToken(): Promise<string | null> {
    return Promise.resolve(this.userState() ? 'dev-token' : null);
  }

  signOut(): Promise<void> {
    this.userState.set(null);
    return Promise.resolve();
  }
}
