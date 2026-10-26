import { inject, Injectable } from '@angular/core';
import { SignatureRequest } from '../domain/signature-request';
import { SignatureRequestRepository } from '../domain/signature-request.repository';

@Injectable()
export class GetSignatureRequest {
  private readonly repository = inject(SignatureRequestRepository);

  execute(id: string): Promise<SignatureRequest | null> {
    return this.repository.findById(id);
  }
}
