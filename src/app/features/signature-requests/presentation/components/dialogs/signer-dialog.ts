import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { Signer, SignerInput } from '../../../domain/signature-request';
import { EMAIL_PATTERN, PHONE_PATTERN } from '../../../domain/signature-request.validation';

@Component({
  selector: 'sts-signer-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <sts-modal
      [title]="signer() ? 'Modifier le signataire' : 'Ajouter un signataire'"
      (dismiss)="dismiss.emit()"
    >
      <form id="signer-form" class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-row">
          <div class="field">
            <label for="signer-first-name" [class.required]="signer()">Prénom</label>
            <input id="signer-first-name" formControlName="firstName" autocomplete="off" />
            @if (form.controls.firstName.touched && form.controls.firstName.invalid) {
              <span class="error-text">Le prénom est obligatoire pour modifier un signataire.</span>
            }
          </div>
          <div class="field">
            <label for="signer-last-name" class="required">Nom</label>
            <input id="signer-last-name" formControlName="lastName" autocomplete="off" />
            @if (form.controls.lastName.touched && form.controls.lastName.invalid) {
              <span class="error-text">Le nom est obligatoire.</span>
            }
          </div>
        </div>
        <div class="field">
          <label for="signer-email" class="required">E-mail</label>
          <input id="signer-email" type="email" formControlName="email" autocomplete="off" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="error-text">Adresse e-mail invalide.</span>
          } @else {
            <span class="hint"
              >Le signataire devra la saisir pour ouvrir son lien de signature.</span
            >
          }
        </div>
        <div class="field">
          <label for="signer-phone" class="required">Téléphone</label>
          <input
            id="signer-phone"
            type="tel"
            formControlName="phone"
            placeholder="+33612345678"
            autocomplete="off"
          />
          @if (form.controls.phone.touched && form.controls.phone.invalid) {
            <span class="error-text">Format international attendu : +33612345678.</span>
          } @else {
            <span class="hint">Utilisé pour l'envoi du code de signature par SMS.</span>
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
        <button type="submit" form="signer-form" class="btn-primary" [disabled]="busy()">
          @if (busy()) {
            <sts-icon name="loader" class="spin" />
          }
          {{ signer() ? 'Enregistrer' : 'Ajouter' }}
        </button>
      </ng-container>
    </sts-modal>
  `,
})
export class SignerDialog implements OnInit {
  /** Signataire à modifier ; absent pour un ajout. */
  readonly signer = input<Signer>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SignerInput>();
  readonly dismiss = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: [''],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  ngOnInit(): void {
    const signer = this.signer();
    if (signer) {
      // Le backend exige le prénom en modification (400_470), pas à l'ajout.
      this.form.controls.firstName.addValidators(Validators.required);
      this.form.setValue({
        firstName: signer.firstName,
        lastName: signer.lastName,
        email: signer.email,
        phone: signer.phone ?? '',
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phone: value.phone.replace(/\s/g, ''),
    });
  }
}
