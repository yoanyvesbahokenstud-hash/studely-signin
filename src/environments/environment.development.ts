import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  // Relayé par le proxy de `ng serve` (proxy.conf.json) vers dev.api.avi.studely.com, pour éviter le CORS.
  authBaseUrl: '/avi-auth/api/v1',
  // Tant que le backend ne livre pas un endpoint, les features utilisent leur adaptateur en mémoire.
  useMocks: false,
};
