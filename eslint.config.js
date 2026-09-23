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
          group: ['**/content/**', '**/world/**', '**/simulation/**', '**/persistence/**', '**/protocol/**', '**/server/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
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
          group: ['**/world/**', '**/simulation/**', '**/persistence/**', '**/protocol/**', '**/server/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
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
          group: ['**/simulation/**', '**/persistence/**', '**/protocol/**', '**/server/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
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
          group: ['**/persistence/**', '**/protocol/**', '**/server/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
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
          group: ['**/protocol/**', '**/server/**', '**/client/**', 'pixi.js', 'pixi.js/**'],
          message: 'persistence must remain independent from protocol/server/presentation.',
        },
        {
          group: ['**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**'],
          message: 'persistence must use public domain contracts.',
        },
      ]),
    },
  },
  {
    files: ['src/protocol/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: [
            '**/foundation/**',
            '**/content/**',
            '**/world/**',
            '**/simulation/**',
            '**/persistence/**',
            '**/server/**',
            '**/client/**',
            'pixi.js',
            'pixi.js/**',
          ],
          message: 'protocol must remain transport-neutral DTO/schema code with no domain/server/client imports.',
        },
      ]),
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: [
            '**/client/**',
            'pixi.js',
            'pixi.js/**',
          ],
          message: 'server authority must remain headless and independent from client/presentation.',
        },
        {
          group: [
            '**/simulation/internal/**',
            '**/world/internal/**',
            '**/content/internal/**',
            '**/persistence/internal/**',
          ],
          message: 'server must compose public authority/persistence surfaces only.',
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
          group: ['**/server/**', '**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**', '**/persistence/internal/**'],
          message: 'client composition must not import server and must use public module surfaces.',
        },
      ]),
    },
  },
  {
    files: ['src/client/presentation/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        {
          group: ['**/server/**', '**/simulation/internal/**', '**/world/internal/**', '**/content/internal/**', '**/persistence/internal/**'],
          message: 'presentation must not import server and must consume public read models/contracts only.',
        },
      ]),
    },
  },
);
