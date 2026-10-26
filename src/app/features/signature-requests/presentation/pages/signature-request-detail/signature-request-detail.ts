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
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppError } from '@shared/domain/app-error';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Icon } from '@shared/ui/icon/icon';
import { ToastService } from '@shared/ui/toast/toast.service';
import { SignatureRequestDetailStore } from '../../../application/signature-request-detail.store';
import {
  FieldInput,
  Follower,
  FollowerInput,
  GeneralInformation,
  Signer,
  SignerInput,
} from '../../../domain/signature-request';
import { SubmissionBlocker } from '../../../domain/signature-request.rules';
import { FieldDialog } from '../../components/dialogs/field-dialog';
import { FollowerDialog } from '../../components/dialogs/follower-dialog';
import { DocumentPreviewDialog } from '../../components/dialogs/document-preview-dialog';
import { GeneralInfoDialog } from '../../components/dialogs/general-info-dialog';
import { SignerDialog } from '../../components/dialogs/signer-dialog';
import { RequestStateBadge, SignerStatusBadge } from '../../components/status-badges/status-badges';
import { errorMessage } from '../../error-messages';

const BLOCKER_LABELS: Record<SubmissionBlocker, string> = {
  NO_DOCUMENT: 'Ajoutez au moins un document.',
  NO_SIGNER: 'Ajoutez au moins un signataire.',
  SIGNER_WITHOUT_FIELD: 'Chaque signataire doit avoir au moins un champ de signature.',
  DOCUMENT_WITHOUT_FIELD: 'Chaque document doit porter au moins un champ de signature.',
};

interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  run: () => Promise<AppError | null>;
  success: string;
}

type Dialog =
  | { kind: 'info'; firstSetup: boolean }
  | { kind: 'signer'; signer?: Signer }
  | { kind: 'field'; signer: Signer; suggestedTag: string }
  | { kind: 'follower'; follower?: Follower }
  | { kind: 'preview'; title: string; url: string }
  | ({ kind: 'confirm' } & Confirmation);

@Component({
  selector: 'sts-signature-request-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    ConfirmDialog,
    EmptyState,
    Icon,
    DocumentPreviewDialog,
    FieldDialog,
    FollowerDialog,
    GeneralInfoDialog,
    SignerDialog,
    RequestStateBadge,
    SignerStatusBadge,
  ],
  providers: [SignatureRequestDetailStore],
  templateUrl: './signature-request-detail.html',
  styleUrl: './signature-request-detail.scss',
})
export class SignatureRequestDetail {
  /** Lié au paramètre de route `:id` via `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  protected readonly store = inject(SignatureRequestDetailStore);
  private readonly toasts = inject(ToastService);

  protected readonly blockerLabels = BLOCKER_LABELS;
  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly documentNames = computed(
    () => new Map(this.store.request()?.documents.map((d) => [d.id, d.fileName]) ?? []),
  );

  protected readonly information = computed<GeneralInformation>(() => {
    const request = this.store.request();
    return {
      name: request?.name ?? '',
      linkValidityDays: request?.linkValidityDays ?? 30,
      reminderTimes: request?.reminderTimes ?? 3,
    };
  });

  constructor() {
    // Recharge quand l'identifiant de la route change ; le chargement lui-même n'est pas suivi.
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
  }

  // ---------- Fenêtres ----------

  protected open(dialog: Dialog): void {
    this.dialogError.set(null);
    this.dialog.set(dialog);
  }

  protected close(): void {
    if (!this.store.busy()) {
      this.dialog.set(null);
    }
  }

  protected openFieldDialog(signer: Signer, index: number): void {
    this.open({ kind: 'field', signer, suggestedTag: `s${index + 1}` });
  }

  // ---------- Commandes ----------

  protected saveInformation(information: GeneralInformation): void {
    void this.execute(() => this.store.editInformation(information), 'Informations enregistrées');
  }

  protected saveSigner(input: SignerInput, signer?: Signer): void {
    void this.execute(
      () => (signer ? this.store.editSigner(signer.id, input) : this.store.addSigner(input)),
      signer ? 'Signataire modifié' : 'Signataire ajouté',
    );
  }

  protected saveField(field: FieldInput): void {
    void this.execute(() => this.store.addField(field), 'Champ de signature ajouté');
  }

  protected saveFollower(input: FollowerInput, follower?: Follower): void {
    void this.execute(
      () =>
        follower ? this.store.editFollower(follower.id, input) : this.store.addFollower(input),
      follower ? 'Observateur modifié' : 'Observateur ajouté',
    );
  }

  protected confirm(confirmation: Confirmation): void {
    void this.execute(confirmation.run, confirmation.success);
  }

  protected async removeField(fieldId: string): Promise<void> {
    const error = await this.store.removeField(fieldId);
    if (error) {
      this.toasts.error('Suppression impossible', errorMessage(error));
    } else {
      this.toasts.success('Champ de signature retiré');
    }
  }

  protected async uploadDocuments(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    const error = await this.store.uploadDocuments(files);
    if (error) {
      this.toasts.error('Téléversement impossible', errorMessage(error));
    } else {
      this.toasts.success(
        files.length > 1 ? `${files.length} documents ajoutés` : 'Document ajouté',
      );
    }
  }

  /** Les liens présignés expirent au bout de 15 min : on les demande au moment du clic. */
  protected async openDocument(documentId: string, signed = false): Promise<void> {
    const links = await this.store.documentLinks();
    if (links instanceof AppError) {
      this.toasts.error('Ouverture impossible', errorMessage(links));
      return;
    }
    const link = links.find((candidate) => candidate.documentId === documentId);
    const url = signed ? link?.signedUrl : link?.url;
    if (!link || !url) {
      this.toasts.error('Ouverture impossible', 'Lien de téléchargement indisponible.');
      return;
    }
    const fileName = this.documentNames().get(documentId) ?? 'Document';
    const title = signed ? `${fileName} (version signée)` : fileName;
    this.open({ kind: 'preview', title, url });
  }

