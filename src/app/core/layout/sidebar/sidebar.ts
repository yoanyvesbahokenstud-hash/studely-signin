import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthSession } from '@core/auth/auth-session';
import { roleLabel } from '@core/auth/auth-user';
import { Icon } from '@shared/ui/icon/icon';
import { LayoutStore } from '../layout.store';
import { NAVIGATION } from '../navigation';
import { ThemeStore } from '../theme.store';

@Component({
  selector: 'sts-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon],
  host: { '[class.collapsed]': 'layout.collapsed()' },
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly layout = inject(LayoutStore);
  protected readonly theme = inject(ThemeStore);
  protected readonly groups = NAVIGATION;
  private readonly session = inject(AuthSession);

  protected readonly email = computed(() => this.session.user()?.email ?? '');
  protected readonly role = computed(() => {
    const user = this.session.user();
    return user ? roleLabel(user) : '';
  });
  protected readonly initials = computed(() => {
    const local = this.email().split('@')[0] ?? '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase() || '?';
  });

  protected signOut(): void {
    void this.session.signOut();
  }
}
