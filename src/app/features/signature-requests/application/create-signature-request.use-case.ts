import { inject, Injectable } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import { GeneralInformation } from '../domain/signature-request';
import { SignatureRequestRepository } from '../domain/signature-request.repository';
import { toAppError } from './to-app-error';

export interface CreationResult {
  /** Identifiant du brouillon, dès que `/init` a réussi. */
  id: string;
  /** Échec de l'enregistrement des informations : le brouillon existe mais n'a pas de nom. */
  error: AppError | null;
}

@Injectable()
export class CreateSignatureRequest {
  private readonly repository = inject(SignatureRequestRepository);

  /**
   * Crée la demande (état `DRAFT`) puis lui donne ses informations générales : `/init` ne prend
   * pas de nom. `draftId` reprend un brouillon créé lors d'un essai précédent, pour ne pas en
   * créer un second. Lève une erreur si la création elle-même échoue.
   */
  async execute(information: GeneralInformation, draftId?: string): Promise<CreationResult> {
    const id = draftId ?? (await this.repository.create());
    try {
      await this.repository.editInformation(id, information);
      return { id, error: null };
    } catch (error) {
      return { id, error: toAppError(error) };
    }
  }
}
