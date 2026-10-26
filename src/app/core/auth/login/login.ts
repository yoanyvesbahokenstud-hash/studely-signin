import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeStore } from '@core/layout/theme.store';
import { AppError } from '@shared/domain/app-error';
import { Icon } from '@shared/ui/icon/icon';
import { AuthSession } from '../auth-session';
import { MISSING_ROLE_ERROR_CODE } from '../auth-user';

@Component({
  selector: 'sts-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  /** Page à rouvrir après connexion, lue dans `?returnUrl=` via `withComponentInputBinding()`. */
  readonly returnUrl = input<string>();

  protected readonly theme = inject(ThemeStore);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.session.signIn(email.trim(), password);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.errorMessage.set(toMessage(error));
      this.form.controls.password.reset();
    } finally {
      this.loading.set(false);
    }
  }

  protected togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }
}

/** N'accepte qu'un chemin interne, pour ne pas servir de redirection ouverte. */
function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
    ? url
    : '/';
}

function toMessage(error: unknown): string {
  if (!AppError.isAppError(error)) {
    return 'Connexion impossible. Réessayez dans un instant.';
  }
  if (error.code === MISSING_ROLE_ERROR_CODE) {
    return "Votre compte n'a pas accès au back-office de signature.";
  }
  if (error.status === 0) {
    return 'Le service de connexion est injoignable. Vérifiez votre réseau.';
  }
  if ([400, 401, 403, 404].includes(error.status)) {
    return 'E-mail ou mot de passe incorrect.';
  }
  return `Connexion impossible (${error.code}).`;
}
