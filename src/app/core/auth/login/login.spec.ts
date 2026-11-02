import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppError } from '@shared/domain/app-error';
import { AuthSession, SignInChallenge } from '../auth-session';
import { Login } from './login';

@Component({ template: 'requests' })
class Requests {}

describe('Login', () => {
  const challenge: SignInChallenge = {
    name: 'EMAIL_OTP',
    session: 'cognito-session',
    userId: 'user-1',
    destination: 'a***@studely.com',
  };
  const signIn = vi.fn<(email: string, password: string) => Promise<SignInChallenge>>();
  const confirmSignIn = vi.fn<(challenge: SignInChallenge, code: string) => Promise<void>>();

  beforeEach(() => {
    signIn.mockReset();
    confirmSignIn.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'login', component: Login },
            { path: 'requests/:id', component: Requests },
            { path: '', component: Requests },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: AuthSession,
          useValue: { signIn, confirmSignIn, isAuthenticated: signal(false) },
        },
      ],
    });
  });

  async function fillAndSubmit(harness: RouterTestingHarness): Promise<void> {
    const page = harness.routeNativeElement!;
    const email = page.querySelector<HTMLInputElement>('#email')!;
    const password = page.querySelector<HTMLInputElement>('#password')!;
    email.value = ' admin@studely.com ';
    email.dispatchEvent(new Event('input'));
    password.value = 'secret';
    password.dispatchEvent(new Event('input'));
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function fillAndSubmitCode(harness: RouterTestingHarness, value = '123456'): Promise<void> {
    const page = harness.routeNativeElement!;
    const code = page.querySelector<HTMLInputElement>('#code')!;
    code.value = value;
    code.dispatchEvent(new Event('input'));
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('asks for the e-mailed code, then goes back to the requested page', async () => {
    signIn.mockResolvedValue(challenge);
    confirmSignIn.mockResolvedValue();
    const harness = await RouterTestingHarness.create('/login?returnUrl=%2Frequests%2Fr1');

    await fillAndSubmit(harness);

    expect(signIn).toHaveBeenCalledWith('admin@studely.com', 'secret');
    expect(harness.routeNativeElement?.textContent).toContain('a***@studely.com');

    await fillAndSubmitCode(harness);

    expect(confirmSignIn).toHaveBeenCalledWith(challenge, '123456');
    expect(TestBed.inject(Router).url).toBe('/requests/r1');
  });

  it('ignores a return URL pointing outside the application', async () => {
    signIn.mockResolvedValue(challenge);
    confirmSignIn.mockResolvedValue();
    const harness = await RouterTestingHarness.create('/login?returnUrl=%2F%2Fevil.com');

    await fillAndSubmit(harness);
    await fillAndSubmitCode(harness);

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('explains a rejected login', async () => {
    signIn.mockRejectedValue(new AppError(401, 'HTTP_401', 'Unauthorized'));
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);

    expect(harness.routeNativeElement?.textContent).toContain('E-mail ou mot de passe incorrect.');
  });

  it('explains a rejected code and stays on the code step', async () => {
    signIn.mockResolvedValue(challenge);
    confirmSignIn.mockRejectedValue(new AppError(400, 'HTTP_400', 'CodeMismatch'));
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);
    await fillAndSubmitCode(harness);

    expect(harness.routeNativeElement?.textContent).toContain('Code incorrect ou expiré');
    expect(harness.routeNativeElement?.querySelector('#code')).not.toBeNull();
  });

  it('does not send a code that is not 6 digits', async () => {
    signIn.mockResolvedValue(challenge);
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);
    await fillAndSubmitCode(harness, '12a');

    expect(confirmSignIn).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).toContain('code à 6 chiffres');
  });

  it('explains a missing back-office role', async () => {
    signIn.mockResolvedValue(challenge);
    confirmSignIn.mockRejectedValue(new AppError(403, 'MISSING_BACK_OFFICE_ROLE', 'no role'));
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);
    await fillAndSubmitCode(harness);

    expect(harness.routeNativeElement?.textContent).toContain("n'a pas accès au back-office");
  });

  it('does not call the service when the form is incomplete', async () => {
    const harness = await RouterTestingHarness.create('/login');

    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit'));
    harness.detectChanges();

    expect(signIn).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Saisissez une adresse e-mail valide.',
    );
  });
});
