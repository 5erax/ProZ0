import { describe, expect, it } from 'vitest';
import { Phase1AuthorityBundle } from '../../src/integration/Phase1AuthorityBundle';
import { composePhase1SaveV2 } from '../../src/integration/Phase1SaveV2Composer';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState, SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../../src/persistence';
import { createPhase1ProductReviewWorldRenderer } from '../../src/client/runtime/Phase1ProductReviewWorldRenderer';
import { PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS } from '../../src/world/phase1/ExplorationGrid';

describe('Phase 1 environmental projection', () => {
  it('keeps known grass when approached, culled, returned to and reopened', async () => {
    const root = document.createElement('div'); document.body.append(root);
    const config = { worldId: 'world:flora-stability', worldSeed: 'p1-world-golden', playerIds: ['gardener'],
      interactionRangeWorldUnits: 1.25, spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25 };
    const bundle = await Phase1AuthorityBundle.create(config);
    let renderer: ReturnType<typeof createPhase1ProductReviewWorldRenderer> | null = null;
    let reopened: Phase1AuthorityBundle | null = null;
    try {
      for (const x of [-8, 0, 8]) for (const y of [-8, 0, 8]) {
        bundle.getRuntime('gardener').relocatePlayer({ x, y }); await bundle.stepSolo();
      }
      bundle.getRuntime('gardener').relocatePlayer({ x: 0, y: 0 });
      renderer = createPhase1ProductReviewWorldRenderer(root, bundle, 'gardener'); renderer.render();
      const flora = root.querySelector<HTMLElement>('[data-world-role="flora-decor"]');
      expect(flora).not.toBeNull(); if (flora === null) throw Error('No known foliage fixture');
      const terrain = root.querySelector('[data-world-role="terrain"]');
      const fog = root.querySelector('[data-world-role="fog"]');
      const mutations: MutationRecord[] = [];
      const observer = new MutationObserver(records => mutations.push(...records));
      observer.observe(root, { childList: true, subtree: true });
      for (let frame = 0; frame < 8; frame++) renderer.render();
      await Promise.resolve(); observer.disconnect();
      expect(mutations).toHaveLength(0);
      expect(root.querySelector('[data-world-role="flora-decor"]')).toBe(flora);
      expect(root.querySelector('[data-world-role="terrain"]')).toBe(terrain);
      expect(root.querySelector('[data-world-role="fog"]')).toBe(fog);
      const identity = flora.dataset.worldId!;
      const [, gx, gy] = identity.split(':');
      const position = { x: (Number(gx) + .5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
        y: (Number(gy) + .5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS };
      const visible = () => [...root.querySelectorAll<HTMLElement>('[data-world-role="flora-decor"]')]
        .some(element => element.dataset.worldId === identity);
      bundle.getRuntime('gardener').relocatePlayer(position); renderer.render(); expect(visible()).toBe(true);
      bundle.getRuntime('gardener').relocatePlayer({ x: position.x + 50, y: position.y + 50 });
      renderer.render(); expect(visible()).toBe(false);
      bundle.getRuntime('gardener').relocatePlayer(position); renderer.render(); expect(visible()).toBe(true);
      expect(root.querySelector('[data-world-role="flora-decor"][data-exploration-state="UNEXPLORED"]')).toBeNull();
      const request = composePhase1SaveV2(bundle, { nowUtc: '2026-09-30T00:00:00.000Z' });
      const save = reconstructPhase1ReopenState({ formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle', world: request.world, players: request.players, containers: request.containers,
        chunks: request.chunks, footholds: request.footholds, structures: request.structures }, createPhase1SaveV2Compatibility(bundle.catalog, [3]));
      expect(save.ok).toBe(true); if (!save.ok) throw Error(save.message);
      reopened = await Phase1AuthorityBundle.create({ ...config, reopen: save.value });
      renderer.destroy(); renderer = createPhase1ProductReviewWorldRenderer(root, reopened, 'gardener');
      renderer.render(); expect(visible()).toBe(true);
    } finally { renderer?.destroy(); await reopened?.destroy(); await bundle.destroy(); root.remove(); }
  }, 15_000);
});
