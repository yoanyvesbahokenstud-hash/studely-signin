import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthSession } from '@core/auth/auth-session';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

/** Coquille du back-office : menu latéral, barre du haut, contenu. Le portail de signature n'en a pas. */
@Component({
  selector: 'sts-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, Topbar],
  template: `
    <sts-sidebar />
    <div class="main">
      <sts-topbar />
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      height: 100dvh;
      overflow: hidden;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }
    .content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: var(--space-5);
    }
  `,
})
export class Shell {
  constructor() {
    const session = inject(AuthSession);
    const router = inject(Router);
    // Déconnexion, expiration du jeton ou 401 du backend : retour à l'écran de connexion.
    effect(() => {
      if (!session.isAuthenticated()) {
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
    });
  }
}
