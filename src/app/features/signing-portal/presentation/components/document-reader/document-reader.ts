import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { PdfPages, PdfSource } from '@shared/ui/pdf-pages/pdf-pages';

/** Marge en pixels sous laquelle on considère le bas du document atteint (arrondis du navigateur). */
const END_TOLERANCE = 8;

/**
 * Lecture obligatoire avant signature : tous les documents s'affichent à la suite, et
 * l'acceptation n'est possible qu'une fois le défilement arrivé tout en bas.
 */
@Component({
  selector: 'sts-document-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, PdfPages],
  template: `
    <sts-modal title="Lecture des documents" [wide]="true" (dismiss)="dismiss.emit()">
      @if (failed()) {
        <div class="callout danger" role="alert">
          <sts-icon name="alert-triangle" />
          <p>
            Impossible d'afficher les documents. Réessayez ; si le problème persiste, les liens ont
            peut-être expiré : rechargez la page.
          </p>
        </div>
        <button type="button" class="btn-ghost" (click)="retry()">
          <sts-icon name="rotate-ccw" [size]="15" /> Réessayer
        </button>
      } @else {
        <div
          class="progress"
          role="progressbar"
          aria-label="Lecture"
          [attr.aria-valuenow]="percent()"
        >
          <span [style.width.%]="percent()"></span>
        </div>
        <div #viewer class="viewer" tabindex="0" (scroll)="track(viewer)">
          <sts-pdf-pages
            [sources]="sources()"
            (rendered)="onRendered(viewer)"
            (failed)="failed.set(true)"
          />
        </div>
      }

      <div footer class="foot">
        <label class="consent" [class.locked]="!reachedEnd()">
          <input
            type="checkbox"
            [checked]="checked()"
            [disabled]="!reachedEnd()"
            (change)="checked.set($any($event.target).checked)"
          />
          <span>
            @if (reachedEnd()) {
              J'ai lu les documents et j'accepte de les signer électroniquement.
            } @else {
              Faites défiler les documents jusqu'à la fin pour pouvoir les accepter.
            }
          </span>
        </label>
        <button
          type="button"
          class="btn-primary"
          [disabled]="!reachedEnd() || !checked()"
          (click)="accepted.emit()"
        >
          Valider
        </button>
      </div>
    </sts-modal>
  `,
  styles: `
    .viewer {
      height: max(240px, calc(90vh - 240px));
      overflow-y: auto;
      padding: var(--space-3);
      background: var(--surface-1);
      border-radius: var(--radius-md);
    }
    .viewer:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }
    .progress {
      height: 4px;
      margin-bottom: var(--space-3);
      border-radius: 2px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .progress span {
      display: block;
      height: 100%;
      background: var(--primary);
      transition: width 0.15s ease;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      width: 100%;
    }
    .consent {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      font-size: 0.875rem;
      cursor: pointer;
    }
    .consent.locked {
      color: var(--text-muted);
      cursor: not-allowed;
    }
  `,
})
export class DocumentReader {
  readonly urls = input.required<string[]>();
  readonly accepted = output<void>();
  readonly dismiss = output<void>();

  /** Recréé à chaque nouvel essai, pour relancer le rendu. */
  private readonly attempt = signal(0);
  protected readonly sources = computed<PdfSource[]>(() => {
    this.attempt();
    return this.urls().map((url, index) => ({ title: `Document ${index + 1}`, url }));
  });

  protected readonly failed = signal(false);
  protected readonly checked = signal(false);
  private readonly rendered = signal(false);
  private readonly progress = signal(0);

  protected readonly percent = computed(() => Math.round(this.progress() * 100));
  /** Le bas n'est validé qu'une fois toutes les pages dessinées : avant, la hauteur grandit encore. */
  protected readonly reachedEnd = computed(() => this.rendered() && this.progress() >= 1);

  protected onRendered(viewer: HTMLElement): void {
    this.rendered.set(true);
    this.track(viewer);
  }

  protected track(viewer: HTMLElement): void {
    const scrollable = viewer.scrollHeight - viewer.clientHeight;
    const progress =
      scrollable <= END_TOLERANCE
        ? 1
        : Math.min(1, viewer.scrollTop / (scrollable - END_TOLERANCE));
    // On ne revient pas en arrière : remonter relire ne fait pas perdre la lecture complète.
    this.progress.update((current) => (this.rendered() ? Math.max(current, progress) : 0));
  }

  protected retry(): void {
    this.failed.set(false);
    this.rendered.set(false);
    this.progress.set(0);
    this.attempt.update((value) => value + 1);
  }
}
