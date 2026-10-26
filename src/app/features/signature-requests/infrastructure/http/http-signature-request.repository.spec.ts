import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { HttpSignatureRequestRepository } from './http-signature-request.repository';

const BASE = '/api/bo/signature-request';
const OK = { status: 200, message: 'Success', data: null };

/** Vérifie le contrat avec l'API (noms de clés, verbes, formats) tel que décrit dans le Swagger. */
describe('HttpSignatureRequestRepository', () => {
  let repository: HttpSignatureRequestRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpSignatureRequestRepository,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBaseUrl: '/api', authBaseUrl: '/auth', useMocks: false },
        },
      ],
    });
    repository = TestBed.inject(HttpSignatureRequestRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a request and returns its id', async () => {
    const created = repository.create();
    const req = http.expectOne(`${BASE}/init`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...OK, data: { idSignatureRequest: 'r1', status: 'DRAFT' } });

    expect(await created).toBe('r1');
  });

  it('sends the general information with the backend key names', async () => {
    const done = repository.editInformation('r1', {
      name: 'Bail',
      linkValidityDays: 30,
      reminderTimes: 2,
    });
    const req = http.expectOne(`${BASE}/edit-information`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      idSignatureRequest: 'r1',
      requestName: 'Bail',
      linkExpirationTimeInDays: 30,
      reminderTimes: 2,
    });
    req.flush(OK);
    await done;
  });

  it('uploads the PDF files as multipart form data', async () => {
    const files = [new File(['%PDF'], 'a.pdf'), new File(['%PDF'], 'b.pdf')];
    const done = repository.uploadDocuments('r1', files);
    const req = http.expectOne(`${BASE}/upload-document`);
    const body = req.request.body as FormData;
    expect(body.get('idSignatureRequest')).toBe('r1');
    expect((body.getAll('files') as File[]).map((file) => file.name)).toEqual(['a.pdf', 'b.pdf']);
    req.flush(OK);
    await done;
  });

  it('sends the follower id with the capitalised key expected by add-follower', async () => {
    const done = repository.addFollower('r1', { email: 'f@example.com', phone: '+33600000000' });
    const req = http.expectOne(`${BASE}/add-follower`);
    expect(req.request.body).toEqual({
      IdSignatureRequest: 'r1',
      email: 'f@example.com',
      phone: '+33600000000',
    });
    req.flush(OK);
    await done;
  });

  it('removes with a DELETE carrying a body', async () => {
    const done = repository.removeDocuments('r1', ['d1']);
    const req = http.expectOne(`${BASE}/remove-document`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ idSignatureRequest: 'r1', idDocuments: ['d1'] });
    req.flush(OK);
    await done;
  });

  it('places a field from a PDF tag', async () => {
    const done = repository.addField('r1', { signerId: 's1', documentId: 'd1', tag: 's2' });
    const req = http.expectOne(`${BASE}/add-field`);
    expect(req.request.body).toEqual({
      idSignatureRequest: 'r1',
      idSigner: 's1',
      tag: 's2',
      documentReference: 'd1',
    });
    req.flush(OK);
    await done;
  });

  it('sends an empty first name as null when adding a signer', async () => {
    const done = repository.addSigner('r1', {
      firstName: '',
      lastName: 'Doe',
      email: 'd@example.com',
      phone: '+33600000000',
    });
    const req = http.expectOne(`${BASE}/add-signer`);
    expect(req.request.body.firstname).toBeNull();
    req.flush(OK);
    await done;
  });

  it('maps the presigned document links', async () => {
    const links = repository.documentLinks('r 1');
    http.expectOne(`${BASE}/r%201/documents`).flush({
      ...OK,
      data: {
        idRequest: 'r 1',
        documents: [
          {
            idDocument: 'd1',
            downloadUrl: 'https://s3/a',
            downloadUrlSignedFile: null,
          },
        ],
      },
    });

    expect(await links).toEqual([{ documentId: 'd1', url: 'https://s3/a', signedUrl: undefined }]);
  });

  it('submits and cancels', async () => {
    const submitted = repository.submit('r1');
    const submit = http.expectOne(`${BASE}/submit-request`);
    expect(submit.request.method).toBe('PATCH');
    expect(submit.request.body).toEqual({ idSignatureRequest: 'r1', canReceiveSigningLink: true });
    submit.flush(OK);
    await submitted;

    const cancelled = repository.cancel('r1');
    http.expectOne({ method: 'PATCH', url: `${BASE}/r1/cancel-request` }).flush(OK);
    await cancelled;
  });

  it('archives and unarchives', async () => {
    const archived = repository.archive('r1');
    http.expectOne({ method: 'DELETE', url: `${BASE}/r1/archive-request` }).flush(OK);
    await archived;

    const unarchived = repository.unarchive('r1');
    http.expectOne({ method: 'PATCH', url: `${BASE}/r1/unarchive-request` }).flush(OK);
    await unarchived;
  });
});
