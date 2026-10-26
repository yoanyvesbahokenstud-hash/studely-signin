import { TestBed } from '@angular/core/testing';
import { AviAuthClient } from '@core/auth/avi-auth-client';
import { AviStudentAuth } from './avi-student-auth';

describe('AviStudentAuth', () => {
  const signIn = vi.fn<AviAuthClient['signIn']>();
  const user = (authorities: string[]) => ({
    email: 'ada@studely.com',
    authorities,
    expiresAt: new Date(Date.now() + 3_600_000),
  });

  beforeEach(() => {
    sessionStorage.clear();
    signIn.mockReset();
    TestBed.configureTestingModule({
      providers: [AviStudentAuth, { provide: AviAuthClient, useValue: { signIn } }],
    });
  });

  it('opens a student session and exposes its id_token for the OTP service', async () => {
    signIn.mockResolvedValue({ token: 'jwt', user: user(['ROLE_STUDENT']) });
    const auth = TestBed.inject(AviStudentAuth);

    await auth.signIn('ada@studely.com', 'secret');

    expect(auth.student()).toEqual({ email: 'ada@studely.com' });
    expect(auth.idToken()).toBe('jwt');
  });

  it('refuses an account without the student role (the OTP service would answer 403)', async () => {
    signIn.mockResolvedValue({ token: 'jwt', user: user(['ROLE_GATEKEEPER_ADMIN']) });
    const auth = TestBed.inject(AviStudentAuth);

    await expect(auth.signIn('admin@studely.com', 'secret')).rejects.toMatchObject({
      code: 'NOT_A_STUDENT',
    });
    expect(auth.idToken()).toBeNull();
  });
});
