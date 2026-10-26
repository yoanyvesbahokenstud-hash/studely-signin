import { TestBed } from '@angular/core/testing';
import { AppError } from '@shared/domain/app-error';
import { SignatureRequestRepository } from '../domain/signature-request.repository';
import { SearchSignatureRequests } from './search-signature-requests.use-case';
import { SignatureRequestListStore } from './signature-request-list.store';

describe('SignatureRequestListStore', () => {
  const search = vi.fn<SignatureRequestRepository['search']>();

  beforeEach(() => {
    search.mockReset();
    TestBed.configureTestingModule({
      providers: [
        SignatureRequestListStore,
        SearchSignatureRequests,
        { provide: SignatureRequestRepository, useValue: { search } },
      ],
    });
  });

  it('resets to the first page when filtering', async () => {
    search.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 20 });
    const store = TestBed.inject(SignatureRequestListStore);

    await store.goToPage({ page: 3, size: 20 });
    await store.filter({ state: 'DRAFT' });

    expect(search).toHaveBeenLastCalledWith({ state: 'DRAFT' }, { page: 0, size: 20 });
    expect(store.isEmpty()).toBe(true);
  });

  it('exposes repository errors', async () => {
    search.mockRejectedValue(new AppError(500, '500_500', 'boom'));
    const store = TestBed.inject(SignatureRequestListStore);

    await store.load();

    expect(store.error()?.code).toBe('500_500');
    expect(store.loading()).toBe(false);
  });
});
