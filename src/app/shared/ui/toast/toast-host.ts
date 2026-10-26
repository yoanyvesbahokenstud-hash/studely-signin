import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { ToastService, ToastType } from './toast.service';

const ICONS: Record<ToastType, IconName> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

@Component({
  selector: 'sts-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toast-host" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [attr.data-type]="toast.type" role="status">
          <sts-icon class="ico" [name]="icons[toast.type]" />
          <div class="body">
            <span class="title">{{ toast.title }}</span>
            @if (toast.message) {
              <span class="msg">{{ toast.message }}</span>
            }
          </div>
          <button
            type="button"
            class="close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Fermer"
          >
            <sts-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-host {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 200;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      width: 360px;
      max-width: calc(100vw - 32px);
    }
    .toast {
      --c: var(--primary);
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: var(--surface-0);
      border: 1px solid var(--border);
      border-left: 3px solid var(--c);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      animation: slide 0.16s ease;
    }
    .toast[data-type='success'] {
      --c: var(--success);
    }
    .toast[data-type='error'] {
      --c: var(--danger);
    }
    .toast[data-type='warning'] {
      --c: var(--warning);
    }
    .ico {
      color: var(--c);
      padding-top: 1px;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-strong);
    }
    .msg {
      font-size: 0.8rem;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .close {
      border: none;
      background: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      height: fit-content;
    }
    @keyframes slide {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = ICONS;
}
