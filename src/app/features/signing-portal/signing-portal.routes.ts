import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { SignerPortalRepository } from './domain/signer-portal.repository';
import { StudentAuth } from './domain/student-auth';
import { AviStudentAuth } from './infrastructure/auth/avi-student-auth';
import { DevStudentAuth } from './infrastructure/auth/dev-student-auth';
import { HttpSignerPortalRepository } from './infrastructure/http/http-signer-portal.repository';
import { InMemorySignerPortalRepository } from './infrastructure/in-memory/in-memory-signer-portal.repository';

/**
 * Composition root du portail signataire. Le lien reçu par e-mail a la forme
 * `{web.studely.signing.base-url}/sign/{idSignatureRequest}/{idSigner}` (`SignatureLinkGenerator`).
 */
export const SIGNING_PORTAL_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpSignerPortalRepository,
      InMemorySignerPortalRepository,
      AviStudentAuth,
      DevStudentAuth,
      {
        provide: SignerPortalRepository,
        useFactory: () =>
          inject(APP_CONFIG).useMocks
            ? inject(InMemorySignerPortalRepository)
            : inject(HttpSignerPortalRepository),
      },
      {
        provide: StudentAuth,
        useFactory: () =>
          inject(APP_CONFIG).useMocks ? inject(DevStudentAuth) : inject(AviStudentAuth),
      },
    ],
    children: [
      {
        path: ':requestId/:signerId',
        title: 'Signature électronique',
        loadComponent: () =>
          import('./presentation/pages/signing-page/signing-page').then((m) => m.SigningPage),
      },
      {
        path: '**',
        title: 'Lien invalide',
        loadComponent: () =>
          import('./presentation/pages/invalid-link/invalid-link').then((m) => m.InvalidLink),
      },
    ],
  },
];
