import { DestroyRef, inject, Injectable } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import { AuthSession, SignInChallenge } from './auth-session';
import { canUseBackOffice, MISSING_ROLE_ERROR_CODE } from './auth-user';
import { AviAuthClient } from './avi-auth-client';
import { TokenSession } from './token-session';

/** Session du gestionnaire, ouverte auprès du service d'auth AVI (jeton Cognito). */
@Injectable()
export class AviAuthSession extends AuthSession {
  private readonly client = inject(AviAuthClient);
  private readonly session = new TokenSession('sts.session', canUseBackOffice);

  readonly user = this.session.user;
  readonly isAuthenticated = this.session.isOpen;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.session.dispose());
  }

  signIn(email: string, password: string): Promise<SignInChallenge> {
    return this.client.signIn(email, password);
  }

  async confirmSignIn(challenge: SignInChallenge, code: string): Promise<void> {
    const { token, user } = await this.client.confirmSignIn(challenge, code);
    if (!canUseBackOffice(user)) {
      throw new AppError(403, MISSING_ROLE_ERROR_CODE, "Ce compte n'a pas accès au back-office");
    }
    this.session.open(token, user);
  }

  accessToken(): Promise<string | null> {
    return Promise.resolve(this.session.token());
  }

  signOut(): Promise<void> {
    this.session.close();
    return Promise.resolve();
  }
}
