import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'sts-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span class="empty-state__icon"><sts-icon [name]="icon()" [size]="22" /></span>
    <p class="empty-state__title">{{ title() }}</p>
    @if (hint()) {
      <p class="empty-state__hint">{{ hint() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-state__icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: 6px;
      border-radius: 50%;
      background: var(--primary-soft);
      color: var(--primary);
    }
    .empty-state__title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-strong);
    }
    .empty-state__hint {
      margin: 0;
      font-size: 0.85rem;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly hint = input<string>();
  readonly icon = input<IconName>('file-text');
}
