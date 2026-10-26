import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Modal } from '../modal/modal';

/** Demande de confirmation avant une action irréversible. */
@Component({
  selector: 'sts-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Icon],
  template: `
    <sts-modal [title]="title()" (dismiss)="dismiss.emit()">
      <p class="message">{{ message() }}</p>
      @if (error(); as error) {
        <div class="callout danger" role="alert">
          <sts-icon name="alert-triangle" />
          <p>{{ error }}</p>
        </div>
      }
      <ng-container footer>
        <button type="button" class="btn-ghost" (click)="dismiss.emit()" [disabled]="busy()">
          Annuler
        </button>
        <button
          type="button"
          class="btn-primary"
          [class.danger]="tone() === 'danger'"
          (click)="confirm.emit()"
          [disabled]="busy()"
        >
          @if (busy()) {
            <sts-icon name="loader" class="spin" />
          }
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </sts-modal>
  `,
  styles: `
    .message {
      margin: 0 0 var(--space-3);
      line-height: 1.5;
    }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmer');
  readonly tone = input<'primary' | 'danger'>('primary');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
