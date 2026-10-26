import { Page, PageRequest } from '@shared/domain/page';
import {
  DocumentLink,
  FieldInput,
  FollowerInput,
  GeneralInformation,
  SignatureRequest,
  SignatureRequestSearchCriteria,
  SignerInput,
} from './signature-request';

/**
 * Port de persistance des demandes. Classe abstraite pour servir de jeton d'injection Angular
 * sans que le domaine dépende d'Angular. Implémenté dans `infrastructure/`.
 *
 * Les commandes ne renvoient rien : l'écran relit la demande après chaque modification.
 * Toutes lèvent une `AppError` portant le code `SigningError` du backend en cas de refus.
 */
export abstract class SignatureRequestRepository {
  abstract search(
    criteria: SignatureRequestSearchCriteria,
    page: PageRequest,
  ): Promise<Page<SignatureRequest>>;

  /** `null` si la demande n'existe pas. */
  abstract findById(id: string): Promise<SignatureRequest | null>;

  /** Crée une demande vide à l'état `DRAFT` et renvoie son identifiant. */
  abstract create(): Promise<string>;

  abstract editInformation(requestId: string, information: GeneralInformation): Promise<void>;

  abstract uploadDocuments(requestId: string, files: File[]): Promise<void>;
  abstract removeDocuments(requestId: string, documentIds: string[]): Promise<void>;
  abstract documentLinks(requestId: string): Promise<DocumentLink[]>;

  abstract addSigner(requestId: string, signer: SignerInput): Promise<void>;
  abstract editSigner(requestId: string, signerId: string, signer: SignerInput): Promise<void>;
  abstract removeSigner(requestId: string, signerId: string): Promise<void>;

  abstract addField(requestId: string, field: FieldInput): Promise<void>;
  abstract removeField(requestId: string, fieldId: string): Promise<void>;

  abstract addFollower(requestId: string, follower: FollowerInput): Promise<void>;
  abstract editFollower(
    requestId: string,
    followerId: string,
    follower: FollowerInput,
  ): Promise<void>;
  abstract removeFollower(requestId: string, followerId: string): Promise<void>;

  abstract submit(requestId: string): Promise<void>;
  abstract cancel(requestId: string): Promise<void>;
  abstract archive(requestId: string): Promise<void>;
  abstract unarchive(requestId: string): Promise<void>;
}
