import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { SIGNATURE_REQUEST_ROUTES } from './signature-requests.routes';

describe('signature requests feature', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'requests', children: SIGNATURE_REQUEST_ROUTES }],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: '', useMocks: true } },
      ],
    });
  });

  async function settle(harness: RouterTestingHarness): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function render(url: string): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create(url);
    await settle(harness);
    return harness;
  }

  function button(harness: RouterTestingHarness, label: string): HTMLButtonElement {
    return [
      ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.page-head button'),
    ].find((candidate) => candidate.textContent?.includes(label))!;
  }

  it('lists the requests from the in-memory adapter when mocks are enabled', async () => {
    const harness = await render('/requests');

    const rows = harness.routeNativeElement?.querySelectorAll('tbody tr') ?? [];
    expect(rows.length).toBe(5);
    expect(harness.routeNativeElement?.textContent).toContain('Contrat de garantie');
  });

  it('shows the detail of a request', async () => {
    const harness = await render('/requests/req-2');

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Contrat de garantie');
    expect(text).toContain('Camille Martin');
    expect(text).toContain('conseiller@studely.com');
  });

  it('asks for the name before creating the request', async () => {
    const harness = await render('/requests');
    const page = harness.routeNativeElement!;

    // Ouvrir puis fermer le formulaire ne crée rien.
    button(harness, 'Nouvelle demande').click();
    await settle(harness);
    expect(page.textContent).toContain('Donnez un nom à cette demande');
    page.querySelector<HTMLButtonElement>('sts-general-info-dialog .close')!.click();
    await settle(harness);
    expect(page.querySelector('sts-general-info-dialog')).toBeNull();
    expect(page.querySelectorAll('tbody tr').length).toBe(5);
    expect(TestBed.inject(Router).url).toBe('/requests');

    button(harness, 'Nouvelle demande').click();
    await settle(harness);
    const name = page.querySelector<HTMLInputElement>('#request-name')!;
    name.value = 'Bail étudiant - Paris';
    name.dispatchEvent(new Event('input'));
    page.querySelector('form#general-info')!.dispatchEvent(new Event('submit'));
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/requests/req-6');
    const detail = harness.routeNativeElement!;
    expect(detail.querySelector('h1')?.textContent).toContain('Bail étudiant - Paris');
    expect(detail.textContent).toContain('Ajoutez au moins un document.');
  });

  it('only allows submitting a complete draft', async () => {
    const harness = await render('/requests/req-1');

    expect(button(harness, 'Soumettre').disabled).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('Ajoutez au moins un signataire.');
  });

  it('cancels a submitted request after confirmation', async () => {
    const harness = await render('/requests/req-2');
    const page = harness.routeNativeElement!;

    button(harness, 'Annuler la demande').click();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('sts-confirm-dialog .btn-primary')!.click();
    await settle(harness);

    expect(page.querySelector('sts-confirm-dialog')).toBeNull();
    expect(page.querySelector('sts-request-state-badge')?.textContent).toContain('Annulée');
  });

  it('reports an unknown request', async () => {
    const harness = await render('/requests/unknown');

    expect(harness.routeNativeElement?.textContent).toContain('Demande introuvable');
  });
});
