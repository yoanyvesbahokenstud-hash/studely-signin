import { Environment } from './environment.model';

// Injectées au build par `npm run build` (`ng build --define`) depuis les variables d'environnement
// `API_BASE_URL` et `AUTH_BASE_URL` (ex. : variables d'environnement Amplify). Vides : valeurs par défaut ci-dessous.
declare const NG_APP_API_BASE_URL: string;
declare const NG_APP_AUTH_BASE_URL: string;

// `typeof` évite une ReferenceError quand le build ne passe pas par `--define` (ex. : `ng test`).
const apiBaseUrl = typeof NG_APP_API_BASE_URL !== 'undefined' ? NG_APP_API_BASE_URL : '';
const authBaseUrl = typeof NG_APP_AUTH_BASE_URL !== 'undefined' ? NG_APP_AUTH_BASE_URL : '';

export const environment: Environment = {
  production: true,
  apiBaseUrl: apiBaseUrl || '/api/v1',
  // TODO(FE-03): confirmer l'URL du service d'auth AVI en production.
  authBaseUrl: authBaseUrl || '/auth/api/v1',
  useMocks: false,
};
