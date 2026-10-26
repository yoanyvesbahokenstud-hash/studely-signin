/** Formats de l'API back-office (voir Swagger : `/swagger-ui.html`). Ne sortent pas de `infrastructure/`. */

/** `SignatureFieldInfos` : le backend sérialise les coordonnées en chaînes. */
export interface SignatureFieldDto {
  idField: string;
  documentReference: string;
  fieldName: string;
  xCoordinate: string;
  yCoordinate: string;
  width: string;
  height: string;
  pageNumber: string;
  status: string;
}

export interface SignerDto {
  idSigner: string;
  firstname: string | null;
  lastname: string;
  email: string;
  phone: string | null;
  fields: SignatureFieldDto[] | null;
  signerStatus: string;
}

export interface FollowerDto {
  idFollower: string;
  email: string;
  phone: string | null;
}

export interface DocumentDto {
  idDocument: string;
  filename: string;
  fileReference: string;
}

export interface SignatureRequestInfosDto {
  requestName: string | null;
  documents: DocumentDto[];
  signers: SignerDto[];
  followers: FollowerDto[];
  requestState: string;
  archiveStatus: string;
  linkValidityPeriodInDays: number;
  reminderTimes: number;
  reminderCurrentCount: number;
  createdBy: string;
  submittedBy: string | null;
  createdAt: string;
  submittedAt: string | null;
  finalizedAt: string | null;
}

export interface SearchSignatureRequestResultDto {
  idSignatureRequest: string;
  requestInfos: SignatureRequestInfosDto;
}

export interface InitSignatureRequestResultDto {
  idSignatureRequest: string;
  createdBy: string;
  requestName: string | null;
  status: string;
}

export interface GetDocumentFilesResultDto {
  idRequest: string;
  documents: {
    idDocument: string;
    fileName: string;
    downloadUrl: string;
    downloadUrlSignedFile: string | null;
  }[];
}
