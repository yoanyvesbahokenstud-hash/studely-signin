import { computed, inject, Injectable, signal } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import {
  DocumentLink,
  FieldInput,
  FollowerInput,
  GeneralInformation,
  SignatureRequest,
  SignerInput,
} from '../domain/signature-request';
import { SignatureRequestRepository } from '../domain/signature-request.repository';
import { canBeCancelled, isEditable, submissionBlockers } from '../domain/signature-request.rules';
import { GetSignatureRequest } from './get-signature-request.use-case';
import { toAppError } from './to-app-error';

/**
 * État de l'écran « détail d'une demande » et commandes d'édition.
 * Chaque commande relit la demande après succès et renvoie l'erreur éventuelle (`null` si succès) :
 * c'est la présentation qui choisit comment l'afficher.
 */
@Injectable()
export class SignatureRequestDetailStore {
  private readonly getRequest = inject(GetSignatureRequest);
  private readonly repository = inject(SignatureRequestRepository);

  private readonly requestState = signal<SignatureRequest | null>(null);
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private readonly errorState = signal<AppError | null>(null);
  private readonly notFoundState = signal(false);

  readonly request = this.requestState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  /** Une commande est en cours : les actions sont désactivées. */
  readonly busy = this.busyState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly notFound = this.notFoundState.asReadonly();

  readonly editable = computed(() => {
    const request = this.requestState();
    return (
      request !== null && isEditable(request.state) && request.archiveStatus === 'NOT_ARCHIVED'
    );
  });

  readonly cancellable = computed(() => {
    const request = this.requestState();
    return (
      request !== null && canBeCancelled(request.state) && request.archiveStatus === 'NOT_ARCHIVED'
    );
  });

  readonly blockers = computed(() => {
    const request = this.requestState();
    return request ? submissionBlockers(request) : [];
  });

  async load(id: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    this.notFoundState.set(false);
    try {
      const request = await this.getRequest.execute(id);
      this.requestState.set(request);
      this.notFoundState.set(request === null);
    } catch (error) {
      this.errorState.set(toAppError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  editInformation(information: GeneralInformation): Promise<AppError | null> {
    return this.run((id) => this.repository.editInformation(id, information));
  }

  uploadDocuments(files: File[]): Promise<AppError | null> {
    return this.run((id) => this.repository.uploadDocuments(id, files));
  }

  removeDocument(documentId: string): Promise<AppError | null> {
    return this.run((id) => this.repository.removeDocuments(id, [documentId]));
  }

  addSigner(signer: SignerInput): Promise<AppError | null> {
    return this.run((id) => this.repository.addSigner(id, signer));
  }

  editSigner(signerId: string, signer: SignerInput): Promise<AppError | null> {
    return this.run((id) => this.repository.editSigner(id, signerId, signer));
  }

  removeSigner(signerId: string): Promise<AppError | null> {
    return this.run((id) => this.repository.removeSigner(id, signerId));
  }

  addField(field: FieldInput): Promise<AppError | null> {
    return this.run((id) => this.repository.addField(id, field));
  }

  removeField(fieldId: string): Promise<AppError | null> {
    return this.run((id) => this.repository.removeField(id, fieldId));
  }

  addFollower(follower: FollowerInput): Promise<AppError | null> {
    return this.run((id) => this.repository.addFollower(id, follower));
  }

  editFollower(followerId: string, follower: FollowerInput): Promise<AppError | null> {
    return this.run((id) => this.repository.editFollower(id, followerId, follower));
  }

  removeFollower(followerId: string): Promise<AppError | null> {
    return this.run((id) => this.repository.removeFollower(id, followerId));
  }

  submit(): Promise<AppError | null> {
    return this.run((id) => this.repository.submit(id));
  }

  cancel(): Promise<AppError | null> {
    return this.run((id) => this.repository.cancel(id));
  }

  /** Liens présignés (15 min) : demandés au moment du clic, jamais mis en cache. */
  async documentLinks(): Promise<DocumentLink[] | AppError> {
    const request = this.requestState();
    if (!request) return new AppError(0, 'NO_REQUEST', 'No request loaded');
    try {
      return await this.repository.documentLinks(request.id);
    } catch (error) {
      return toAppError(error);
    }
  }

  private async run(command: (requestId: string) => Promise<void>): Promise<AppError | null> {
    const request = this.requestState();
    if (!request) return new AppError(0, 'NO_REQUEST', 'No request loaded');
    this.busyState.set(true);
    try {
      await command(request.id);
      this.requestState.set(await this.getRequest.execute(request.id));
      return null;
    } catch (error) {
      return toAppError(error);
    } finally {
      this.busyState.set(false);
    }
  }
}
