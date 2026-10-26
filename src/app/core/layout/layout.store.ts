import { Injectable, signal } from '@angular/core';

/** État de la coquille back-office (menu replié ou non). */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly collapsedState = signal(false);
  readonly collapsed = this.collapsedState.asReadonly();

  toggleSidebar(): void {
    this.collapsedState.update((collapsed) => !collapsed);
  }
}
