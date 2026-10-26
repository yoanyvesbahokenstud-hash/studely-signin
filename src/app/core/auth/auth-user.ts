/** Utilisateur connecté, tel que décrit par son `id_token` Cognito. */
export interface AuthUser {
  email: string;
  /** Claim `custom:authorities` (ex. `ROLE_GATEKEEPER_ADMIN`). */
  authorities: string[];
  expiresAt: Date;
}

/** Rôles acceptés par le backend sur `/api/v1/bo/**` (voir `SecurityConfig`). */
export const BACK_OFFICE_ROLES = ['ROLE_GATEKEEPER_ADMIN', 'ROLE_STUDELY_CLIENT'] as const;

export function canUseBackOffice(user: AuthUser): boolean {
  return user.authorities.some((role) => (BACK_OFFICE_ROLES as readonly string[]).includes(role));
}

/** Code d'erreur levé quand l'utilisateur est authentifié mais n'a pas de rôle back-office. */
export const MISSING_ROLE_ERROR_CODE = 'MISSING_BACK_OFFICE_ROLE';

const ROLE_LABELS: Record<string, string> = {
  ROLE_GATEKEEPER_ADMIN: 'Administrateur',
  ROLE_STUDELY_CLIENT: 'Client Studely',
};

export function roleLabel(user: AuthUser): string {
  const role = user.authorities.find((authority) => authority in ROLE_LABELS);
  return role ? ROLE_LABELS[role] : 'Back-office';
}
