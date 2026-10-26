import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  // TODO(FE-03): confirmer l'URL du service d'auth AVI en production.
  authBaseUrl: '/auth/api/v1',
  useMocks: false,
};
