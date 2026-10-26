import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Fenêtre modale : contenu projeté dans le corps, boutons projetés avec l'attribut `footer`.
 * Le parent l'affiche avec un `@if` et la ferme sur `dismiss` (bouton de fermeture ou Échap).
 */
@Component({
  selector: 'sts-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'dismiss.emit()' },
  template: `
    <div class="backdrop">
      <div
        class="modal"
        [class.wide]="wide()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
      >
        <header class="modal-head">
          <h2>{{ title() }}</h2>
          <button type="button" class="close" (click)="dismiss.emit()" aria-label="Fermer">
            <sts-icon name="x" [size]="20" />
          </button>
        </header>
        <div class="modal-body">
          <ng-content />
        </div>
        <footer class="modal-foot">
          <ng-content select="[footer]" />
        </footer>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(20, 38, 58, 0.35);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
      display: grid;
      place-items: center;
      padding: var(--space-4);
      animation: fade 0.12s ease;
    }
    .modal {
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--surface-0);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      animation: pop 0.14s ease;
    }
    .modal.wide {
      max-width: 880px;
    }
    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border);
    }
    h2 {
      margin: 0;
      font-size: 1.05rem;
    }
    .close {
      display: grid;
      place-items: center;
      border: none;
      background: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-md);
    }
    .close:hover {
      background: var(--surface-1);
      color: var(--text-strong);
    }
    .modal-body {
      padding: var(--space-5);
      overflow-y: auto;
    }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border);
    }
    .modal-foot:empty {
      display: none;
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class Modal {
  readonly title = input('');
  /** Largeur étendue, pour afficher un document. */
  readonly wide = input(false);
  readonly dismiss = output<void>();
}
