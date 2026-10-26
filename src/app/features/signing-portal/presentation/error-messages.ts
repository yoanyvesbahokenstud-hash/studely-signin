import { AppError } from '@shared/domain/app-error';

// TODO(FE-02): passer ces libellés dans les fichiers de traduction.
/** Messages lisibles pour les erreurs que le signataire peut corriger. */
const MESSAGES: Record<string, string> = {
  '400_101': "L'adresse e-mail n'est pas valide.",
  '400_440': 'Votre accès a expiré. Confirmez à nouveau votre adresse e-mail pour continuer.',
  '400_441': 'Code incorrect. Vérifiez le code reçu et réessayez.',
  '400_453': 'Trop de tentatives. Réessayez dans 15 minutes.',
  '400_446': 'Nombre maximal de codes atteint pour cette demande.',
  '400_454': 'Cette adresse e-mail ne correspond pas à celle du signataire de ce lien.',
  '400_455': 'Un code vient de vous être envoyé. Patientez un peu avant d’en redemander un.',
  '400_501': 'Adresse e-mail refusée par le service de notification.',
  '400_502': 'Ce code a expiré. Demandez-en un nouveau.',
  '400_503': 'Code incorrect. Vérifiez le code reçu et réessayez.',
  '400_504': 'Ce numéro de téléphone est temporairement bloqué. Choisissez l’envoi par e-mail.',
  '400_505': 'Numéro de téléphone refusé. Choisissez l’envoi par e-mail.',
  '400_506': "L'envoi par SMS a échoué. Choisissez l’envoi par e-mail.",
  '500_210': "Le code n'a pas pu être envoyé. Réessayez dans un instant.",
  NETWORK: 'Le serveur est injoignable. Vérifiez votre connexion.',
};

export function signingErrorMessage(error: AppError): string {
  if (MESSAGES[error.code]) return MESSAGES[error.code];
  return `Une erreur est survenue (${error.code}). Réessayez dans un instant.`;
}
