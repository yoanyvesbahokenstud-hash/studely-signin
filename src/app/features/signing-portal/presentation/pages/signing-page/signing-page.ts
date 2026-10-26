import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeStore } from '@core/layout/theme.store';
import { Icon } from '@shared/ui/icon/icon';
import { SigningPortalStore } from '../../../application/signing-portal.store';
import { DocumentReader } from '../../components/document-reader/document-reader';
import { OtpChannel, SigningStep } from '../../../domain/signing';
import { signingErrorMessage } from '../../error-messages';

const LANG = 'fr';

const STEPS: { step: SigningStep; label: string }[] = [
  { step: 'sign-in', label: 'Connexion' },
  { step: 'verify', label: 'Vérification' },
  { step: 'review', label: 'Documents' },
  { step: 'otp', label: 'Signature' },
];

@Component({
  selector: 'sts-signing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon, DocumentReader],
  providers: [SigningPortalStore],
  templateUrl: './signing-page.html',
  styleUrl: './signing-page.scss',
})
export class SigningPage {
  /** Paramètres du lien envoyé par e-mail : `/sign/:requestId/:signerId`. */
  readonly requestId = input.required<string>();
  readonly signerId = input.required<string>();

  protected readonly store = inject(SigningPortalStore);
  protected readonly theme = inject(ThemeStore);
  protected readonly steps = STEPS;

  protected readonly errorMessage = computed(() => {
    const error = this.store.error();
    return error ? signingErrorMessage(error) : null;
  });

  protected readonly documentUrls = computed(() => this.store.verified()?.documentUrls ?? []);
  /** La modale de lecture : seule façon de cocher l'acceptation. */
  protected readonly readerOpen = signal(false);

  protected readonly stepIndex = computed(() =>
    STEPS.findIndex((candidate) => candidate.step === this.store.step()),
  );

  private readonly forms = inject(FormBuilder).nonNullable;
  protected readonly signInForm = this.forms.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly verifyForm = this.forms.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly reviewForm = this.forms.group({
    accepted: [false, Validators.requiredTrue],
    channel: ['MAIL' as OtpChannel, Validators.required],
  });
  protected readonly otpForm = this.forms.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{4,8}$/)]],
  });

  constructor() {
    effect(() => {
      const link = { requestId: this.requestId(), signerId: this.signerId() };
      untracked(() => {
        this.store.start(link);
        this.prefillEmail();
      });
    });
  }

  protected async signIn(): Promise<void> {
    if (this.invalid(this.signInForm)) return;
    const { email, password } = this.signInForm.getRawValue();
    if (await this.store.signIn(email.trim(), password)) {
      this.prefillEmail();
    }
    this.signInForm.controls.password.reset();
  }

  protected signOut(): void {
    this.store.signOut();
    this.signInForm.reset();
  }

  protected verify(): void {
    if (this.invalid(this.verifyForm)) return;
    void this.store.verify(this.verifyForm.getRawValue().email.trim());
  }

  protected requestOtp(): void {
    if (this.invalid(this.reviewForm)) return;
    void this.store.requestOtp(this.reviewForm.getRawValue().channel, LANG);
  }

  protected acceptDocuments(): void {
    this.reviewForm.controls.accepted.setValue(true);
    this.readerOpen.set(false);
  }

  protected async resendOtp(): Promise<void> {
    this.otpForm.reset();
    await this.store.resendOtp(LANG);
  }

  protected sign(): void {
    if (this.invalid(this.otpForm)) return;
    void this.store.sign(this.otpForm.getRawValue().code.trim());
  }

  protected open(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  private prefillEmail(): void {
    const email = this.store.studentEmail();
    if (email && !this.verifyForm.controls.email.value) {
      this.verifyForm.setValue({ email });
    }
  }

  private invalid(form: { invalid: boolean; markAllAsTouched(): void }): boolean {
    if (form.invalid) {
      form.markAllAsTouched();
    }
    return form.invalid;
  }
}
