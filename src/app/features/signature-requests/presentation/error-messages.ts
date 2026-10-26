import { AppError } from '@shared/domain/app-error';

// TODO(FE-02): passer ces libellés dans les fichiers de traduction.
/** Messages lisibles pour les codes `SigningError` que le gestionnaire peut rencontrer. */
const MESSAGES: Record<string, string> = {
  '400_100': "L'adresse e-mail est obligatoire.",
  '400_101': "L'adresse e-mail n'est pas valide.",
  '400_102': 'Le téléphone est obligatoire.',
  '400_103': 'Le téléphone doit être au format international (ex. +33612345678).',
  '400_105': 'Le tag doit être de la forme s1, s2, s3…',
  '400_106': 'La validité des liens doit être au moins de 24.',
  '400_107': 'Le nombre de relances ne peut pas être négatif.',
  '400_400': "La demande n'est plus modifiable (elle n'est plus en brouillon).",
  '400_401': "Action impossible : la demande n'est pas en cours de signature.",
  '400_406': 'Cette demande est déjà archivée.',
  '400_407': "Cette demande n'est pas archivée.",
  '400_408':
    'Seules les demandes en brouillon, signées, annulées ou expirées peuvent être archivées.',
  '400_413': 'Un signataire utilise déjà cette adresse e-mail.',
  '400_414': 'Un observateur utilise déjà cette adresse e-mail.',
  '400_415': "Ajoutez d'abord un document avant d'ajouter un signataire.",
  '400_416': 'Signataire introuvable.',
  '400_417': 'Observateur introuvable.',
  '400_418': 'Document introuvable.',
  '400_421': 'Champ de signature introuvable.',
  '400_422': 'Ce tag est déjà utilisé sur ce document.',
  '400_430': 'Impossible de soumettre : ajoutez au moins un document.',
  '400_431': 'Impossible de soumettre : ajoutez au moins un signataire.',
  '400_432': 'Impossible de soumettre : chaque signataire doit avoir un champ de signature.',
  '400_433': 'Impossible de soumettre : chaque document doit porter un champ de signature.',
  '400_442': 'Le nom de la demande est obligatoire.',
  '400_447': 'Cette demande a expiré.',
  '400_445': "Ce tag est introuvable dans le PDF. Vérifiez qu'il est bien écrit dans le document.",
  '400_460': 'Demande introuvable.',
  '400_470': 'Le prénom est obligatoire.',
  '400_471': 'Le nom est obligatoire.',
  NETWORK: 'Le serveur est injoignable. Vérifiez votre connexion.',
  HTTP_413: 'Fichiers trop volumineux (10 Mo par fichier, 50 Mo au total).',
};

export function errorMessage(error: AppError): string {
  return MESSAGES[error.code] ?? `${error.message} (${error.code})`;
}
