# Studely Signing — front

Angular 21 (standalone, signals), Angular Material, Vitest.

```bash
npm install
npm start          # http://localhost:4200, données simulées (environment.development.ts → useMocks: true)
npm test           # tests unitaires (Vitest)
npm run lint       # ESLint, dont les règles d'architecture
npm run build      # build de production
```

- Connexion : `/login`
- Back-office : `/requests` (liste, création) et `/requests/:id` (détail, édition du brouillon, soumission, annulation)
- Portail signataire : `/sign/:requestId/:signerId`, le format des liens envoyés par le backend
  (`SignatureLinkGenerator`). En mode mock : `/sign/req-2/s-2`, e-mail `noah.bernard@example.com`, code `123456`.

Organisation du code et règles de dépendances : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Brancher le backend local

1. Démarrer `studely-avi-signing` (port 8080). L'API est documentée sur http://localhost:8080/swagger-ui.html.
2. Lancer `npm run start:local` (configuration `local` : vrai backend, pas de données simulées).
3. Se connecter sur `/login` avec un compte Studely ayant le rôle `ROLE_GATEKEEPER_ADMIN` ou `ROLE_STUDELY_CLIENT`.

## Connexion

- `/login` appelle le service d'auth AVI (`POST /account/signIn`), qui renvoie un `id_token` Cognito.
  En local, `ng serve` relaie `/avi-auth/**` vers `https://dev.api.avi.studely.com/auth/**` (`proxy.conf.json`).
- Le jeton est gardé en `sessionStorage` (limité à l'onglet) ; la session se ferme à son expiration
  ou sur un `401` du backend, avec retour à `/login` puis à la page demandée.
- En mode mock (`useMocks: true`), n'importe quels identifiants sont acceptés.

## Design

Design system maison (pas de Material) : tokens et composants de base dans `src/styles.scss`
(couleurs Studely, mode clair/sombre), composants réutilisables dans `src/app/shared/ui/`
(`sts-icon`, `sts-badge`, `sts-modal`, `sts-pagination`, `sts-empty-state`, toasts via `ToastService`).

## Portail signataire

Le signataire est un **étudiant Studely** : il se connecte avec son compte (rôle `ROLE_STUDENT`), car le
service OTP (`studely-notification-service`, `/api/v2/otp/**`) n'accepte que ce rôle. Son `id_token` est
transmis au backend de signature, qui le relaie au service OTP. Sa session (`sts.signer-session`) est
distincte de celle du gestionnaire.

Parcours : connexion → vérification de l'e-mail (`/signer/verify-link`) → lecture des documents et choix
du canal → code (`/signer/signing-otp`) → signature (`/signer/execute-signing`).
