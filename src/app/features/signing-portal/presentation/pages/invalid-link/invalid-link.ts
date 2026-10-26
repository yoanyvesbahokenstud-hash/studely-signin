import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '@shared/ui/empty-state/empty-state';

/** Lien de signature tronqué ou mal formé. */
@Component({
  selector: 'sts-invalid-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState],
  template: `
    <main class="page">
      <sts-empty-state
        icon="x-circle"
        title="Lien de signature invalide"
        hint="Vérifiez que vous avez bien copié l'intégralité du lien reçu par e-mail."
      />
    </main>
  `,
  styles: `
    .page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
    }
  `,
})
export class InvalidLink {}
