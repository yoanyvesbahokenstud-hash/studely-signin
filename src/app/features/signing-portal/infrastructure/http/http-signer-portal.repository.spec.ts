import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { HttpSignerPortalRepository } from './http-signer-portal.repository';

const LINK = { requestId: 'r1', signerId: 's1' };

/** Contrat avec `/api/v1/signer/**` tel que décrit dans le Swagger. */
describe('HttpSignerPortalRepository', () => {
  let repository: HttpSignerPortalRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpSignerPortalRepository,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBaseUrl: '/api', authBaseUrl: '/auth', useMocks: false },
        },
      ],
    });
    repository = TestBed.inject(HttpSignerPortalRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('verifies the link with the provided email', async () => {
    const verified = repository.verifyLink(LINK, 'ada@example.com');
    const req = http.expectOne('/api/signer/verify-link');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body).toEqual({
      idSignatureRequest: 'r1',
      idSigner: 's1',
      providedEmail: 'ada@example.com',
    });
    req.flush({
      status: 200,
      data: {
        idSignatureRequest: 'r1',
        idSigner: 's1',
        email: 'ada@example.com',
        verified: true,
        documentUrls: ['https://s3/doc'],
        accessToken: 'access-1',
        accessExpiresAt: '2026-10-26T12:00:00Z',
      },
    });

    expect(await verified).toEqual({
      signerEmail: 'ada@example.com',
      documentUrls: ['https://s3/doc'],
      accessToken: 'access-1',
      accessExpiresAt: new Date('2026-10-26T12:00:00Z'),
    });
  });

  it('requests the OTP with the access token header, without the student token', async () => {
    const requested = repository.requestOtp(LINK, 'SMS', 'fr', 'access-1');
    const req = http.expectOne('/api/signer/signing-otp');
    expect(req.request.headers.get('X-Signing-Access-Token')).toBe('access-1');
    expect(req.request.body).toEqual({
      idSignatureRequest: 'r1',
      idSigner: 's1',
      lang: 'fr',
      otpMode: 'SMS',
    });
    req.flush({ status: 200, data: {} });
    await requested;
  });

  it('signs with the access token header and the backend key name idRequest', async () => {
    const signed = repository.sign(LINK, '123456', 'access-1');
    const req = http.expectOne('/api/signer/execute-signing');
    expect(req.request.headers.get('X-Signing-Access-Token')).toBe('access-1');
    expect(req.request.body).toEqual({
      idRequest: 'r1',
      idSigner: 's1',
      providedOtp: '123456',
    });
    req.flush({
      status: 200,
      data: {
        idRequestName: 'r1',
        signatureRequestInfos: { requestName: 'Bail', requestState: 'SIGNED' },
        signedFilesDownloadUrls: ['https://s3/signed'],
      },
    });

    expect(await signed).toEqual({
      requestName: 'Bail',
      completed: true,
      signedDocumentUrls: ['https://s3/signed'],
    });
  });
});
