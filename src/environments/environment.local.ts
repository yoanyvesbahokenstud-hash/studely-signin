import { Environment } from './environment.model';

/** `npm run start:local` : backend `studely-avi-signing` local et service d'auth AVI de dev, sans données simulées. */
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  // Relayé par le proxy de `ng serve` (proxy.conf.json) vers dev.api.avi.studely.com.
  authBaseUrl: '/avi-auth/api/v1',
  useMocks: false,
};
