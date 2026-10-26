import { SignatureRequest, Signer } from './signature-request';
import {
  canBeArchived,
  canBeCancelled,
  isEditable,
  submissionBlockers,
} from './signature-request.rules';

const signer = (fields: Signer['fields'] = []): Signer => ({
  id: 's1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  status: 'UNUSED',
  fields,
});

const draft = (overrides: Partial<SignatureRequest> = {}): SignatureRequest => ({
  id: 'r1',
  name: 'Bail',
  state: 'DRAFT',
  archiveStatus: 'NOT_ARCHIVED',
  documents: [{ id: 'd1', fileName: 'bail.pdf' }],
  signers: [
    signer([
      {
        id: 'f1',
        documentId: 'd1',
        name: 's1',
        page: 1,
        x: 0,
        y: 0,
        width: 10,
        height: 5,
        status: 'UNSIGNED',
      },
    ]),
  ],
  followers: [],
  linkValidityDays: 30,
  reminderTimes: 3,
  reminderCount: 0,
  createdBy: 'manager',
  createdAt: new Date('2026-10-12'),
  ...overrides,
});

describe('signature request rules', () => {
  it('only allows editing drafts', () => {
    expect(isEditable('DRAFT')).toBe(true);
    expect(isEditable('SUBMITTED')).toBe(false);
  });

  it('only allows cancelling submitted or blocked requests', () => {
    expect(canBeCancelled('SUBMITTED')).toBe(true);
    expect(canBeCancelled('BLOCKED')).toBe(true);
    expect(canBeCancelled('SIGNED')).toBe(false);
    expect(canBeCancelled('EXPIRED')).toBe(false);
  });

  it('only allows archiving requests that are no longer in progress', () => {
    expect(
      ['DRAFT', 'SIGNED', 'CANCELLED', 'EXPIRED'].every((state) => canBeArchived(state as never)),
    ).toBe(true);
    expect(canBeArchived('SUBMITTED')).toBe(false);
    expect(canBeArchived('BLOCKED')).toBe(false);
  });

  it('has no blocker for a complete draft', () => {
    expect(submissionBlockers(draft())).toEqual([]);
  });

  it('reports a missing document and missing signers', () => {
    expect(submissionBlockers(draft({ documents: [], signers: [] }))).toEqual([
      'NO_DOCUMENT',
      'NO_SIGNER',
    ]);
  });

  it('reports a signer without any field, and the document left without field', () => {
    expect(submissionBlockers(draft({ signers: [signer()] }))).toEqual([
      'SIGNER_WITHOUT_FIELD',
      'DOCUMENT_WITHOUT_FIELD',
    ]);
  });

  it('reports a document that no signer has a field on', () => {
    const documents = [
      { id: 'd1', fileName: 'bail.pdf' },
      { id: 'd2', fileName: 'annexe.pdf' },
    ];
    expect(submissionBlockers(draft({ documents }))).toEqual(['DOCUMENT_WITHOUT_FIELD']);
  });
});
