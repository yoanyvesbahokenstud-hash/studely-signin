import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { CreateSignatureRequest } from './application/create-signature-request.use-case';
import { GetSignatureRequest } from './application/get-signature-request.use-case';
import { SearchSignatureRequests } from './application/search-signature-requests.use-case';
import { SignatureRequestRepository } from './domain/signature-request.repository';
import { HttpSignatureRequestRepository } from './infrastructure/http/http-signature-request.repository';
import { InMemorySignatureRequestRepository } from './infrastructure/in-memory/in-memory-signature-request.repository';

/**
 * Point d'entrée (composition root) de la feature : seul fichier autorisé à voir toutes ses couches.
 * C'est ici qu'on branche le port du domaine sur l'adaptateur HTTP ou en mémoire.
 */
export const SIGNATURE_REQUEST_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpSignatureRequestRepository,
      InMemorySignatureRequestRepository,
      {
        provide: SignatureRequestRepository,
        useFactory: () =>
          inject(APP_CONFIG).useMocks
            ? inject(InMemorySignatureRequestRepository)
            : inject(HttpSignatureRequestRepository),
      },
      SearchSignatureRequests,
      GetSignatureRequest,
      CreateSignatureRequest,
    ],
    children: [
      {
        path: '',
        title: 'Demandes de signature',
        loadComponent: () =>
          import('./presentation/pages/signature-request-list/signature-request-list').then(
            (m) => m.SignatureRequestList,
          ),
      },
      {
        path: ':id',
        title: 'Demande de signature',
        loadComponent: () =>
          import('./presentation/pages/signature-request-detail/signature-request-detail').then(
            (m) => m.SignatureRequestDetail,
          ),
      },
    ],
  },
];
