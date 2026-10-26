import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Icon } from '@shared/ui/icon/icon';
import { Pagination } from '@shared/ui/pagination/pagination';
import { ToastService } from '@shared/ui/toast/toast.service';
import { CreateSignatureRequest } from '../../../application/create-signature-request.use-case';
import { SignatureRequestListStore } from '../../../application/signature-request-list.store';
import { toAppError } from '../../../application/to-app-error';
import {
  GeneralInformation,
  SIGNATURE_REQUEST_STATES,
  SignatureRequest,
  SignatureRequestState,
} from '../../../domain/signature-request';
import { signedCount } from '../../../domain/signature-request.rules';
import { GeneralInfoDialog } from '../../components/dialogs/general-info-dialog';
import {
  REQUEST_STATE_META,
  RequestStateBadge,
} from '../../components/status-badges/status-badges';
import { errorMessage } from '../../error-messages';

@Component({
  selector: 'sts-signature-request-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    EmptyState,
    GeneralInfoDialog,
    Icon,
    Pagination,
    RequestStateBadge,
  ],
  providers: [SignatureRequestListStore],
  templateUrl: './signature-request-list.html',
  styleUrl: './signature-request-list.scss',
})
export class SignatureRequestList implements OnInit {
  protected readonly store = inject(SignatureRequestListStore);
  private readonly createRequest = inject(CreateSignatureRequest);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly states = SIGNATURE_REQUEST_STATES.filter((state) => state !== 'DELETED');
  protected readonly stateMeta = REQUEST_STATE_META;
  /** Formulaire « Nouvelle demande » : rien n'est créé avant sa validation. */
  protected readonly creationOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly creationError = signal<string | null>(null);
  protected readonly newRequest: GeneralInformation = {
    name: '',
    linkValidityDays: 30,
    reminderTimes: 3,
  };
  /** Brouillon créé lors d'un essai dont l'enregistrement du nom a échoué : on le réutilise. */
  private draftId: string | undefined;

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    name: '',
    state: '' as SignatureRequestState | '',
    createdFrom: '',
    createdTo: '',
  });

  constructor() {
    // Un seul rechargement par rafale de saisie (et pour un `reset`, qui émet par contrôle).
    this.filters.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.applyFilters());
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected applyFilters(): void {
    const { name, state, createdFrom, createdTo } = this.filters.getRawValue();
    void this.store.filter({
      name: name.trim() || undefined,
      state: state || undefined,
      createdFrom: createdFrom ? new Date(`${createdFrom}T00:00:00`) : undefined,
      // Borne haute incluse : toute la journée sélectionnée.
      createdTo: createdTo ? new Date(`${createdTo}T23:59:59.999`) : undefined,
    });
  }

  protected resetFilters(): void {
    this.filters.reset();
  }

  protected onPage(page: number): void {
    void this.store.goToPage({ page, size: this.store.result().size });
  }

  protected onPageSize(size: number): void {
    void this.store.goToPage({ page: 0, size });
  }

  protected open(request: SignatureRequest): void {
    void this.router.navigate(['/requests', request.id]);
  }

  protected openCreation(): void {
    this.creationError.set(null);
    this.creationOpen.set(true);
  }

  protected closeCreation(): void {
    if (this.creating()) return;
    this.creationOpen.set(false);
    // Le brouillon sans nom reste visible dans la liste ; on le montre pour qu'il ne passe pas inaperçu.
    if (this.draftId) {
      this.draftId = undefined;
      void this.store.load();
    }
  }

  protected async create(information: GeneralInformation): Promise<void> {
    this.creating.set(true);
    this.creationError.set(null);
    try {
      const { id, error } = await this.createRequest.execute(information, this.draftId);
      if (error) {
        this.draftId = id;
        this.creationError.set(errorMessage(error));
        return;
      }
      this.draftId = undefined;
      this.creationOpen.set(false);
      this.toasts.success('Demande créée', 'Ajoutez maintenant les documents et les signataires.');
      await this.router.navigate(['/requests', id]);
    } catch (error) {
      this.creationError.set(errorMessage(toAppError(error)));
    } finally {
      this.creating.set(false);
    }
  }

  protected signerNames(request: SignatureRequest): string {
    return (
      request.signers.map((signer) => `${signer.firstName} ${signer.lastName}`.trim()).join(', ') ||
      '—'
    );
  }

  protected progress(request: SignatureRequest): string {
    return `${signedCount(request)}/${request.signers.length}`;
  }
}
