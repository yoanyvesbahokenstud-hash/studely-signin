import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '@shared/ui/icon/icon';
import { Modal } from '@shared/ui/modal/modal';
import { FieldInput, SignatureDocument, Signer } from '../../../domain/signature-request';
import { TAG_PATTERN } from '../../../domain/signature-request.validation';

@Component({
  selector: 'sts-field-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <sts-modal title="Ajouter un champ de signature" (dismiss)="dismiss.emit()">
      <form id="field-form" class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        <div class="callout">
          <sts-icon name="info" />
          <p>
            Le champ est placé à l'endroit où le tag (par exemple <strong>s1</strong>) est écrit
            dans le PDF. Le tag doit donc déjà figurer dans le document.
          </p>
        </div>
        <p class="target">
          Signataire : <strong>{{ signerName() }}</strong>
        </p>
        <div class="field">
          <label for="field-document" class="required">Document</label>
          <select id="field-document" formControlName="documentId">
            @for (document of documents(); track document.id) {
              <option [value]="document.id">{{ document.fileName }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="field-tag" class="required">Tag dans le PDF</label>
          <input id="field-tag" formControlName="tag" placeholder="s1" autocomplete="off" />
          @if (form.controls.tag.touched && form.controls.tag.invalid) {
            <span class="error-text">Format attendu : s suivi d'un nombre (s1, s2…).</span>
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
        <button type="submit" form="field-form" class="btn-primary" [disabled]="busy()">
          @if (busy()) {
            <sts-icon name="loader" class="spin" />
          }
          Ajouter le champ
        </button>
      </ng-container>
    </sts-modal>
  `,
  styles: `
    .target {
      margin: 0;
      font-size: 0.875rem;
    }
  `,
})
export class FieldDialog implements OnInit {
  readonly signer = input.required<Signer>();
  readonly documents = input.required<SignatureDocument[]>();
  /** Tag proposé par défaut (ex. `s2` pour le 2ᵉ signataire). */
  readonly suggestedTag = input('s1');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<FieldInput>();
  readonly dismiss = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    documentId: ['', Validators.required],
    tag: ['', [Validators.required, Validators.pattern(TAG_PATTERN)]],
  });

  protected signerName(): string {
    const signer = this.signer();
    return `${signer.firstName} ${signer.lastName}`.trim();
  }

  ngOnInit(): void {
    this.form.setValue({ documentId: this.documents()[0]?.id ?? '', tag: this.suggestedTag() });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { documentId, tag } = this.form.getRawValue();
    this.save.emit({ signerId: this.signer().id, documentId, tag: tag.trim().toLowerCase() });
  }
}
