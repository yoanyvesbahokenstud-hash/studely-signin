/** Formats des endpoints publics `/api/v1/signer/**` (voir Swagger). Ne sortent pas de `infrastructure/`. */

export interface VerifyLinkResultDto {
  idSignatureRequest: string;
  idSigner: string;
  email: string;
  verified: boolean;
  documentUrls: string[] | null;
  /** À renvoyer dans l'en-tête `X-Signing-Access-Token` aux étapes suivantes. */
  accessToken: string;
  accessExpiresAt: string;
}

export interface SignRequestResultDto {
  idRequestName: string;
  signatureRequestInfos: { requestName: string | null; requestState: string };
  signedFilesDownloadUrls: string[] | null;
}
