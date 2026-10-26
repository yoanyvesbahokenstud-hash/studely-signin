import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  /** Durée d'affichage en ms ; 0 = reste affiché jusqu'à fermeture. */
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsState = signal<Toast[]>([]);
  readonly toasts = this.toastsState.asReadonly();
  private sequence = 0;

  show(toast: Omit<Toast, 'id'>): number {
    const id = ++this.sequence;
    this.toastsState.update((list) => [...list, { ...toast, id }]);
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(title: string, message?: string): number {
    return this.show({ type: 'success', title, message });
  }

  error(title: string, message?: string): number {
    return this.show({ type: 'error', title, message, duration: 8000 });
  }

  dismiss(id: number): void {
    this.toastsState.update((list) => list.filter((toast) => toast.id !== id));
  }
}
