import { SearchSignatureRequestResultDto } from './signature-request.dto';
import { toSignatureRequest } from './signature-request.mapper';

const dto: SearchSignatureRequestResultDto = {
  idSignatureRequest: 'r1',
  requestInfos: {
    requestName: null,
    documents: [{ idDocument: 'd1', filename: 'bail.pdf', fileReference: 'sr/r1/d1.pdf' }],
    signers: [
      {
        idSigner: 's1',
        firstname: null,
        lastname: 'Lovelace',
        email: 'ada@example.com',
        phone: '+33612345678',
        signerStatus: 'PENDING',
        fields: [
          {
            idField: 'f1',
            documentReference: 'd1',
            fieldName: 's1',
            xCoordinate: '72.5',
            yCoordinate: '640.0',
            width: '100.0',
            height: '50.0',
            pageNumber: '2',
            status: 'UNSIGNED',
          },
        ],
      },
    ],
    followers: [],
    requestState: 'SUBMITTED',
    archiveStatus: 'NOT_ARCHIVED',
    linkValidityPeriodInDays: 30,
    reminderTimes: 3,
    reminderCurrentCount: 1,
    createdBy: 'manager',
    submittedBy: 'manager',
    createdAt: '2026-10-12T09:00:00Z',
    submittedAt: '2026-10-12T10:00:00Z',
    finalizedAt: null,
  },
};

describe('toSignatureRequest', () => {
  it('maps the API format to the domain model', () => {
    const request = toSignatureRequest(dto);

    expect(request.name).toBe('');
    expect(request.state).toBe('SUBMITTED');
    expect(request.reminderCount).toBe(1);
    expect(request.finalizedAt).toBeUndefined();
    expect(request.signers[0]).toMatchObject({ firstName: '', status: 'PENDING' });
  });

  it('parses the field coordinates the backend sends as strings', () => {
    const [field] = toSignatureRequest(dto).signers[0].fields;

    expect(field).toEqual({
      id: 'f1',
      documentId: 'd1',
      name: 's1',
      page: 2,
      x: 72.5,
      y: 640,
      width: 100,
      height: 50,
      status: 'UNSIGNED',
    });
  });

  it('rejects an unknown state rather than displaying it wrongly', () => {
    const unknown = { ...dto, requestInfos: { ...dto.requestInfos, requestState: 'EXPIRED' } };

    expect(() => toSignatureRequest(unknown)).toThrow('Unknown signature request state: EXPIRED');
  });
});
