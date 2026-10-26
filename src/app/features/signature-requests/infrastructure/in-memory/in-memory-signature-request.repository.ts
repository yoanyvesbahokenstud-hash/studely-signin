import { Injectable } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import { Page, PageRequest } from '@shared/domain/page';
import {
  DocumentLink,
  FieldInput,
  FollowerInput,
  GeneralInformation,
  SignatureRequest,
  SignatureRequestSearchCriteria,
  Signer,
  SignerInput,
} from '../../domain/signature-request';
import { SignatureRequestRepository } from '../../domain/signature-request.repository';
import { submissionBlockers } from '../../domain/signature-request.rules';
import { SIGNATURE_REQUEST_FIXTURES } from './signature-request.fixtures';
import { mockPdf } from '@core/mocks/mock-pdf';

/** Codes `SigningError` du backend reproduits par l'adaptateur. */
const ERRORS = {
  notDraft: ['400_400', 'SignatureRequest: action not allowed in current state (draft required)'],
  notSubmitted: [
    '400_401',
    'SignatureRequest: action not allowed in current state (submitted required)',
  ],
  signerExists: ['400_413', 'SignatureRequest: signer with this email already exists'],
  followerExists: ['400_414', 'SignatureRequest: follower with this email already exists'],
  noDocumentForSigner: [
    '400_415',
    'SignatureRequest: signer can only be added when at least one document exists',
  ],
  signerNotFound: ['400_416', 'SignatureRequest: signer not found'],
  followerNotFound: ['400_417', 'SignatureRequest: follower not found'],
  documentNotFound: ['400_418', 'SignatureRequest: document not found'],
  fieldNotFound: ['400_421', 'SignatureRequest: signature field not found'],
  fieldExists: [
    '400_422',
    'SignatureRequest: a signature field with this name already exists on this document',
  ],
  submitNoDocument: ['400_430', 'SignatureRequest: cannot submit without documents'],
  submitNoSigner: ['400_431', 'SignatureRequest: cannot submit without signers'],
  submitSignerField: [
    '400_432',
    'SignatureRequest: every signer must have at least one signature field',
  ],
  submitDocumentField: [
    '400_433',
    'SignatureRequest: every document must have at least one signature field',
  ],
  requestNotFound: ['400_460', 'SignatureRequest: signature request not found'],
} as const;

type ErrorKey = keyof typeof ERRORS;

function fail(key: ErrorKey): never {
  const [code, message] = ERRORS[key];
  throw new AppError(400, code, message);
}

/**
 * Adaptateur utilisé quand `environment.useMocks` est vrai : le front avance sans backend.
 * Il applique les mêmes règles que le domaine backend (`SignatureRequest.java`) et lève les mêmes codes.
 */
@Injectable()
export class InMemorySignatureRequestRepository extends SignatureRequestRepository {
  private readonly requests: SignatureRequest[] = structuredClone(SIGNATURE_REQUEST_FIXTURES);
  private readonly files = new Map<string, File>();
  private sequence = this.requests.length;

