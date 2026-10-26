import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'sts.theme';

/** Thème clair / sombre. Le thème initial est posé par le script inline d'`index.html`. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly modeState = signal<ThemeMode>(
    this.root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );

  readonly mode = this.modeState.asReadonly();

  isDark(): boolean {
    return this.modeState() === 'dark';
  }

  toggle(): void {
    const next: ThemeMode = this.isDark() ? 'light' : 'dark';
    this.modeState.set(next);
    this.root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste valable pour la session.
    }
  }
}
