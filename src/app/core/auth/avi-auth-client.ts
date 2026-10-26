import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { AppError } from '@shared/domain/app-error';
import { AuthUser } from './auth-user';
import { readIdToken } from './jwt';

/** Réponse de `POST /account/signIn` (champs utilisés uniquement). */
interface SignInResponse {
  authentication_result?: { id_token?: string };
}

export interface IssuedToken {
  token: string;
  user: AuthUser;
}

/**
 * Client du service d'auth AVI, qui délivre les `id_token` Cognito. Commun aux gestionnaires
 * (back-office) et aux étudiants (portail de signature) : le contrôle des rôles est fait par l'appelant.
 */
@Injectable({ providedIn: 'root' })
export class AviAuthClient {
  private readonly http = inject(HttpClient);
  private readonly authBaseUrl = inject(APP_CONFIG).authBaseUrl;

  async signIn(email: string, password: string): Promise<IssuedToken> {
    const response = await firstValueFrom(
      this.http.post<SignInResponse>(`${this.authBaseUrl}/account/signIn`, { email, password }),
    );
    const token = response.authentication_result?.id_token;
    const user = token ? readIdToken(token) : null;
    if (!token || !user) {
      throw new AppError(0, 'UNEXPECTED_AUTH_RESPONSE', "Réponse inattendue du service d'auth");
    }
    return { token, user };
  }
}
