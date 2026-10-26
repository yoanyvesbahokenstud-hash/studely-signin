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

  function answerSignIn(body: object): void {
    TestBed.inject(HttpTestingController).expectOne('/auth/account/signIn').flush(body);
  }

  it('opens a session with the id_token of a back-office user', async () => {
    const session = TestBed.inject(AviAuthSession);
    const token = fakeIdToken({
      email: 'admin@studely.com',
      'custom:authorities': 'ROLE_GATEKEEPER_ADMIN',
      exp: inOneHour(),
    });

    const signIn = session.signIn('admin@studely.com', 'secret');
    answerSignIn({ authentication_result: { id_token: token } });
    await signIn;

    expect(session.isAuthenticated()).toBe(true);
    expect(session.user()?.email).toBe('admin@studely.com');
    expect(await session.accessToken()).toBe(token);
  });

  it('refuses a user without back-office role', async () => {
    const session = TestBed.inject(AviAuthSession);
    const token = fakeIdToken({ 'custom:authorities': 'ROLE_STUDENT', exp: inOneHour() });

    const signIn = session.signIn('student@studely.com', 'secret');
    answerSignIn({ authentication_result: { id_token: token } });

    await expect(signIn).rejects.toMatchObject({ code: 'MISSING_BACK_OFFICE_ROLE' });
    expect(session.isAuthenticated()).toBe(false);
  });

  it('refuses an answer without id_token (e.g. a Cognito challenge)', async () => {
    const session = TestBed.inject(AviAuthSession);

    const signIn = session.signIn('admin@studely.com', 'secret');
    answerSignIn({ challenge_name: 'NEW_PASSWORD_REQUIRED' });

    await expect(signIn).rejects.toBeInstanceOf(AppError);
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
      const signIn = session.signIn('admin@studely.com', 'secret');
      answerSignIn({ authentication_result: { id_token: token } });
      await signIn;

      vi.advanceTimersByTime(61_000);

      expect(session.isAuthenticated()).toBe(false);
      expect(await session.accessToken()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
