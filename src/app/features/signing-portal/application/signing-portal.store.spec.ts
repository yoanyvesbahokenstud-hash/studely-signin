import { TestBed } from '@angular/core/testing';
import { AppError } from '@shared/domain/app-error';
import { SignerPortalRepository } from '../domain/signer-portal.repository';
import { SigningPortalStore } from './signing-portal.store';

const VERIFIED = {
  signerEmail: 'ada@example.com',
  documentUrls: [],
  accessToken: 'access-1',
  accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

describe('SigningPortalStore', () => {
  const repository = { verifyLink: vi.fn(), requestOtp: vi.fn(), sign: vi.fn() };

  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [SigningPortalStore, { provide: SignerPortalRepository, useValue: repository }],
    });
  });

  function startedStore(): SigningPortalStore {
    const store = TestBed.inject(SigningPortalStore);
    store.start({ requestId: 'r1', signerId: 's1' });
    return store;
  }

  it('starts with the email verification, without any account sign-in', () => {
    expect(startedStore().step()).toBe('verify');
  });

  it('keeps the signer on the step when the email does not match', async () => {
    repository.verifyLink.mockRejectedValue(new AppError(400, '400_454', 'mismatch'));
    const store = startedStore();

    expect(await store.verify('other@example.com')).toBe(false);

    expect(store.step()).toBe('verify');
    expect(store.error()?.code).toBe('400_454');
    expect(store.deadEnd()).toBeNull();
  });

  it('ends the journey on a cancelled request', async () => {
    repository.verifyLink.mockRejectedValue(new AppError(400, '400_401', 'not submitted'));
    const store = startedStore();

    await store.verify('ada@example.com');

    expect(store.deadEnd()).toBe('closed');
  });

  it('passes the access token from verify-link to the OTP request and the signature', async () => {
    repository.verifyLink.mockResolvedValue(VERIFIED);
    repository.requestOtp.mockResolvedValue(undefined);
    repository.sign.mockResolvedValue({
      requestName: 'Bail',
      completed: false,
      signedDocumentUrls: [],
    });
    const store = startedStore();
    await store.verify('ada@example.com');
    await store.requestOtp('MAIL', 'fr');

    expect(await store.sign('123456')).toBe(true);

    const link = { requestId: 'r1', signerId: 's1' };
    expect(repository.requestOtp).toHaveBeenCalledWith(link, 'MAIL', 'fr', 'access-1');
    expect(repository.sign).toHaveBeenCalledWith(link, '123456', 'access-1');
    expect(store.step()).toBe('done');
  });

  it('recognises a signer who has already signed', async () => {
    repository.verifyLink.mockResolvedValue(VERIFIED);
    repository.requestOtp.mockResolvedValue(undefined);
    repository.sign.mockRejectedValue(new AppError(400, '400_456', 'status FINISHED'));
    const store = startedStore();
    await store.verify('ada@example.com');
    await store.requestOtp('MAIL', 'fr');

    await store.sign('123456');

    expect(store.deadEnd()).toBe('already-signed');
  });

  it('ends the journey when the request is blocked or expired', async () => {
    repository.verifyLink.mockResolvedValue(VERIFIED);
    repository.requestOtp.mockRejectedValue(new AppError(423, '400_458', 'blocked'));
    const store = startedStore();
    await store.verify('ada@example.com');

    await store.requestOtp('SMS', 'fr');
    expect(store.deadEnd()).toBe('blocked');

    repository.verifyLink.mockRejectedValue(new AppError(400, '400_447', 'expired'));
    store.start({ requestId: 'r1', signerId: 's1' });
    await store.verify('ada@example.com');
    expect(store.deadEnd()).toBe('expired');
  });

  it('sends the signer back to email verification when the access token is refused', async () => {
    repository.verifyLink.mockResolvedValue(VERIFIED);
    repository.requestOtp.mockRejectedValue(new AppError(400, '400_440', 'verification required'));
    const store = startedStore();
    await store.verify('ada@example.com');

    expect(await store.requestOtp('SMS', 'fr')).toBe(false);

    expect(store.step()).toBe('verify');
    expect(store.verified()).toBeNull();
    expect(store.error()?.code).toBe('400_440');
  });

  it('does not call the backend with an access token that has already expired', async () => {
    repository.verifyLink.mockResolvedValue({ ...VERIFIED, accessExpiresAt: new Date(0) });
    const store = startedStore();
    await store.verify('ada@example.com');

    expect(await store.requestOtp('SMS', 'fr')).toBe(false);

    expect(repository.requestOtp).not.toHaveBeenCalled();
    expect(store.step()).toBe('verify');
  });
});