  async search(
    criteria: SignatureRequestSearchCriteria,
    page: PageRequest,
  ): Promise<Page<SignatureRequest>> {
    const name = criteria.name?.toLowerCase();
    const matches = this.requests
      .filter(
        (request) =>
          (!criteria.id || request.id === criteria.id) &&
          (!name || request.name.toLowerCase().includes(name)) &&
          (!criteria.state || request.state === criteria.state) &&
          (!criteria.createdFrom || request.createdAt >= criteria.createdFrom) &&
          (!criteria.createdTo || request.createdAt <= criteria.createdTo),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = page.page * page.size;
    return {
      items: structuredClone(matches.slice(start, start + page.size)),
      totalItems: matches.length,
      totalPages: Math.ceil(matches.length / page.size),
      page: page.page,
      size: page.size,
    };
  }

  async findById(id: string): Promise<SignatureRequest | null> {
    const request = this.requests.find((candidate) => candidate.id === id);
    return request ? structuredClone(request) : null;
  }

  async create(): Promise<string> {
    const id = `req-${++this.sequence}`;
    this.requests.push({
      id,
      name: '',
      state: 'DRAFT',
      archiveStatus: 'NOT_ARCHIVED',
      documents: [],
      signers: [],
      followers: [],
      linkValidityDays: 30,
      reminderTimes: 3,
      reminderCount: 0,
      createdBy: 'gestionnaire@studely.com',
      createdAt: new Date(),
    });
    return id;
  }

  async editInformation(requestId: string, information: GeneralInformation): Promise<void> {
    const request = this.draft(requestId);
    request.name = information.name;
    request.linkValidityDays = information.linkValidityDays;
    request.reminderTimes = information.reminderTimes;
  }

  async uploadDocuments(requestId: string, files: File[]): Promise<void> {
    const request = this.draft(requestId);
    for (const file of files) {
      const id = this.nextId('doc');
      this.files.set(id, file);
      request.documents.push({ id, fileName: file.name });
    }
  }

  async removeDocuments(requestId: string, documentIds: string[]): Promise<void> {
    const request = this.draft(requestId);
    for (const documentId of documentIds) {
      if (!request.documents.some((document) => document.id === documentId)) {
        fail('documentNotFound');
      }
      request.documents = request.documents.filter((document) => document.id !== documentId);
      request.signers.forEach((signer) => {
        signer.fields = signer.fields.filter((field) => field.documentId !== documentId);
      });
      this.files.delete(documentId);
    }
  }

  async documentLinks(requestId: string): Promise<DocumentLink[]> {
    const request = this.find(requestId);
    return request.documents.map((document) => {
      const file = this.files.get(document.id);
      // Les navigateurs bloquent l'ouverture d'une URL data: : on passe par une URL blob.
      const content = file ?? mockPdf(document.fileName.replace(/\.pdf$/i, ''));
      const url = URL.createObjectURL(content);
      return {
        documentId: document.id,
        fileName: document.fileName,
        url,
        signedUrl: request.state === 'SIGNED' ? url : undefined,
      };
    });
  }

  async addSigner(requestId: string, input: SignerInput): Promise<void> {
    const request = this.draft(requestId);
    if (request.documents.length === 0) fail('noDocumentForSigner');
    if (request.signers.some((signer) => sameEmail(signer.email, input.email))) {
      fail('signerExists');
    }
    request.signers.push({
      id: this.nextId('signer'),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      status: 'UNUSED',
      fields: [],
    });
  }

  async editSigner(requestId: string, signerId: string, input: SignerInput): Promise<void> {
    const request = this.draft(requestId);
    if (
      request.signers.some(
        (signer) => signer.id !== signerId && sameEmail(signer.email, input.email),
      )
    ) {
      fail('signerExists');
    }
    const signer = this.signer(request, signerId);
    Object.assign(signer, input);
  }

  async removeSigner(requestId: string, signerId: string): Promise<void> {
    const request = this.draft(requestId);
    this.signer(request, signerId);
    request.signers = request.signers.filter((signer) => signer.id !== signerId);
  }

  async addField(requestId: string, input: FieldInput): Promise<void> {
    const request = this.draft(requestId);
    const signer = this.signer(request, input.signerId);
    if (!request.documents.some((document) => document.id === input.documentId)) {
      fail('documentNotFound');
    }
    const taken = request.signers.some((candidate) =>
      candidate.fields.some(
        (field) => field.documentId === input.documentId && field.name === input.tag,
      ),
    );
    if (taken) fail('fieldExists');
    // Position simulée : le backend la lit dans le PDF à l'emplacement du tag.
    const index = Number(input.tag.slice(1));
    signer.fields.push({
      id: this.nextId('field'),
      documentId: input.documentId,
      name: input.tag,
      page: 1,
      x: 72,
      y: Math.max(72, 700 - index * 80),
      width: 100,
      height: 50,
      status: 'UNSIGNED',
    });
    signer.status = 'PENDING';
  }

  async removeField(requestId: string, fieldId: string): Promise<void> {
    const request = this.draft(requestId);
    const signer = request.signers.find((candidate) =>
      candidate.fields.some((field) => field.id === fieldId),
    );
    if (!signer) fail('fieldNotFound');
    signer.fields = signer.fields.filter((field) => field.id !== fieldId);
    if (signer.fields.length === 0) signer.status = 'UNUSED';
  }

  async addFollower(requestId: string, input: FollowerInput): Promise<void> {
    const request = this.draft(requestId);
    if (request.followers.some((follower) => sameEmail(follower.email, input.email))) {
      fail('followerExists');
    }
    request.followers.push({ id: this.nextId('follower'), ...input });
  }

  async editFollower(requestId: string, followerId: string, input: FollowerInput): Promise<void> {
    const request = this.draft(requestId);
    if (
      request.followers.some(
        (follower) => follower.id !== followerId && sameEmail(follower.email, input.email),
      )
    ) {
      fail('followerExists');
    }
    const follower = request.followers.find((candidate) => candidate.id === followerId);
    if (!follower) fail('followerNotFound');
    Object.assign(follower, input);
  }

  async removeFollower(requestId: string, followerId: string): Promise<void> {
    const request = this.draft(requestId);
    if (!request.followers.some((follower) => follower.id === followerId)) {
      fail('followerNotFound');
    }
    request.followers = request.followers.filter((follower) => follower.id !== followerId);
  }

  async submit(requestId: string): Promise<void> {
    const request = this.draft(requestId);
    const [blocker] = submissionBlockers(request);
    if (blocker === 'NO_DOCUMENT') fail('submitNoDocument');
    if (blocker === 'NO_SIGNER') fail('submitNoSigner');
    if (blocker === 'SIGNER_WITHOUT_FIELD') fail('submitSignerField');
    if (blocker === 'DOCUMENT_WITHOUT_FIELD') fail('submitDocumentField');
    request.state = 'SUBMITTED';
    request.submittedAt = new Date();
    request.submittedBy = 'gestionnaire@studely.com';
  }

  async cancel(requestId: string): Promise<void> {
    const request = this.find(requestId);
    if (request.state !== 'SUBMITTED' || request.archiveStatus !== 'NOT_ARCHIVED') {
      fail('notSubmitted');
    }
    request.state = 'CANCELLED';
  }

  private find(requestId: string): SignatureRequest {
    return this.requests.find((request) => request.id === requestId) ?? fail('requestNotFound');
  }

  private draft(requestId: string): SignatureRequest {
    const request = this.find(requestId);
    if (request.state !== 'DRAFT' || request.archiveStatus !== 'NOT_ARCHIVED') fail('notDraft');
    return request;
  }

  private signer(request: SignatureRequest, signerId: string): Signer {
    return request.signers.find((signer) => signer.id === signerId) ?? fail('signerNotFound');
  }

  private nextId(prefix: string): string {
    return `${prefix}-${++this.sequence}`;
  }
}

function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
