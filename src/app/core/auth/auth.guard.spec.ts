import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthSession } from './auth-session';
import { authGuard, guestGuard } from './auth.guard';

@Component({ template: 'page' })
class Page {}

describe('auth guards', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canMatch: [guestGuard], component: Page },
          { path: 'requests/:id', canMatch: [authGuard], component: Page },
          { path: '', canMatch: [authGuard], component: Page },
        ]),
        { provide: AuthSession, useValue: { isAuthenticated: authenticated } },
      ],
    });
  });

  it('sends an anonymous user to the login page, remembering where they were going', async () => {
    await RouterTestingHarness.create('/requests/r1');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Frequests%2Fr1');
  });

  it('lets an authenticated user through, and keeps them away from the login page', async () => {
    authenticated.set(true);
    const harness = await RouterTestingHarness.create('/requests/r1');
    expect(TestBed.inject(Router).url).toBe('/requests/r1');

    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
