import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';
import { LayoutStore } from '../layout.store';

@Component({
  selector: 'sts-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      class="icon-btn"
      (click)="layout.toggleSidebar()"
      [title]="layout.collapsed() ? 'Déplier le menu' : 'Replier le menu'"
      [attr.aria-expanded]="!layout.collapsed()"
    >
      <sts-icon name="menu" />
    </button>
    <span class="title">Back-office signature électronique</span>
  `,
  styles: `
    :host {
      height: 64px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0 var(--space-4);
      background: var(--surface-0);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      z-index: 1;
    }
    .icon-btn {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      background: none;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      cursor: pointer;
    }
    .icon-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .title {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `,
})
export class Topbar {
  protected readonly layout = inject(LayoutStore);
}
