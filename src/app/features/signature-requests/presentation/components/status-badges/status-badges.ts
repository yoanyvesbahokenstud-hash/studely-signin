import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Badge, BadgeTone } from '@shared/ui/badge/badge';
import { SignatureRequestState, SignerStatus } from '../../../domain/signature-request';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

// TODO(FE-02): passer ces libellés dans les fichiers de traduction.
export const REQUEST_STATE_META: Record<SignatureRequestState, StatusMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SUBMITTED: { label: 'En cours de signature', tone: 'info' },
  SIGNED: { label: 'Signée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
  DELETED: { label: 'Supprimée', tone: 'neutral' },
};

/** Côté backend : `UNUSED` = aucun champ attribué, `PENDING` = a des champs et doit signer. */
export const SIGNER_STATUS_META: Record<SignerStatus, StatusMeta> = {
  UNUSED: { label: 'Sans champ', tone: 'warning' },
  PENDING: { label: 'À signer', tone: 'accent' },
  FINISHED: { label: 'A signé', tone: 'success' },
};

@Component({
  selector: 'sts-request-state-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  template: `<sts-badge [tone]="meta().tone">{{ meta().label }}</sts-badge>`,
})
export class RequestStateBadge {
  readonly state = input.required<SignatureRequestState>();
  protected readonly meta = computed(() => REQUEST_STATE_META[this.state()]);
}

@Component({
  selector: 'sts-signer-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  template: `<sts-badge [tone]="meta().tone">{{ meta().label }}</sts-badge>`,
})
export class SignerStatusBadge {
  readonly status = input.required<SignerStatus>();
  protected readonly meta = computed(() => SIGNER_STATUS_META[this.status()]);
}
