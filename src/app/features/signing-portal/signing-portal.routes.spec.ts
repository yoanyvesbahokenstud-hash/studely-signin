import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { APP_CONFIG } from '@core/config/app-config';
import { MOCK_OTP } from './infrastructure/in-memory/in-memory-signer-portal.repository';
import { SIGNING_PORTAL_ROUTES } from './signing-portal.routes';
import { DocumentReader } from './presentation/components/document-reader/document-reader';

describe('signing portal feature', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'sign', children: SIGNING_PORTAL_ROUTES }],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        {
          provide: APP_CONFIG,
          useValue: { production: false, apiBaseUrl: '', authBaseUrl: '', useMocks: true },
        },
      ],
    });
  });

  async function settle(harness: RouterTestingHarness): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function type(page: HTMLElement, selector: string, value: string): void {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function findButton(page: HTMLElement, label: string): HTMLButtonElement {
    return [...page.querySelectorAll('button')].find((button) =>
      button.textContent?.includes(label),
    )!;
  }

  async function submit(harness: RouterTestingHarness): Promise<void> {
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle(harness);
  }

  it('lets the last signer sign, from sign-in to the signed documents', async () => {
    const harness = await RouterTestingHarness.create('/sign/req-2/s-2');
    await settle(harness);
    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain('Connectez-vous avec votre compte Studely');

    type(page, '#signin-email', 'noah.bernard@example.com');
    type(page, '#signin-password', 'secret');
    await submit(harness);
    expect(page.textContent).toContain('Confirmez votre identité');
    // L'e-mail du compte est proposé par défaut.
    expect(page.querySelector<HTMLInputElement>('#verify-email')!.value).toBe(
      'noah.bernard@example.com',
    );

    await submit(harness);
    expect(page.textContent).toContain('Lisez les documents');

    // Sans lecture ni acceptation, pas de code.
    await submit(harness);
    expect(page.textContent).toContain("Lisez les documents jusqu'à la fin et acceptez-les.");

    // L'acceptation passe par la modale de lecture, verrouillée tant que le bas n'est pas atteint.
    findButton(page, 'Lire et accepter les documents').click();
    await settle(harness);
    expect(findButton(page, 'Valider').disabled).toBe(true);
    harness.fixture.debugElement
      .query(By.directive(DocumentReader))
      .componentInstance.accepted.emit();
    await settle(harness);
    expect(page.textContent).toContain('Documents lus et acceptés.');

    await submit(harness);
    expect(page.textContent).toContain('Un code vous a été envoyé par e-mail');

    type(page, '#otp-code', '000000');
    await submit(harness);
    expect(page.textContent).toContain('Code incorrect');

    type(page, '#otp-code', MOCK_OTP);
    await submit(harness);
    expect(page.textContent).toContain('Tous les signataires ont signé');
    expect(page.textContent).toContain('Document signé 1');
  });

  it('refuses an email that does not match the signer', async () => {
    const harness = await RouterTestingHarness.create('/sign/req-2/s-2');
    await settle(harness);
    const page = harness.routeNativeElement!;
    type(page, '#signin-email', 'someone@example.com');
    type(page, '#signin-password', 'secret');
    await submit(harness);

    await submit(harness);

    expect(page.textContent).toContain('ne correspond pas à celle du signataire');
  });

  it('explains that the link is invalid', async () => {
    const harness = await RouterTestingHarness.create('/sign/unknown/s-1');
    await settle(harness);
    const page = harness.routeNativeElement!;
    type(page, '#signin-email', 'noah.bernard@example.com');
    type(page, '#signin-password', 'secret');
    await submit(harness);

    await submit(harness);

    expect(page.textContent).toContain('Lien invalide');
  });

  it('handles a truncated link', async () => {
    const harness = await RouterTestingHarness.create('/sign/req-2');
    await settle(harness);

    expect(harness.routeNativeElement?.textContent).toContain('Lien de signature invalide');
  });
});
