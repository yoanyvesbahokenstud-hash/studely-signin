import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { AppError } from '@shared/domain/app-error';
import { AviAuthSession } from './avi-auth-session';
import { fakeIdToken } from './jwt.spec';

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe('AviAuthSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AviAuthSession,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { authBaseUrl: '/auth', apiBaseUrl: '/api', useMocks: false },
        },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  const challenge = {
    challenge_name: 'EMAIL_OTP',
    session: 'cognito-session',
    challenge_parameters: {
      USER_ID_FOR_SRP: 'user-1',
      CODE_DELIVERY_DESTINATION: 'a***@studely.com',
    },
  };

  /** Ouvre une session : signIn (challenge OTP) puis confirmSignIn, qui répond `confirmBody`. */
  async function signInWithCode(session: AviAuthSession, confirmBody: object): Promise<void> {
    const http = TestBed.inject(HttpTestingController);
    const started = session.signIn('admin@studely.com', 'secret');
    http.expectOne('/auth/account/signIn').flush(challenge);
    const pending = session.confirmSignIn(await started, '123456');
    http.expectOne('/auth/account/confirmSignIn').flush(confirmBody);
    await pending;
  }

  it('opens a session with the id_token of a back-office user', async () => {
    const session = TestBed.inject(AviAuthSession);
    const token = fakeIdToken({
      email: 'admin@studely.com',
      'custom:authorities': 'ROLE_GATEKEEPER_ADMIN',
      exp: inOneHour(),
    });

    await signInWithCode(session, { authentication_result: { id_token: token } });

    expect(session.isAuthenticated()).toBe(true);
    expect(session.user()?.email).toBe('admin@studely.com');
    expect(await session.accessToken()).toBe(token);
  });

  it('refuses a user without back-office role', async () => {
    const session = TestBed.inject(AviAuthSession);
    const token = fakeIdToken({ 'custom:authorities': 'ROLE_STUDENT', exp: inOneHour() });

    await expect(
      signInWithCode(session, { authentication_result: { id_token: token } }),
    ).rejects.toMatchObject({ code: 'MISSING_BACK_OFFICE_ROLE' });
    expect(session.isAuthenticated()).toBe(false);
  });

  it('sends the OTP challenge back with the code', async () => {
    const session = TestBed.inject(AviAuthSession);
    const http = TestBed.inject(HttpTestingController);

    const started = session.signIn('admin@studely.com', 'secret');
    const signInRequest = http.expectOne('/auth/account/signIn');
    expect(signInRequest.request.body).toMatchObject({
      email: 'admin@studely.com',
      password: 'secret',
    });
    signInRequest.flush(challenge);
    const issued = await started;

    expect(issued.destination).toBe('a***@studely.com');
    expect(session.isAuthenticated()).toBe(false);

    void session.confirmSignIn(issued, '123456').catch(() => undefined);
    const confirm = http.expectOne('/auth/account/confirmSignIn');
    expect(confirm.request.body).toEqual({
      user_id: 'user-1',
      session_id: 'cognito-session',
      challenge_name: 'EMAIL_OTP',
      code: '123456',
    });
    confirm.flush({});
  });

  it('refuses a sign-in answer without challenge', async () => {
    const session = TestBed.inject(AviAuthSession);

    const signIn = session.signIn('admin@studely.com', 'secret');
    TestBed.inject(HttpTestingController).expectOne('/auth/account/signIn').flush({});

    await expect(signIn).rejects.toBeInstanceOf(AppError);
  });

  it('refuses a confirmation answer without id_token', async () => {
    const session = TestBed.inject(AviAuthSession);

    await expect(signInWithCode(session, { authentication_result: {} })).rejects.toBeInstanceOf(
      AppError,
    );
    expect(session.isAuthenticated()).toBe(false);
  });

  it('restores a valid session from the tab storage, and drops an expired one', () => {
    sessionStorage.setItem(
      'sts.session',
      fakeIdToken({ 'custom:authorities': 'ROLE_STUDELY_CLIENT', exp: inOneHour() }),
    );
    expect(TestBed.inject(AviAuthSession).isAuthenticated()).toBe(true);

    TestBed.resetTestingModule();
    sessionStorage.setItem(
      'sts.session',
      fakeIdToken({ 'custom:authorities': 'ROLE_STUDELY_CLIENT', exp: 1 }),
    );
    TestBed.configureTestingModule({
      providers: [
        AviAuthSession,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { authBaseUrl: '/auth', apiBaseUrl: '/api', useMocks: false },
        },
      ],
    });
    expect(TestBed.inject(AviAuthSession).isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('sts.session')).toBeNull();
  });

  it('closes the session when the token expires', async () => {
    vi.useFakeTimers();
    try {
      const session = TestBed.inject(AviAuthSession);
      const token = fakeIdToken({
        'custom:authorities': 'ROLE_GATEKEEPER_ADMIN',
        exp: Math.floor(Date.now() / 1000) + 60,
      });
      await signInWithCode(session, { authentication_result: { id_token: token } });

      vi.advanceTimersByTime(61_000);

      expect(session.isAuthenticated()).toBe(false);
      expect(await session.accessToken()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
