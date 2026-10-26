export interface Environment {
  production: boolean;
  /** API du service de signature (`studely-avi-signing`). */
  apiBaseUrl: string;
  /** API du service d'authentification AVI (`/account/signIn`), qui délivre les jetons Cognito. */
  authBaseUrl: string;
  useMocks: boolean;
}
