import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiResponse } from '@core/http/api-envelope';
import { OtpChannel, SigningLink, SigningOutcome, VerifiedLink } from '../../domain/signing';
import { SignerPortalRepository } from '../../domain/signer-portal.repository';
import { SignRequestResultDto, VerifyLinkResultDto } from './signer-portal.dto';

/** En-tête portant le jeton d'accès remis par `/verify-link`. */
const ACCESS_TOKEN_HEADER = 'X-Signing-Access-Token';

/**
 * Adaptateur vers `/api/v1/signer/**` : endpoints publics, sans en-tête d'authentification.
 * Après `/verify-link`, les appels portent le jeton d'accès dans `X-Signing-Access-Token`.
 */
@Injectable()
export class HttpSignerPortalRepository extends SignerPortalRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiBaseUrl}/signer`;

  /** `POST /verify-link` */
  async verifyLink(link: SigningLink, email: string): Promise<VerifiedLink> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<VerifyLinkResultDto>>(`${this.baseUrl}/verify-link`, {
        idSignatureRequest: link.requestId,
        idSigner: link.signerId,
        providedEmail: email,
      }),
    );
    return {
      signerEmail: response.data.email,
      documentUrls: response.data.documentUrls ?? [],
      accessToken: response.data.accessToken,
      accessExpiresAt: new Date(response.data.accessExpiresAt),
    };
  }

  /** `POST /signing-otp` — l'envoi passe par la file de notifications, sans jeton étudiant. */
  async requestOtp(
    link: SigningLink,
    channel: OtpChannel,
    lang: string,
    accessToken: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/signing-otp`,
        {
          idSignatureRequest: link.requestId,
          idSigner: link.signerId,
          lang,
          otpMode: channel,
        },
        { headers: accessHeaders(accessToken) },
      ),
    );
  }

  /** `POST /execute-signing` — attention à la clé `idRequest`. Le backend vérifie le code avec son propre jeton de service. */
  async sign(link: SigningLink, otp: string, accessToken: string): Promise<SigningOutcome> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<SignRequestResultDto>>(
        `${this.baseUrl}/execute-signing`,
        {
          idRequest: link.requestId,
          idSigner: link.signerId,
          providedOtp: otp,
        },
        { headers: accessHeaders(accessToken) },
      ),
    );
    const result = response.data;
    return {
      requestName: result.signatureRequestInfos.requestName ?? '',
      completed: result.signatureRequestInfos.requestState === 'SIGNED',
      signedDocumentUrls: result.signedFilesDownloadUrls ?? [],
    };
  }
}

function accessHeaders(accessToken: string): HttpHeaders {
  return new HttpHeaders({ [ACCESS_TOKEN_HEADER]: accessToken });
}
