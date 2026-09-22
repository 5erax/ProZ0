# Phase 0 browser runtime workflow

Task: P0-ENG-001  
Source Issue: #11

## Toolchain

- Node.js 24 LTS
- npm with committed package-lock.json
- TypeScript
- Vite
- PixiJS v8 using WebGL/WebGL2 for Phase 0
- ESLint
- Vitest
- Vitest Browser Mode + Playwright/Chromium
- Playwright E2E

## Clean checkout

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:determinism
npm run build
npm run test:browser
npm run test:e2e
```

## Local development

```bash
npm ci
npm run dev
```

## Production verification

```bash
npm run build
npm run preview
```

## Architecture boundaries

Runtime source is separated into:

- `src/foundation` — platform-neutral primitives.
- `src/content` — validated read-only definitions.
- `src/world` — authoritative world boundary.
- `src/simulation` — renderer-independent authoritative simulation boundary.
- `src/persistence` — durable storage adapter boundary.
- `src/client` — browser composition, input, timing, and Pixi presentation.

Only `src/client/presentation/**` may import `pixi.js`.

The bootstrap intentionally does not implement player movement, collision resolution, chunk generation, save/load storage, or multiplayer transport. Those remain downstream authorized tasks.
