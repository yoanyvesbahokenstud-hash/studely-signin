import {
  SIGNATURE_REQUEST_STATES,
  SignatureField,
  SignatureFieldStatus,
  SignatureRequest,
  Signer,
  SignerStatus,
} from '../../domain/signature-request';
import { DEFAULT_REQUEST_NAME } from '../../domain/signature-request.validation';
import {
  SearchSignatureRequestResultDto,
  SignatureFieldDto,
  SignerDto,
} from './signature-request.dto';

const SIGNER_STATUSES: readonly SignerStatus[] = ['UNUSED', 'PENDING', 'FINISHED'];
const FIELD_STATUSES: readonly SignatureFieldStatus[] = ['UNSIGNED', 'SAVED_TO_SIGN', 'SIGNED'];

export function toSignatureRequest(dto: SearchSignatureRequestResultDto): SignatureRequest {
  const infos = dto.requestInfos;
  return {
    id: dto.idSignatureRequest,
    // Le nom posé par défaut à la création n'est pas un vrai nom : la demande reste « sans nom ».
    name: !infos.requestName || infos.requestName === DEFAULT_REQUEST_NAME ? '' : infos.requestName,
    state: toEnum(infos.requestState, SIGNATURE_REQUEST_STATES, 'signature request state'),
    archiveStatus: infos.archiveStatus === 'ARCHIVED' ? 'ARCHIVED' : 'NOT_ARCHIVED',
    documents: (infos.documents ?? []).map((document) => ({
      id: document.idDocument,
      fileName: document.filename,
    })),
    signers: (infos.signers ?? []).map(toSigner),
    followers: (infos.followers ?? []).map((follower) => ({
      id: follower.idFollower,
      email: follower.email,
      phone: follower.phone ?? undefined,
    })),
    linkValidityDays: infos.linkValidityPeriodInDays,
    reminderTimes: infos.reminderTimes,
    reminderCount: infos.reminderCurrentCount,
    createdBy: infos.createdBy,
    submittedBy: infos.submittedBy ?? undefined,
    createdAt: new Date(infos.createdAt),
    submittedAt: infos.submittedAt ? new Date(infos.submittedAt) : undefined,
    expiresAt: infos.expiredAt ? new Date(infos.expiredAt) : undefined,
    finalizedAt: infos.finalizedAt ? new Date(infos.finalizedAt) : undefined,
  };
}

function toSigner(dto: SignerDto): Signer {
  return {
    id: dto.idSigner,
    firstName: dto.firstname ?? '',
    lastName: dto.lastname,
    email: dto.email,
    phone: dto.phone ?? undefined,
    status: toEnum(dto.signerStatus, SIGNER_STATUSES, 'signer status'),
    fields: (dto.fields ?? []).map(toField),
    signingLink: dto.signingLink ?? undefined,
  };
}

function toField(dto: SignatureFieldDto): SignatureField {
  return {
    id: dto.idField,
    documentId: dto.documentReference,
    name: dto.fieldName,
    page: Number(dto.pageNumber),
    x: Number(dto.xCoordinate),
    y: Number(dto.yCoordinate),
    width: Number(dto.width),
    height: Number(dto.height),
    status: toEnum(dto.status, FIELD_STATUSES, 'signature field status'),
  };
}

function toEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`Unknown ${label}: ${value}`);
}
