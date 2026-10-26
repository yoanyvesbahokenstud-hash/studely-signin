import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger';

/** Pastille de statut : point coloré + libellé sur fond teinté. */
@Component({
  selector: 'sts-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
  template: `<i class="dot"></i><ng-content />`,
  styles: `
    :host {
      --c: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 12%, transparent);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--c);
    }
    :host([data-tone='info']) {
      --c: var(--primary);
    }
    :host([data-tone='accent']) {
      --c: var(--accent);
    }
    :host([data-tone='success']) {
      --c: var(--success);
    }
    :host([data-tone='warning']) {
      --c: var(--warning);
    }
    :host([data-tone='danger']) {
      --c: var(--danger);
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
}
