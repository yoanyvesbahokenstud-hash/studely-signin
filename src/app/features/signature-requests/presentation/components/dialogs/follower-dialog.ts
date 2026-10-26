import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { Follower, FollowerInput } from '../../../domain/signature-request';
import { EMAIL_PATTERN, PHONE_PATTERN } from '../../../domain/signature-request.validation';

@Component({
  selector: 'sts-follower-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <sts-modal
      [title]="follower() ? 'Modifier l’observateur' : 'Ajouter un observateur'"
      (dismiss)="dismiss.emit()"
    >
      <form id="follower-form" class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="follower-email" class="required">E-mail</label>
          <input id="follower-email" type="email" formControlName="email" autocomplete="off" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="error-text">Adresse e-mail invalide.</span>
          }
        </div>
        <div class="field">
          <label for="follower-phone" class="required">Téléphone</label>
          <input
            id="follower-phone"
            type="tel"
            formControlName="phone"
            placeholder="+33612345678"
            autocomplete="off"
          />
          @if (form.controls.phone.touched && form.controls.phone.invalid) {
            <span class="error-text">Format international attendu : +33612345678.</span>
          }
        </div>
        @if (error(); as error) {
          <div class="callout danger" role="alert">
            <sts-icon name="alert-triangle" />
            <p>{{ error }}</p>
          </div>
        }
      </form>
      <ng-container footer>
        <button type="button" class="btn-ghost" (click)="dismiss.emit()" [disabled]="busy()">
          Annuler
        </button>
        <button type="submit" form="follower-form" class="btn-primary" [disabled]="busy()">
          @if (busy()) {
            <sts-icon name="loader" class="spin" />
          }
          {{ follower() ? 'Enregistrer' : 'Ajouter' }}
        </button>
      </ng-container>
    </sts-modal>
  `,
})
export class FollowerDialog implements OnInit {
  readonly follower = input<Follower>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<FollowerInput>();
  readonly dismiss = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  ngOnInit(): void {
    const follower = this.follower();
    if (follower) {
      this.form.setValue({ email: follower.email, phone: follower.phone ?? '' });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({ email: value.email.trim(), phone: value.phone.replace(/\s/g, '') });
  }
}