  // ---------- Confirmations ----------

  protected askRemoveDocument(documentId: string, fileName: string): void {
    this.open({
      kind: 'confirm',
      title: 'Retirer le document',
      message: `« ${fileName} » sera retiré de la demande, ainsi que les champs de signature placés dessus.`,
      confirmLabel: 'Retirer',
      tone: 'danger',
      run: () => this.store.removeDocument(documentId),
      success: 'Document retiré',
    });
  }

  protected askRemoveSigner(signer: Signer): void {
    this.open({
      kind: 'confirm',
      title: 'Retirer le signataire',
      message: `${this.fullName(signer)} et ses champs de signature seront retirés de la demande.`,
      confirmLabel: 'Retirer',
      tone: 'danger',
      run: () => this.store.removeSigner(signer.id),
      success: 'Signataire retiré',
    });
  }

  protected askRemoveFollower(follower: Follower): void {
    this.open({
      kind: 'confirm',
      title: "Retirer l'observateur",
      message: `${follower.email} ne suivra plus cette demande.`,
      confirmLabel: 'Retirer',
      tone: 'danger',
      run: () => this.store.removeFollower(follower.id),
      success: 'Observateur retiré',
    });
  }

  protected askSubmit(): void {
    const count = this.store.request()?.signers.length ?? 0;
    this.open({
      kind: 'confirm',
      title: 'Soumettre la demande',
      message: `Un e-mail contenant son lien de signature sera envoyé à chacun des ${count} signataire(s). La demande ne pourra plus être modifiée.`,
      confirmLabel: 'Soumettre',
      tone: 'primary',
      run: () => this.store.submit(),
      success: 'Demande soumise aux signataires',
    });
  }

  protected askCancel(): void {
    this.open({
      kind: 'confirm',
      title: 'Annuler la demande',
      message: 'Les signataires ne pourront plus signer. Cette action est définitive.',
      confirmLabel: 'Annuler la demande',
      tone: 'danger',
      run: () => this.store.cancel(),
      success: 'Demande annulée',
    });
  }

  protected askArchive(): void {
    this.open({
      kind: 'confirm',
      title: 'Archiver la demande',
      message: 'La demande sera archivée. Vous pourrez la désarchiver à tout moment.',
      confirmLabel: 'Archiver',
      tone: 'primary',
      run: () => this.store.archive(),
      success: 'Demande archivée',
    });
  }

  protected askUnarchive(): void {
    this.open({
      kind: 'confirm',
      title: 'Désarchiver la demande',
      message: 'La demande sera restaurée dans son état précédent.',
      confirmLabel: 'Désarchiver',
      tone: 'primary',
      run: () => this.store.unarchive(),
      success: 'Demande désarchivée',
    });
  }

  // ---------- Affichage ----------

  protected fullName(signer: Signer): string {
    return `${signer.firstName} ${signer.lastName}`.trim();
  }

  protected initials(signer: Signer): string {
    return `${signer.firstName.charAt(0)}${signer.lastName.charAt(0)}`.toUpperCase();
  }

  private async execute(command: () => Promise<AppError | null>, success: string): Promise<void> {
    this.dialogError.set(null);
    const error = await command();
    if (error) {
      this.dialogError.set(errorMessage(error));
      return;
    }
    this.dialog.set(null);
    this.toasts.success(success);
  }
}
