import { inject, Injectable } from '@angular/core';
import { Page, PageRequest } from '@shared/domain/page';
import { SignatureRequest, SignatureRequestSearchCriteria } from '../domain/signature-request';
import { SignatureRequestRepository } from '../domain/signature-request.repository';

@Injectable()
export class SearchSignatureRequests {
  private readonly repository = inject(SignatureRequestRepository);

  execute(
    criteria: SignatureRequestSearchCriteria,
    page: PageRequest,
  ): Promise<Page<SignatureRequest>> {
    return this.repository.search(criteria, page);
  }
}
