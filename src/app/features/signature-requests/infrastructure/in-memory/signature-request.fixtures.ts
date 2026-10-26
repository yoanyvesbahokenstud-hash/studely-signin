import { SignatureRequest, Signer, SignerStatus } from '../../domain/signature-request';

const base = {
  archiveStatus: 'NOT_ARCHIVED' as const,
  documents: [{ id: 'doc-1', fileName: 'contrat.pdf' }],
  followers: [],
  linkValidityDays: 30,
  reminderTimes: 3,
  reminderCount: 0,
  createdBy: 'gestionnaire@studely.com',
};

const signer = (
  id: string,
  firstName: string,
  lastName: string,
  status: SignerStatus = 'UNUSED',
): Signer => ({
  id,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
  phone: '+33612345678',
  status,
  fields: [
    {
      id: `field-${id}`,
      documentId: 'doc-1',
      name: 's1',
      page: 1,
      x: 72,
      y: 600,
      width: 100,
      height: 50,
      status: status === 'FINISHED' ? 'SIGNED' : 'UNSIGNED',
    },
  ],
});

export const SIGNATURE_REQUEST_FIXTURES: SignatureRequest[] = [
  {
    ...base,
    id: 'req-1',
    name: 'Bail étudiant - Lyon',
    state: 'DRAFT',
    signers: [],
    createdAt: new Date('2026-10-12T09:00:00Z'),
  },
  {
    ...base,
    id: 'req-2',
    name: 'Contrat de garantie',
    state: 'SUBMITTED',
    signers: [
      signer('s-1', 'Camille', 'Martin', 'FINISHED'),
      signer('s-2', 'Noah', 'Bernard', 'PENDING'),
    ],
    followers: [{ id: 'f-1', email: 'conseiller@studely.com', phone: '+33700000000' }],
    createdAt: new Date('2026-10-10T14:30:00Z'),
    submittedBy: 'gestionnaire@studely.com',
    submittedAt: new Date('2026-10-10T15:00:00Z'),
  },
  {
    ...base,
    id: 'req-3',
    name: 'Avenant au bail',
    state: 'SIGNED',
    signers: [signer('s-3', 'Inès', 'Petit', 'FINISHED')],
    createdAt: new Date('2026-10-02T08:15:00Z'),
    submittedBy: 'gestionnaire@studely.com',
    submittedAt: new Date('2026-10-02T08:20:00Z'),
    finalizedAt: new Date('2026-10-03T11:00:00Z'),
  },
  {
    ...base,
    id: 'req-4',
    name: 'Mandat de prélèvement',
    state: 'CANCELLED',
    signers: [signer('s-4', 'Lucas', 'Robert')],
    createdAt: new Date('2026-09-28T10:00:00Z'),
    submittedBy: 'gestionnaire@studely.com',
    submittedAt: new Date('2026-09-28T10:05:00Z'),
  },
  {
    ...base,
    id: 'req-5',
    name: 'Attestation de caution',
    state: 'SUBMITTED',
    signers: [signer('s-5', 'Léa', 'Durand')],
    createdAt: new Date('2026-08-20T09:00:00Z'),
    submittedBy: 'gestionnaire@studely.com',
    submittedAt: new Date('2026-08-20T09:10:00Z'),
  },
];
