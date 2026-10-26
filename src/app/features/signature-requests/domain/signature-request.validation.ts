/** Formats exigés par le backend (`CommonValidator`), reproduits pour valider les formulaires avant envoi. */

export const EMAIL_PATTERN = /^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/;

/** E.164 : `+` puis 2 à 15 chiffres, le premier non nul (ex. `+33612345678`). */
export const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

/** Tag de champ de signature présent dans le PDF : `s1`, `s2`… */
export const TAG_PATTERN = /^s\d+$/;

/**
 * Le backend refuse une validité inférieure à 24 (`400_106`), bien que la valeur soit exprimée en jours.
 * TODO(BE): à confirmer côté backend (le message d'erreur parle d'heures).
 */
export const MIN_LINK_VALIDITY_DAYS = 24;

/** Nom attribué par le backend à la création (`POST /init` ne prend pas de nom). */
export const DEFAULT_REQUEST_NAME = 'Untitled Request';
