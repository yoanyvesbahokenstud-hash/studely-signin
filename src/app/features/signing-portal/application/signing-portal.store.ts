import { computed, inject, Injectable, signal } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import {
  OtpChannel,
  SigningLink,
  SigningOutcome,
  SigningStep,
  VerifiedLink,
} from '../domain/signing';
import { SignerPortalRepository } from '../domain/signer-portal.repository';
import { StudentAuth } from '../domain/student-auth';

/** Situations où le parcours ne peut pas aboutir, quoi que fasse le signataire. */
export type SigningDeadEnd = 'invalid-link' | 'closed' | 'already-signed';

/** Codes `SigningError` qui mettent fin au parcours. */
const DEAD_ENDS: Record<string, SigningDeadEnd> = {
  '400_460': 'invalid-link', // demande introuvable
  '400_416': 'invalid-link', // signataire introuvable dans la demande
  '400_401': 'closed', // demande annulée, déjà signée ou archivée
  '500_400': 'already-signed', // le signataire n'est plus « à signer »
};

/** État du parcours de signature, exposé en signals à la page. */
@Injectable()
export class SigningPortalStore {
  private readonly repository = inject(SignerPortalRepository);
  private readonly auth = inject(StudentAuth);

  private readonly linkState = signal<SigningLink | null>(null);
  private readonly stepState = signal<SigningStep>('sign-in');
  private readonly verifiedState = signal<VerifiedLink | null>(null);
  private readonly channelState = signal<OtpChannel>('MAIL');
  private readonly outcomeState = signal<SigningOutcome | null>(null);
  private readonly busyState = signal(false);
  private readonly errorState = signal<AppError | null>(null);
  private readonly deadEndState = signal<SigningDeadEnd | null>(null);
  private readonly studentEmailState = signal<string | null>(null);

  readonly step = this.stepState.asReadonly();
  readonly verified = this.verifiedState.asReadonly();
  readonly channel = this.channelState.asReadonly();
  readonly outcome = this.outcomeState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  /** Dernière erreur récupérable (saisie à corriger, code expiré…). */
  readonly error = this.errorState.asReadonly();
  readonly deadEnd = this.deadEndState.asReadonly();
  readonly studentEmail = this.studentEmailState.asReadonly();
  readonly isSignedIn = computed(() => this.studentEmailState() !== null);

  start(link: SigningLink): void {
    this.linkState.set(link);
    this.errorState.set(null);
    this.deadEndState.set(null);
    this.outcomeState.set(null);
    this.verifiedState.set(null);
    this.studentEmailState.set(this.auth.student()?.email ?? null);
    this.stepState.set(this.isSignedIn() ? 'verify' : 'sign-in');
  }

  signIn(email: string, password: string): Promise<boolean> {
    return this.run(async () => {
      const student = await this.auth.signIn(email, password);
      this.studentEmailState.set(student.email);
      this.stepState.set('verify');
    });
  }

  signOut(): void {
    this.auth.signOut();
    this.studentEmailState.set(null);
    this.verifiedState.set(null);
    this.errorState.set(null);
    this.stepState.set('sign-in');
  }

  verify(email: string): Promise<boolean> {
    return this.run(async (link) => {
      this.verifiedState.set(await this.repository.verifyLink(link, email));
      this.stepState.set('review');
    });
  }

  /** Après lecture des documents : envoi du code sur le canal choisi. */
  requestOtp(channel: OtpChannel, lang: string): Promise<boolean> {
    this.channelState.set(channel);
    return this.run(async (link) => {
      await this.repository.requestOtp(link, channel, lang, this.requireToken());
      this.stepState.set('otp');
    });
  }

  /** Renvoie un code sur le même canal, sans quitter l'étape de saisie. */
  resendOtp(lang: string): Promise<boolean> {
    return this.run((link) =>
      this.repository.requestOtp(link, this.channelState(), lang, this.requireToken()),
    );
  }

  /** Revient au choix du canal, par exemple pour passer du SMS à l'e-mail. */
  changeChannel(): void {
    this.errorState.set(null);
    this.stepState.set('review');
  }

  sign(otp: string): Promise<boolean> {
    return this.run(async (link) => {
      this.outcomeState.set(await this.repository.sign(link, otp, this.requireToken()));
      this.stepState.set('done');
    });
  }

  /** La session étudiante a pu expirer pendant le parcours : on renvoie alors à la connexion. */
  private requireToken(): string {
    const token = this.auth.idToken();
    if (!token) {
      this.studentEmailState.set(null);
      this.stepState.set('sign-in');
      throw new AppError(401, 'SESSION_EXPIRED', 'Student session expired');
    }
    return token;
  }

  private async run(action: (link: SigningLink) => Promise<unknown>): Promise<boolean> {
    const link = this.linkState();
    if (!link) return false;
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      await action(link);
      return true;
    } catch (error) {
      const appError = AppError.isAppError(error)
        ? error
        : new AppError(0, 'UNKNOWN', String(error));
      const deadEnd = DEAD_ENDS[appError.code];
      if (deadEnd) {
        this.deadEndState.set(deadEnd);
      } else {
        this.errorState.set(appError);
      }
      return false;
    } finally {
      this.busyState.set(false);
    }
  }
}
