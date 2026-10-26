/** Parcours public du signataire (UC-15). Indépendant de la feature back-office. */

/** Identifie le signataire : c'est ce que contient le lien envoyé par e-mail (`/sign/{requestId}/{signerId}`). */
export interface SigningLink {
  requestId: string;
  signerId: string;
}

/** Canal d'envoi du code à usage unique (`OtpMode` côté backend). */
export type OtpChannel = 'SMS' | 'MAIL';

export interface VerifiedLink {
  signerEmail: string;
  /** Liens présignés vers les documents à signer, valables 15 minutes. */
  documentUrls: string[];
  /** Jeton d'accès exigé par la demande d'OTP et la signature (2 h max, prolongé à chaque action). */
  accessToken: string;
  accessExpiresAt: Date;
}

export interface SigningOutcome {
  requestName: string;
  /** `true` si ce signataire était le dernier : les documents sont alors signés. */
  completed: boolean;
  /** Liens présignés vers les PDF signés (15 minutes), vides tant que tous n'ont pas signé. */
  signedDocumentUrls: string[];
}

/** Étapes de l'écran, dans l'ordre. */
export type SigningStep = 'verify' | 'review' | 'otp' | 'done';
