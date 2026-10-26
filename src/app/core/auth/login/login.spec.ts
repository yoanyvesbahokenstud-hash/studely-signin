import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppError } from '@shared/domain/app-error';
import { AuthSession } from '../auth-session';
import { Login } from './login';

@Component({ template: 'requests' })
class Requests {}

describe('Login', () => {
  const signIn = vi.fn<(email: string, password: string) => Promise<void>>();

  beforeEach(() => {
    signIn.mockReset();
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
        { provide: AuthSession, useValue: { signIn, isAuthenticated: signal(false) } },
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

  it('signs in and goes back to the requested page', async () => {
    signIn.mockResolvedValue();
    const harness = await RouterTestingHarness.create('/login?returnUrl=%2Frequests%2Fr1');

    await fillAndSubmit(harness);

    expect(signIn).toHaveBeenCalledWith('admin@studely.com', 'secret');
    expect(TestBed.inject(Router).url).toBe('/requests/r1');
  });

  it('ignores a return URL pointing outside the application', async () => {
    signIn.mockResolvedValue();
    const harness = await RouterTestingHarness.create('/login?returnUrl=%2F%2Fevil.com');

    await fillAndSubmit(harness);

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('explains a rejected login', async () => {
    signIn.mockRejectedValue(new AppError(401, 'HTTP_401', 'Unauthorized'));
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);

    expect(harness.routeNativeElement?.textContent).toContain('E-mail ou mot de passe incorrect.');
  });

  it('explains a missing back-office role', async () => {
    signIn.mockRejectedValue(new AppError(403, 'MISSING_BACK_OFFICE_ROLE', 'no role'));
    const harness = await RouterTestingHarness.create('/login');

    await fillAndSubmit(harness);

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
