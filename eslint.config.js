import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

function restricted(patterns) {
  return ['error', { patterns }];
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['src/foundation/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/content/**', '**/world/**', '**/simulation/**', '**/persistence/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'foundation must remain platform-neutral and dependency-free.',
        },
      ]),
    },
  },
  {
    files: ['src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/world/**', '**/simulation/**', '**/persistence/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'content may depend only on foundation.',
        },
      ]),
    },
  },
  {
    files: ['src/world/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/simulation/**', '**/persistence/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'world cannot depend on higher runtime or presentation modules.',
        },
        {
          group: ['**/content/internal/**'],
          message: 'world must consume content through its public surface.',
        },
      ]),
    },
  },
  {
    files: ['src/simulation/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/persistence/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'simulation cannot depend on persistence adapters or presentation.',
        },
        {
          group: ['**/world/internal/**', '**/content/internal/**'],
          message: 'simulation must consume other modules through public surfaces.',
        },
      ]),
    },
  },
  {
    files: ['src/persistence/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'persistence must remain independent from presentation.',
        },
        {
          group: ['**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**'],
          message: 'persistence must use public domain contracts.',
        },
      ]),
    },
  },
  {
    files: ['src/client/**/*.ts'],
    ignores: ['src/client/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['pixi.js', 'pixi.js/**'],
          message: 'Only src/client/presentation may import PixiJS.',
        },
        {
          group: ['**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**', '**/persistence/internal/**'],
          message: 'client composition must use public module surfaces.',
        },
      ]),
    },
  },
  {
    files: ['src/client/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**', '**/persistence/internal/**'],
          message: 'presentation must consume public read models/contracts only.',
        },
      ]),
    },
  },
);
