import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { PdfPages, PdfSource } from '@shared/ui/pdf-pages/pdf-pages';

/** Aperçu d'un document de la demande (original ou version signée), sans quitter la fiche. */
@Component({
  selector: 'sts-document-preview-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, PdfPages],
  template: `
    <sts-modal [title]="title()" [wide]="true" (dismiss)="dismiss.emit()">
      @if (failed()) {
        <div class="callout danger" role="alert">
          <sts-icon name="alert-triangle" />
          <p>Impossible d'afficher le document. Ouvrez-le dans un nouvel onglet.</p>
        </div>
      } @else {
        <div class="viewer" tabindex="0">
          <sts-pdf-pages [sources]="sources()" (failed)="failed.set(true)" />
        </div>
      }
      <ng-container footer>
        <a class="btn-ghost" [href]="url()" target="_blank" rel="noopener">
          <sts-icon name="download" [size]="15" /> Ouvrir dans un onglet
        </a>
        <button type="button" class="btn-primary" (click)="dismiss.emit()">Fermer</button>
      </ng-container>
    </sts-modal>
  `,
  styles: `
    .viewer {
      height: max(240px, calc(90vh - 200px));
      overflow-y: auto;
      padding: var(--space-3);
      background: var(--surface-1);
      border-radius: var(--radius-md);
    }
    .viewer:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }
  `,
})
export class DocumentPreviewDialog {
  readonly title = input.required<string>();
  readonly url = input.required<string>();
  readonly dismiss = output<void>();

  protected readonly failed = signal(false);
  protected readonly sources = computed<PdfSource[]>(() => [
    { title: this.title(), url: this.url() },
  ]);
}
