import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { GeneralInformation } from '../../../domain/signature-request';
import { MIN_LINK_VALIDITY_DAYS } from '../../../domain/signature-request.validation';

@Component({
  selector: 'sts-general-info-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <sts-modal [title]="title()" (dismiss)="dismiss.emit()">
      <form id="general-info" class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (firstSetup()) {
          <div class="callout">
            <sts-icon name="info" />
            <p>
              Donnez un nom à cette demande : il apparaîtra dans l'e-mail envoyé aux signataires.
            </p>
          </div>
        }
        <div class="field">
          <label for="request-name" class="required">Nom de la demande</label>
          <input
            id="request-name"
            formControlName="name"
            placeholder="Ex. Contrat de prêt étudiant"
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span class="error-text">Le nom est obligatoire.</span>
          }
        </div>
        <div class="form-row">
          <div class="field">
            <label for="link-validity" class="required">Validité des liens (jours)</label>
            <input
              id="link-validity"
              type="number"
              formControlName="linkValidityDays"
              [min]="minValidity"
            />
            @if (form.controls.linkValidityDays.touched && form.controls.linkValidityDays.invalid) {
              <span class="error-text">Minimum {{ minValidity }}.</span>
            } @else {
              <span class="hint">Le backend impose au moins {{ minValidity }}.</span>
            }
          </div>
          <div class="field">
            <label for="reminders" class="required">Nombre de relances</label>
            <input id="reminders" type="number" formControlName="reminderTimes" min="0" />
            @if (form.controls.reminderTimes.touched && form.controls.reminderTimes.invalid) {
              <span class="error-text">Valeur positive ou nulle.</span>
            }
          </div>
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
        <button type="submit" form="general-info" class="btn-primary" [disabled]="busy()">
          @if (busy()) {
            <sts-icon name="loader" class="spin" />
          }
          {{ submitLabel() }}
        </button>
      </ng-container>
    </sts-modal>
  `,
})
export class GeneralInfoDialog implements OnInit {
  readonly initial = input.required<GeneralInformation>();
  readonly title = input('Informations générales');
  readonly submitLabel = input('Enregistrer');
  /** Création d'une demande : on explique à quoi sert le nom. */
  readonly firstSetup = input(false);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<GeneralInformation>();
  readonly dismiss = output<void>();

  protected readonly minValidity = MIN_LINK_VALIDITY_DAYS;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    linkValidityDays: [30, [Validators.required, Validators.min(MIN_LINK_VALIDITY_DAYS)]],
    reminderTimes: [3, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.form.setValue(this.initial());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({ ...value, name: value.name.trim() });
  }
}
