import { SignatureRequest, SignatureRequestState } from './signature-request';

/** Règles métier pures : testables sans TestBed, réutilisables par tous les écrans de la feature. */

/** Miroir des contrôles de `SignatureRequest.submit()` côté backend (400_430 à 400_433). */
export type SubmissionBlocker =
  'NO_DOCUMENT' | 'NO_SIGNER' | 'SIGNER_WITHOUT_FIELD' | 'DOCUMENT_WITHOUT_FIELD';

export function isEditable(state: SignatureRequestState): boolean {
  return state === 'DRAFT';
}

/** Nombre de signataires ayant terminé, pour l'affichage de la progression. */
export function signedCount(request: SignatureRequest): number {
  return request.signers.filter((signer) => signer.status === 'FINISHED').length;
}

export function canBeCancelled(state: SignatureRequestState): boolean {
  return state === 'SUBMITTED';
}

export function canBeRemindedOf(state: SignatureRequestState): boolean {
  return state === 'SUBMITTED';
}

export function submissionBlockers(request: SignatureRequest): SubmissionBlocker[] {
  const blockers: SubmissionBlocker[] = [];
  if (request.documents.length === 0) {
    blockers.push('NO_DOCUMENT');
  }
  if (request.signers.length === 0) {
    blockers.push('NO_SIGNER');
  } else if (request.signers.some((signer) => signer.fields.length === 0)) {
    blockers.push('SIGNER_WITHOUT_FIELD');
  }
  const documentsWithField = new Set(
    request.signers.flatMap((signer) => signer.fields.map((field) => field.documentId)),
  );
  if (request.documents.some((document) => !documentsWithField.has(document.id))) {
    blockers.push('DOCUMENT_WITHOUT_FIELD');
  }
  return blockers;
}
