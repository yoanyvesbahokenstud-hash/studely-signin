import { TestBed } from '@angular/core/testing';
import { AppError } from '@shared/domain/app-error';
import { SignerPortalRepository } from '../domain/signer-portal.repository';
import { StudentAuth } from '../domain/student-auth';
import { SigningPortalStore } from './signing-portal.store';

describe('SigningPortalStore', () => {
  const repository = { verifyLink: vi.fn(), requestOtp: vi.fn(), sign: vi.fn() };
  let token: string | null;

  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    token = 'jwt';
    TestBed.configureTestingModule({
      providers: [
        SigningPortalStore,
        { provide: SignerPortalRepository, useValue: repository },
        {
          provide: StudentAuth,
          useValue: {
            student: () => (token ? { email: 'ada@example.com' } : null),
            idToken: () => token,
            signIn: vi.fn(),
            signOut: vi.fn(),
          },
        },
      ],
    });
  });

  function startedStore(): SigningPortalStore {
    const store = TestBed.inject(SigningPortalStore);
    store.start({ requestId: 'r1', signerId: 's1' });
    return store;
  }

  it('skips the sign-in step when a student session is already open', () => {
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

  it('recognises a signer who has already signed', async () => {
    repository.verifyLink.mockResolvedValue({ signerEmail: 'ada@example.com', documentUrls: [] });
    repository.requestOtp.mockResolvedValue(undefined);
    repository.sign.mockRejectedValue(new AppError(500, '500_400', 'status FINISHED'));
    const store = startedStore();
    await store.verify('ada@example.com');
    await store.requestOtp('MAIL', 'fr');

    await store.sign('123456');

    expect(store.deadEnd()).toBe('already-signed');
  });

  it('sends the signer back to sign-in when the student session expired', async () => {
    repository.verifyLink.mockResolvedValue({ signerEmail: 'ada@example.com', documentUrls: [] });
    const store = startedStore();
    await store.verify('ada@example.com');
    token = null;

    expect(await store.requestOtp('SMS', 'fr')).toBe(false);

    expect(repository.requestOtp).not.toHaveBeenCalled();
    expect(store.step()).toBe('sign-in');
    expect(store.error()?.code).toBe('SESSION_EXPIRED');
  });
});
