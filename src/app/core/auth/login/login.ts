import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeStore } from '@core/layout/theme.store';
import { AppError } from '@shared/domain/app-error';
import { Icon } from '@shared/ui/icon/icon';
import { AuthSession, SignInChallenge } from '../auth-session';
import { MISSING_ROLE_ERROR_CODE } from '../auth-user';

/**
 * Connexion en deux étapes : identifiants, puis code à usage unique reçu par e-mail.
 * Le mot de passe est gardé dans le formulaire jusqu'à la fin, pour pouvoir renvoyer un code.
 */
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
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  /** Challenge en cours : présent, l'écran demande le code reçu par e-mail. */
  protected readonly challenge = signal<SignInChallenge | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    await this.run(() => this.requestCode(), toCredentialsMessage);
    if (!this.challenge()) {
      this.form.controls.password.reset();
    }
  }

  protected async submitCode(): Promise<void> {
    const challenge = this.challenge();
    if (!challenge || this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    await this.run(async () => {
      await this.session.confirmSignIn(challenge, this.codeForm.controls.code.value.trim());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    }, toCodeMessage);
    this.codeForm.reset();
  }

  /** Relance la première étape : un nouveau code (et une nouvelle session Cognito) est émis. */
  protected async resendCode(): Promise<void> {
    await this.run(async () => {
      await this.requestCode();
      this.infoMessage.set('Un nouveau code vient de vous être envoyé.');
    }, toCredentialsMessage);
  }

  protected backToCredentials(): void {
    this.challenge.set(null);
    this.codeForm.reset();
    this.form.controls.password.reset();
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  protected togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  private async requestCode(): Promise<void> {
    const { email, password } = this.form.getRawValue();
    this.challenge.set(await this.session.signIn(email.trim(), password));
    this.codeForm.reset();
  }

  private async run(action: () => Promise<void>, toMessage: (error: unknown) => string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    try {
      await action();
    } catch (error) {
      this.errorMessage.set(toMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

/** N'accepte qu'un chemin interne, pour ne pas servir de redirection ouverte. */
function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
    ? url
    : '/';
}

function toCredentialsMessage(error: unknown): string {
  return toMessage(error, 'E-mail ou mot de passe incorrect.');
}

function toCodeMessage(error: unknown): string {
  return toMessage(error, 'Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.');
}

function toMessage(error: unknown, rejectedMessage: string): string {
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
    return rejectedMessage;
  }
  return `Connexion impossible (${error.code}).`;
}
