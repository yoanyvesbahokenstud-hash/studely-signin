import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { environment } from '@env/environment';
import { AuthSession } from '@core/auth/auth-session';
import { authTokenInterceptor } from '@core/auth/auth-token.interceptor';
import { AviAuthSession } from '@core/auth/avi-auth-session';
import { DevAuthSession } from '@core/auth/dev-auth-session';
import { APP_CONFIG } from '@core/config/app-config';
import { apiErrorInterceptor } from '@core/http/api-error.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
    { provide: APP_CONFIG, useValue: environment },
    // En mode mock, connexion simulée ; sinon, service d'auth AVI (jetons Cognito).
    AviAuthSession,
    DevAuthSession,
    {
      provide: AuthSession,
      useFactory: () =>
        inject(APP_CONFIG).useMocks ? inject(DevAuthSession) : inject(AviAuthSession),
    },
  ],
};
