import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiResponse } from '@core/http/api-envelope';
import { OtpChannel, SigningLink, SigningOutcome, VerifiedLink } from '../../domain/signing';
import { SignerPortalRepository } from '../../domain/signer-portal.repository';
import { SignRequestResultDto, VerifyLinkResultDto } from './signer-portal.dto';

/** Adaptateur vers `/api/v1/signer/**` : endpoints publics, sans en-tête d'authentification. */
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
      signerEmail: response.data.signerEmail,
      documentUrls: response.data.toSignFilesDownloadUrls ?? [],
    };
  }

  /** `POST /signing-otp` — `token` est relayé en Bearer au service OTP, qui exige `ROLE_STUDENT`. */
  async requestOtp(
    link: SigningLink,
    channel: OtpChannel,
    lang: string,
    idToken: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/signing-otp`, {
        idSignatureRequest: link.requestId,
        idSigner: link.signerId,
        token: idToken,
        lang,
        otpMode: channel,
      }),
    );
  }

  /** `POST /execute-signing` — attention aux clés `idRequest` et `SignerToken` (S majuscule). */
  async sign(link: SigningLink, otp: string, idToken: string): Promise<SigningOutcome> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<SignRequestResultDto>>(`${this.baseUrl}/execute-signing`, {
        idRequest: link.requestId,
        idSigner: link.signerId,
        providedOtp: otp,
        SignerToken: idToken,
      }),
    );
    const result = response.data;
    return {
      requestName: result.signatureRequestInfos.requestName ?? '',
      completed: result.signatureRequestInfos.requestState === 'SIGNED',
      signedDocumentUrls: result.signedFilesDownloadUrls ?? [],
    };
  }
}
