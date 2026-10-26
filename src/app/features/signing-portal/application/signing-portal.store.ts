import { inject, Injectable, signal } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import {
  OtpChannel,
  SigningLink,
  SigningOutcome,
  SigningStep,
  VerifiedLink,
} from '../domain/signing';
import { SignerPortalRepository } from '../domain/signer-portal.repository';

/** Situations où le parcours ne peut pas aboutir, quoi que fasse le signataire. */
export type SigningDeadEnd = 'invalid-link' | 'closed' | 'expired' | 'blocked' | 'already-signed';

/** Codes `SigningError` qui mettent fin au parcours. */
const DEAD_ENDS: Record<string, SigningDeadEnd> = {
  '400_460': 'invalid-link', // demande introuvable
  '400_416': 'invalid-link', // signataire introuvable dans la demande
  '400_401': 'closed', // demande annulée, déjà signée ou archivée
  '400_447': 'expired', // liens de signature expirés
  '400_458': 'blocked', // quota d'OTP épuisé : la demande est bloquée
  '400_456': 'already-signed', // le signataire n'est plus « à signer »
  '400_457': 'already-signed', // plus aucun champ à signer
};

/** Le jeton d'accès est absent, invalide ou expiré : il faut revérifier l'e-mail. */
const ACCESS_LOST = '400_440';

/** État du parcours de signature, exposé en signals à la page. */
@Injectable()
export class SigningPortalStore {
  private readonly repository = inject(SignerPortalRepository);

  private readonly linkState = signal<SigningLink | null>(null);
  private readonly stepState = signal<SigningStep>('verify');
  private readonly verifiedState = signal<VerifiedLink | null>(null);
  private readonly channelState = signal<OtpChannel>('MAIL');
  private readonly outcomeState = signal<SigningOutcome | null>(null);
  private readonly busyState = signal(false);
  private readonly errorState = signal<AppError | null>(null);
  private readonly deadEndState = signal<SigningDeadEnd | null>(null);

  readonly step = this.stepState.asReadonly();
  readonly verified = this.verifiedState.asReadonly();
  readonly channel = this.channelState.asReadonly();
  readonly outcome = this.outcomeState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  /** Dernière erreur récupérable (saisie à corriger, code expiré…). */
  readonly error = this.errorState.asReadonly();
  readonly deadEnd = this.deadEndState.asReadonly();

  start(link: SigningLink): void {
    this.linkState.set(link);
    this.errorState.set(null);
    this.deadEndState.set(null);
    this.outcomeState.set(null);
    this.verifiedState.set(null);
    this.stepState.set('verify');
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
      await this.repository.requestOtp(link, channel, lang, this.requireAccessToken());
      this.stepState.set('otp');
    });
  }

  /** Renvoie un code sur le même canal, sans quitter l'étape de saisie. */
  resendOtp(lang: string): Promise<boolean> {
    return this.run((link) =>
      this.repository.requestOtp(link, this.channelState(), lang, this.requireAccessToken()),
    );
  }

  /** Revient au choix du canal, par exemple pour passer du SMS à l'e-mail. */
  changeChannel(): void {
    this.errorState.set(null);
    this.stepState.set('review');
  }

  sign(otp: string): Promise<boolean> {
    return this.run(async (link) => {
      this.outcomeState.set(await this.repository.sign(link, otp, this.requireAccessToken()));
      this.stepState.set('done');
    });
  }

  /** Le jeton d'accès se perd au rechargement de la page ou expire : l'e-mail doit être revérifié. */
  private requireAccessToken(): string {
    const verified = this.verifiedState();
    if (!verified || verified.accessExpiresAt.getTime() <= Date.now()) {
      throw new AppError(400, ACCESS_LOST, 'Signing access expired');
    }
    return verified.accessToken;
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
        if (appError.code === ACCESS_LOST) {
          this.verifiedState.set(null);
          this.stepState.set('verify');
        }
        this.errorState.set(appError);
      }
      return false;
    } finally {
      this.busyState.set(false);
    }
  }
}
