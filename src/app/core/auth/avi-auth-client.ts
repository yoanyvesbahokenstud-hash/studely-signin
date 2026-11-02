import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { AppError } from '@shared/domain/app-error';
import { SignInChallenge } from './auth-session';
import { AuthUser } from './auth-user';
import { readIdToken } from './jwt';

/** Réponse de `POST /account/signIn` : un challenge Cognito (champs utilisés uniquement). */
interface SignInResponse {
  challenge_name?: string;
  session?: string;
  challenge_parameters?: { USER_ID_FOR_SRP?: string; CODE_DELIVERY_DESTINATION?: string };
}

/** Réponse de `POST /account/confirmSignIn` (champs utilisés uniquement). */
interface ConfirmSignInResponse {
  authentication_result?: { id_token?: string };
}

export interface IssuedToken {
  token: string;
  user: AuthUser;
}

/**
 * Client du service d'auth AVI, qui délivre les `id_token` Cognito. Commun aux gestionnaires
 * (back-office) et aux étudiants (portail de signature) : le contrôle des rôles est fait par l'appelant.
 *
 * La connexion se fait en deux temps : `signIn` envoie un code OTP par e-mail (challenge `EMAIL_OTP`),
 * `confirmSignIn` l'échange contre les jetons.
 */
@Injectable({ providedIn: 'root' })
export class AviAuthClient {
  private readonly http = inject(HttpClient);
  private readonly authBaseUrl = inject(APP_CONFIG).authBaseUrl;

  async signIn(email: string, password: string): Promise<SignInChallenge> {
    const response = await firstValueFrom(
      this.http.post<SignInResponse>(`${this.authBaseUrl}/account/signIn`, {
        email,
        password,
        lang: 'FR',
      }),
    );
    const userId = response.challenge_parameters?.USER_ID_FOR_SRP;
    if (!response.challenge_name || !response.session || !userId) {
      throw unexpectedResponse();
    }
    return {
      name: response.challenge_name,
      session: response.session,
      userId,
      destination: response.challenge_parameters?.CODE_DELIVERY_DESTINATION,
    };
  }

  async confirmSignIn(challenge: SignInChallenge, code: string): Promise<IssuedToken> {
    const response = await firstValueFrom(
      this.http.post<ConfirmSignInResponse>(`${this.authBaseUrl}/account/confirmSignIn`, {
        user_id: challenge.userId,
        session_id: challenge.session,
        challenge_name: challenge.name,
        code,
      }),
    );
    const token = response.authentication_result?.id_token;
    const user = token ? readIdToken(token) : null;
    if (!token || !user) {
      throw unexpectedResponse();
    }
    return { token, user };
  }
}

function unexpectedResponse(): AppError {
  return new AppError(0, 'UNEXPECTED_AUTH_RESPONSE', "Réponse inattendue du service d'auth");
}
