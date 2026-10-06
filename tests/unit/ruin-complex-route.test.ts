import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';
import { fromWorldPosition } from '../../src/world/chunks/ChunkCoord';
import {
  colonyRuinComplexRoute,
  colonyRuinObservedRouteView,
  type ColonyRuinRouteNodeId,
} from '../../src/world/phase2/ColonyRuinComplexRoute';
import { colonyRiverTerrainAt } from '../../src/world/phase2/ColonyHydrology';
import { soloCaveRegistry } from '../../src/world/phase2/SoloCaveRegistry';
import { mountainAt } from '../../src/world/phase2/SoloMountain';

const versions = [3, 4, 5] as const;

function reachable(
  route: ReturnType<typeof colonyRuinComplexRoute>,
  start: ColonyRuinRouteNodeId,
): Set<ColonyRuinRouteNodeId> {
  const visited = new Set<ColonyRuinRouteNodeId>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of route.edges) {
      const next =
        edge.from === current
          ? edge.to
          : edge.to === current
            ? edge.from
            : null;
      if (next !== null && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

function segmentGround(
  seed: string,
  version: number,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 2));
  const portals = soloCaveRegistry(seed, version);
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const position = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (colonyRiverTerrainAt(seed, position) !== 'ground') return false;
    if (mountainAt(position, portals).height !== 0) return false;
  }
  return true;
}

describe('P2-WORLD-IMPL-001 authored ruin-complex route graph', () => {
  it('is deterministic, reversible, dry and readable from both approach traces across supported generation identities', () => {
    for (let seedIndex = 0; seedIndex < 20; seedIndex += 1) {
      const seed = 'ruin-route-seed:' + String(seedIndex);
      for (const version of versions) {
        const first = colonyRuinComplexRoute(seed, version);
        expect(colonyRuinComplexRoute(seed, version)).toEqual(first);
        expect(first.generationVersion).toBe(version);
        expect(first.ruinAnchorPosition).toEqual(
          getPhase1WorldLandmarks(seed).ruinPosition,
        );

        expect(first.nodes).toHaveLength(5);
        expect(
          first.nodes.filter(
            (node) => node.kind === 'complex-subspace',
          ).map((node) => node.subspace).sort(),
        ).toEqual(['covered-edge', 'open-court']);

        expect(first.edges.every((edge) => edge.reversible)).toBe(true);
        expect(first.edges.every((edge) => !edge.requiresCombat)).toBe(true);

        for (const node of first.nodes) {
          expect(node.id.startsWith('route:ruin:')).toBe(true);
          expect(colonyRiverTerrainAt(seed, node.position)).toBe('ground');
          expect(
            mountainAt(
              node.position,
              soloCaveRegistry(seed, version),
            ).height,
          ).toBe(0);
        }

        const byId = new Map(
          first.nodes.map((node) => [node.id, node.position]),
        );
        for (const routeEdge of first.edges) {
          expect(
            segmentGround(
              seed,
              version,
              byId.get(routeEdge.from)!,
              byId.get(routeEdge.to)!,
            ),
          ).toBe(true);
        }

        for (const trace of [
          'route:ruin:trace-a',
          'route:ruin:trace-b',
        ] as const) {
          const seen = reachable(first, trace);
          expect(seen.has('route:ruin:open-court')).toBe(true);
          expect(seen.has('route:ruin:covered-edge')).toBe(true);
          expect(seen.has('route:ruin:site-threshold')).toBe(true);
        }
      }
    }
  });

  it('does not reveal hidden route-node identity or coordinates from a trace-only observed view', () => {
    const route = colonyRuinComplexRoute('p1-world-golden', 5);
    const traceId = 'route:ruin:trace-a' as const;
    const view = colonyRuinObservedRouteView(route, [traceId]);

    expect(view.nodes.map((node) => node.id)).toEqual([traceId]);
    expect(view.edges).toEqual([]);
    expect(view.frontiers.length).toBeGreaterThan(0);
    expect(view.frontiers.every((frontier) => !frontier.destinationKnown))
      .toBe(true);

    const serialized = JSON.stringify(view.frontiers);
    for (const hidden of route.nodes.filter((node) => node.id !== traceId)) {
      expect(serialized).not.toContain(hidden.id);
      expect(serialized).not.toContain(
        JSON.stringify(hidden.position),
      );
    }

    const reversed = colonyRuinObservedRouteView(route, [
      'route:ruin:covered-edge',
      'route:ruin:site-threshold',
    ]);
    expect(reversed.nodes.map((node) => node.id).sort()).toEqual([
      'route:ruin:covered-edge',
      'route:ruin:site-threshold',
    ]);
    expect(reversed.edges).toHaveLength(1);
  });

  it('does not mutate generated chunks, generation version or generated entity IDs', () => {
    const seed = 'p1-world-golden';
    const catalog = createPhase1ContentCatalog();
    const generator = new Phase1ChunkGenerator(catalog);
    const ruin = getPhase1WorldLandmarks(seed).ruinPosition;
    const coord = fromWorldPosition(ruin);

    const before = generator.generate({
      worldSeed: seed,
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
      coord,
    });
    colonyRuinComplexRoute(seed, PHASE1_WORLD_GENERATION_VERSION);
    const after = generator.generate({
      worldSeed: seed,
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
      coord,
    });

    expect(PHASE1_WORLD_GENERATION_VERSION).toBe(5);
    expect(after).toEqual(before);
    expect(after.entities.map((entity) => entity.entityId)).toEqual(
      before.entities.map((entity) => entity.entityId),
    );
    expect(after.baseGenerationFingerprint).toBe(
      before.baseGenerationFingerprint,
    );
  });
});
