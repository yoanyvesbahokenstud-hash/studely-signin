import { OtpChannel, SigningLink, SigningOutcome, VerifiedLink } from './signing';

/**
 * Port vers les endpoints publics `/api/v1/signer/**`.
 * Lève une `AppError` portant le code `SigningError` du backend en cas de refus.
 */
export abstract class SignerPortalRepository {
  /** Le signataire prouve qu'il est le destinataire du lien en saisissant son e-mail. */
  abstract verifyLink(link: SigningLink, email: string): Promise<VerifiedLink>;

  /** `accessToken` : jeton remis par `verifyLink`. */
  abstract requestOtp(
    link: SigningLink,
    channel: OtpChannel,
    lang: string,
    accessToken: string,
  ): Promise<void>;

  abstract sign(link: SigningLink, otp: string, accessToken: string): Promise<SigningOutcome>;
}
