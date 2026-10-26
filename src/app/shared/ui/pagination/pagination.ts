import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

type PageItem = number | '…';

/**
 * Pagination à pastilles numérotées + choix du nombre d'éléments par page.
 * `page` est indexé à partir de 0, comme l'API.
 */
@Component({
  selector: 'sts-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (total() > 0) {
      <div class="pagination">
        <div class="left">
          <span class="info">
            Page {{ page() + 1 }} sur {{ totalPages() }} · {{ total() }} élément(s)
          </span>
          <label class="size-select">
            Afficher
            <select [value]="pageSize()" (change)="onSizeChange($event)">
              @for (n of pageSizeOptions(); track n) {
                <option [value]="n" [selected]="n === pageSize()">{{ n }}</option>
              }
            </select>
            par page
          </label>
        </div>
        <div class="controls">
          <button
            type="button"
            class="nav"
            (click)="go(page() - 1)"
            [disabled]="page() <= 0"
            aria-label="Page précédente"
          >
            <sts-icon name="chevron-left" [size]="16" />
          </button>
          @for (item of pageItems(); track $index) {
            @if (item === '…') {
              <span class="ellipsis">…</span>
            } @else {
              <button
                type="button"
                class="num"
                [class.active]="item === page() + 1"
                [attr.aria-current]="item === page() + 1 ? 'page' : null"
                (click)="go(item - 1)"
              >
                {{ item }}
              </button>
            }
          }
          <button
            type="button"
            class="nav"
            (click)="go(page() + 1)"
            [disabled]="page() >= totalPages() - 1"
            aria-label="Page suivante"
          >
            <sts-icon name="chevron-right" [size]="16" />
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--border);
    }
    .left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }
    .info,
    .size-select {
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .size-select {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .size-select select {
      padding: 4px 8px;
      font-size: 0.8rem;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nav,
    .num {
      display: grid;
      place-items: center;
      min-width: 32px;
      height: 32px;
      padding: 0 4px;
      border: 1px solid var(--border);
      background: var(--surface-0);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text);
      font: inherit;
      font-size: 0.82rem;
    }
    .nav:hover:not(:disabled),
    .num:hover:not(.active) {
      background: var(--surface-1);
    }
    .nav:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .num.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      font-weight: 600;
    }
    .ellipsis {
      color: var(--text-muted);
      padding: 0 2px;
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input(0);
  readonly pageSize = input(20);
  readonly pageSizeOptions = input<number[]>([10, 20, 50, 100]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  /** Fenêtre 1 … p-1 p p+1 … n, condensée au-delà de 7 pages. */
  protected readonly pageItems = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page() + 1;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const items: PageItem[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) items.push('…');
      items.push(p);
    });
    return items;
  });

  protected go(page: number): void {
    if (page >= 0 && page < this.totalPages()) this.pageChange.emit(page);
  }

  protected onSizeChange(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
