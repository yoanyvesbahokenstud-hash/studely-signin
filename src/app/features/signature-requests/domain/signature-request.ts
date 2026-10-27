/** Modèle métier d'une demande de signature, côté front. Aucune dépendance à Angular ni au format de l'API. */

/** États du backend (`SignatureRequestState`). */
export const SIGNATURE_REQUEST_STATES = [
  'DRAFT',
  'SUBMITTED',
  'SIGNED',
  'EXPIRED',
  'CANCELLED',
  /** Quota d'OTP épuisé par un signataire : plus aucune signature possible, la demande reste annulable. */
  'BLOCKED',
] as const;

export type SignatureRequestState = (typeof SIGNATURE_REQUEST_STATES)[number];

export type ArchiveStatus = 'NOT_ARCHIVED' | 'ARCHIVED';

/** `UNUSED` : aucun champ attribué · `PENDING` : a des champs, doit signer · `FINISHED` : a signé. */
export type SignerStatus = 'UNUSED' | 'PENDING' | 'FINISHED';

export type SignatureFieldStatus = 'UNSIGNED' | 'SAVED_TO_SIGN' | 'SIGNED';

export interface SignatureDocument {
  id: string;
  fileName: string;
}

export interface SignatureField {
  id: string;
  documentId: string;
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: SignatureFieldStatus;
}

export interface Signer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: SignerStatus;
  fields: SignatureField[];
  /** Lien de signature envoyé par e-mail, attribué à la soumission. */
  signingLink?: string;
}

export interface Follower {
  id: string;
  email: string;
  phone?: string;
}

export interface SignatureRequest {
  id: string;
  name: string;
  state: SignatureRequestState;
  archiveStatus: ArchiveStatus;
  documents: SignatureDocument[];
  signers: Signer[];
  followers: Follower[];
  linkValidityDays: number;
  reminderTimes: number;
  reminderCount: number;
  createdBy: string;
  submittedBy?: string;
  createdAt: Date;
  submittedAt?: Date;
  /** Date d'expiration des liens de signature, connue une fois la demande soumise. */
  expiresAt?: Date;
  finalizedAt?: Date;
}

export interface SignatureRequestSearchCriteria {
  id?: string;
  name?: string;
  state?: SignatureRequestState;
  createdFrom?: Date;
  createdTo?: Date;
}

/** Saisies du gestionnaire, envoyées telles quelles au port. */

export interface GeneralInformation {
  name: string;
  linkValidityDays: number;
  reminderTimes: number;
}

export interface SignerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface FollowerInput {
  email: string;
  phone: string;
}

export interface FieldInput {
  signerId: string;
  documentId: string;
  /** Tag écrit dans le PDF (`s1`, `s2`…) : le backend y place le champ. */
  tag: string;
}

/**
 * Emplacement de signature trouvé dans un PDF : un tag `{{sN}}`, invisible dans le document.
 * Le rectangle est celui où la signature sera dessinée (points PDF, origine en bas à gauche).
 */
export interface SignatureSlot {
  /** Tag à transmettre pour poser un champ (`s1`, `s2`…). */
  tag: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Texte écrit autour (« Lu et approuvé, le locataire »), vide s'il n'y a rien. */
  context: string;
}

/** Liens présignés de téléchargement, valables 15 minutes. */
export interface DocumentLink {
  documentId: string;
  url: string;
  /** Renseigné seulement quand la demande est `SIGNED`. */
  signedUrl?: string;
}
