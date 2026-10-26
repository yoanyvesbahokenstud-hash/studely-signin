/** Formats des endpoints publics `/api/v1/signer/**` (voir Swagger). Ne sortent pas de `infrastructure/`. */

export interface VerifyLinkResultDto {
  idSignatureRequest: string;
  idSigner: string;
  signerEmail: string;
  linkVerified: boolean;
  toSignFilesDownloadUrls: string[] | null;
}

export interface SignRequestResultDto {
  idRequestName: string;
  signatureRequestInfos: { requestName: string | null; requestState: string };
  signedFilesDownloadUrls: string[] | null;
}
