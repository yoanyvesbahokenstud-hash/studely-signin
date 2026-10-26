import { computed, inject, Injectable, signal } from '@angular/core';
import { AppError } from '@shared/domain/app-error';
import { emptyPage, Page, PageRequest } from '@shared/domain/page';
import { SignatureRequest, SignatureRequestSearchCriteria } from '../domain/signature-request';
import { SearchSignatureRequests } from './search-signature-requests.use-case';
import { toAppError } from './to-app-error';

const DEFAULT_PAGE: PageRequest = { page: 0, size: 20 };

/** État de l'écran « liste des demandes », exposé en signals à la présentation. */
@Injectable()
export class SignatureRequestListStore {
  private readonly searchRequests = inject(SearchSignatureRequests);

  private readonly criteriaState = signal<SignatureRequestSearchCriteria>({});
  private readonly pageRequestState = signal<PageRequest>(DEFAULT_PAGE);
  private readonly resultState = signal<Page<SignatureRequest>>(emptyPage(DEFAULT_PAGE));
  private readonly loadingState = signal(false);
  private readonly errorState = signal<AppError | null>(null);

  readonly criteria = this.criteriaState.asReadonly();
  readonly result = this.resultState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasFilters = computed(() => Object.values(this.criteriaState()).some(Boolean));
  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.result().items.length === 0,
  );

  filter(criteria: SignatureRequestSearchCriteria): Promise<void> {
    this.criteriaState.set(criteria);
    this.pageRequestState.update((page) => ({ ...page, page: 0 }));
    return this.load();
  }

  goToPage(page: PageRequest): Promise<void> {
    this.pageRequestState.set(page);
    return this.load();
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      this.resultState.set(
        await this.searchRequests.execute(this.criteriaState(), this.pageRequestState()),
      );
    } catch (error) {
      this.errorState.set(toAppError(error));
    } finally {
      this.loadingState.set(false);
    }
  }
}
