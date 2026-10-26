# Architecture du front Studely Signing

Le code est organisé **par feature**, et chaque feature est découpée **en couches** (clean architecture).
Ces règles sont vérifiées par ESLint (`npm run lint`, règles `boundaries/*` et `no-restricted-imports` dans `eslint.config.js`).

## Arborescence

```
src/
├── environments/                    # apiBaseUrl, useMocks
└── app/
    ├── app.config.ts / app.routes.ts # racine : ne voit les features que par leur *.routes.ts
    ├── core/                         # transverse, technique : config, http, auth, layout
    ├── shared/
    │   ├── domain/                   # types métier partagés (AppError, Page)
    │   └── ui/                       # composants d'affichage sans logique métier
    └── features/
        ├── signature-requests/       # back-office : demandes de signature
        │   ├── domain/               # modèles, règles pures, ports (classes abstraites)
        │   ├── application/          # cas d'usage et stores (signals)
        │   ├── infrastructure/       # adaptateurs : http/ (DTO + mappers), in-memory/
        │   ├── presentation/         # pages/ et components/
        │   └── signature-requests.routes.ts   # composition root de la feature
        └── signing-portal/           # portail public du signataire
```

## Sens des dépendances

```
presentation ──► application ──► domain ◄── infrastructure
      │                              ▲            │
      └──────────────────────────────┘            └──► core (config, http)
```

| Depuis | Peut importer |
|---|---|
| `domain` | son propre `domain`, `shared/domain`. **Ni Angular ni rxjs.** |
| `application` | `domain` et `application` de la même feature, `shared/domain` |
| `infrastructure` | `domain` et `infrastructure` de la même feature, `core`, `shared/domain` |
| `presentation` | `application`, `domain`, `presentation` de la même feature, `core`, `shared` |
| `<feature>.routes.ts` | toutes les couches de **sa** feature, `core`, `shared` |
| `app.*` | `core`, `shared`, `environments`, les `*.routes.ts` des features |
| `core` | `core`, `shared`, `environments` |

Une feature n'importe **jamais** une autre feature. Ce qui doit être partagé descend dans `shared/` (ou `core/` si c'est technique).

## Ports et adaptateurs

- Un port est une **classe abstraite** dans `domain/` (ex. `SignatureRequestRepository`). Elle sert de jeton d'injection Angular sans que le domaine importe Angular.
- Les ports renvoient des `Promise` (pas d'`Observable` dans le domaine). Les adaptateurs HTTP utilisent `firstValueFrom`.
- Les DTO de l'API restent dans `infrastructure/http/` ; un mapper les convertit en modèle métier.
- Le `*.routes.ts` de la feature choisit l'adaptateur : en mémoire si `environment.useMocks`, HTTP sinon.
  C'est ce qui remplace l'« interceptor de mock » du planning : chaque feature avance sans backend, endpoint par endpoint.

## Erreurs

`core/http/api-error.interceptor.ts` convertit toute erreur HTTP en `AppError { status, code, message }`, où `code` est le code `SigningError` du backend (`400_413`…). Les couches application et présentation ne voient jamais `HttpErrorResponse`.

## Ajouter une feature

1. Créer `features/<nom>/{domain,application,infrastructure,presentation}`.
2. Écrire le modèle et le port dans `domain/`, les cas d'usage dans `application/`.
3. Écrire l'adaptateur HTTP et l'adaptateur en mémoire dans `infrastructure/`.
4. Créer `features/<nom>/<nom>.routes.ts` qui fournit les providers et charge les pages en lazy-loading.
5. Brancher la route dans `app.routes.ts`.

`features/signature-requests` sert d'exemple complet (liste des demandes, FE-06).

## Tests

- Règles du domaine : tests purs, sans `TestBed` (`*.rules.spec.ts`).
- Stores : `TestBed` avec un faux port.
- Feature : `*.routes.spec.ts` monte les routes avec l'adaptateur en mémoire.
