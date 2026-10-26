// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

const FEATURE_LAYERS = [
  'feature-domain',
  'feature-application',
  'feature-infrastructure',
  'feature-presentation',
];

/** Cible : une couche donnée de la même feature que le fichier qui importe. */
const sameFeature = (type) => ({
  to: { element: { type, captured: { feature: '{{ from.element.captured.feature }}' } } },
});

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'sts',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'sts',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  // Architecture : sens des dépendances entre couches et isolation des features.
  // Voir docs/ARCHITECTURE.md.
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/include': ['src/**/*.ts'],
      // Motifs comparés au chemin complet depuis la racine du projet.
      'boundaries/elements': [
        {
          type: 'feature-domain',
          pattern: 'src/app/features/*/domain',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-application',
          pattern: 'src/app/features/*/application',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-infrastructure',
          pattern: 'src/app/features/*/infrastructure',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-presentation',
          pattern: 'src/app/features/*/presentation',
          capture: ['feature'],
          partialMatch: false,
        },
        { type: 'core', pattern: 'src/app/core', partialMatch: false },
        { type: 'shared-domain', pattern: 'src/app/shared/domain', partialMatch: false },
        { type: 'shared-ui', pattern: 'src/app/shared/ui', partialMatch: false },
        { type: 'environments', pattern: 'src/environments', partialMatch: false },
      ],
      // Fichiers hors de toute couche : point d'entrée d'une feature et racine de l'app.
      'boundaries/files': [
        { category: 'feature-entry', pattern: 'src/app/features/*/*.ts', capture: ['feature'] },
        { category: 'app', pattern: 'src/app/*.ts' },
        { category: 'app', pattern: 'src/main.ts' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'shared-domain' } },
              allow: { to: { element: { type: 'shared-domain' } } },
            },
            {
              from: { element: { type: 'shared-ui' } },
              allow: { to: { element: { types: { anyOf: ['shared-domain', 'shared-ui'] } } } },
            },
            {
              from: { element: { type: 'environments' } },
              allow: { to: { element: { type: 'environments' } } },
            },
            {
              from: { element: { type: 'core' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['core', 'shared-domain', 'shared-ui', 'environments'] },
                  },
                },
              },
            },

            // Domaine : ne connaît que lui-même et le domaine partagé.
            { from: { element: { type: 'feature-domain' } }, allow: sameFeature('feature-domain') },
            {
              from: { element: { type: 'feature-domain' } },
              allow: { to: { element: { type: 'shared-domain' } } },
            },

            // Application : orchestre le domaine via ses ports.
            {
              from: { element: { type: 'feature-application' } },
              allow: sameFeature('feature-application'),
            },
            {
              from: { element: { type: 'feature-application' } },
              allow: sameFeature('feature-domain'),
            },
            {
              from: { element: { type: 'feature-application' } },
              allow: { to: { element: { type: 'shared-domain' } } },
            },

            // Infrastructure : implémente les ports du domaine (HTTP, mémoire).
            {
              from: { element: { type: 'feature-infrastructure' } },
              allow: sameFeature('feature-infrastructure'),
            },
            {
              from: { element: { type: 'feature-infrastructure' } },
              allow: sameFeature('feature-domain'),
            },
            {
              from: { element: { type: 'feature-infrastructure' } },
              allow: { to: { element: { types: { anyOf: ['core', 'shared-domain'] } } } },
            },

            // Présentation : consomme l'application, jamais l'infrastructure.
            {
              from: { element: { type: 'feature-presentation' } },
              allow: sameFeature('feature-presentation'),
            },
            {
              from: { element: { type: 'feature-presentation' } },
              allow: sameFeature('feature-application'),
            },
            {
              from: { element: { type: 'feature-presentation' } },
              allow: sameFeature('feature-domain'),
            },
            {
              from: { element: { type: 'feature-presentation' } },
              allow: {
                to: { element: { types: { anyOf: ['core', 'shared-domain', 'shared-ui'] } } },
              },
            },

            // Point d'entrée d'une feature : câble ses propres couches.
            ...FEATURE_LAYERS.map((type) => ({
              from: { file: { categories: 'feature-entry' } },
              allow: {
                to: {
                  element: { type, captured: { feature: '{{ from.file.captured.feature }}' } },
                },
              },
            })),
            {
              from: { file: { categories: 'feature-entry' } },
              allow: {
                to: {
                  file: {
                    categories: 'feature-entry',
                    captured: { feature: '{{ from.file.captured.feature }}' },
                  },
                },
              },
            },
            {
              from: { file: { categories: 'feature-entry' } },
              allow: {
                to: { element: { types: { anyOf: ['core', 'shared-domain', 'shared-ui'] } } },
              },
            },

            // Racine de l'app : ne voit les features que par leur point d'entrée.
            {
              from: { file: { categories: 'app' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['core', 'shared-domain', 'shared-ui', 'environments'] },
                  },
                },
              },
            },
            {
              from: { file: { categories: 'app' } },
              allow: { to: { file: { categories: { anyOf: ['app', 'feature-entry'] } } } },
            },
          ],
        },
      ],
    },
  },
  // Le domaine reste du TypeScript pur : aucun framework, aucune lib d'infrastructure.
  {
    files: ['src/app/features/*/domain/**/*.ts', 'src/app/shared/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', 'rxjs', 'rxjs/*'],
              message: 'Le domaine ne dépend pas du framework.',
            },
          ],
        },
      ],
    },
  },
]);
