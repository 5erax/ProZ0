import type { WorldPosition } from '../../foundation';
import { getPhase1WorldLandmarks } from '../phase1/Phase1ChunkGenerator';
import {
  colonyRiverLandmarks,
  colonyRiverTerrainAt,
} from './ColonyHydrology';
import { soloCaveRegistry } from './SoloCaveRegistry';
import { mountainAt } from './SoloMountain';

export type ColonyRuinRouteNodeId =
  | 'route:ruin:trace-a'
  | 'route:ruin:trace-b'
  | 'route:ruin:site-threshold'
  | 'route:ruin:open-court'
  | 'route:ruin:covered-edge';

export type ColonyRuinRouteNodeKind =
  | 'trace'
  | 'site-threshold'
  | 'complex-subspace';

export type ColonyRuinOrientationContext =
  | 'open-ground'
  | 'river-edge'
  | 'cave-ridge';

export interface ColonyRuinRouteNode {
  readonly id: ColonyRuinRouteNodeId;
  readonly kind: ColonyRuinRouteNodeKind;
  readonly position: WorldPosition;
  readonly observation: string;
  readonly unresolved: string;
  readonly orientationContext: ColonyRuinOrientationContext;
  readonly subspace?: 'open-court' | 'covered-edge';
}

export interface ColonyRuinRouteEdge {
  readonly from: ColonyRuinRouteNodeId;
  readonly to: ColonyRuinRouteNodeId;
  readonly reversible: true;
  readonly requiresCombat: false;
  readonly cue:
    | 'broken-paving'
    | 'terrain-opening'
    | 'construction-continuity'
    | 'return-silhouette';
}

export interface ColonyRuinComplexRoute {
  readonly seed: string;
  readonly generationVersion: number;
  readonly ruinAnchorPosition: WorldPosition;
  readonly nodes: readonly ColonyRuinRouteNode[];
  readonly edges: readonly ColonyRuinRouteEdge[];
}

export interface ColonyRuinObservedRouteView {
  readonly nodes: readonly ColonyRuinRouteNode[];
  readonly edges: readonly ColonyRuinRouteEdge[];
  readonly frontiers: readonly {
    readonly from: ColonyRuinRouteNodeId;
    readonly cue: ColonyRuinRouteEdge['cue'];
    readonly destinationKnown: false;
  }[];
}

const cache = new Map<string, ColonyRuinComplexRoute>();

function add(
  point: WorldPosition,
  direction: WorldPosition,
  distance: number,
): WorldPosition {
  return Object.freeze({
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
  });
}

function authoredOffsets(): readonly WorldPosition[] {
  const offsets: WorldPosition[] = [Object.freeze({ x: 0, y: 0 })];
  for (let radius = 4; radius <= 48; radius += 4) {
    for (let x = -radius; x <= radius; x += 4) {
      offsets.push(Object.freeze({ x, y: -radius }));
      offsets.push(Object.freeze({ x, y: radius }));
    }
    for (let y = -radius + 4; y <= radius - 4; y += 4) {
      offsets.push(Object.freeze({ x: -radius, y }));
      offsets.push(Object.freeze({ x: radius, y }));
    }
  }
  return Object.freeze(offsets);
}

const AUTHORED_OFFSETS = authoredOffsets();

function routeSurfacePassable(
  seed: string,
  generationVersion: number,
  point: WorldPosition,
): boolean {
  if (colonyRiverTerrainAt(seed, point) !== 'ground') return false;
  const mountain = mountainAt(
    point,
    soloCaveRegistry(seed, generationVersion),
  );
  return mountain.height === 0;
}

function segmentPassable(
  seed: string,
  generationVersion: number,
  from: WorldPosition,
  to: WorldPosition,
): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 2));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (!routeSurfacePassable(seed, generationVersion, {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    })) {
      return false;
    }
  }
  return true;
}

function selectPassablePosition(
  seed: string,
  generationVersion: number,
  candidate: WorldPosition,
  occupied: readonly WorldPosition[],
  connectedTo: readonly WorldPosition[],
): WorldPosition {
  for (const offset of AUTHORED_OFFSETS) {
    const position = Object.freeze({
      x: candidate.x + offset.x,
      y: candidate.y + offset.y,
    });
    if (!routeSurfacePassable(seed, generationVersion, position)) continue;
    if (
      occupied.some(
        (other) =>
          Math.hypot(other.x - position.x, other.y - position.y) < 8,
      )
    ) {
      continue;
    }
    if (
      connectedTo.some(
        (other) =>
          !segmentPassable(
            seed,
            generationVersion,
            other,
            position,
          ),
      )
    ) {
      continue;
    }
    return position;
  }

  throw new Error(
    'No reversible dry ruin-route position satisfies existing terrain authority.',
  );
}

function orientationContext(
  seed: string,
  generationVersion: number,
  position: WorldPosition,
): ColonyRuinOrientationContext {
  const river = colonyRiverLandmarks(seed);
  const riverDistance = Math.min(
    ...[
      river.source,
      river.mouth,
      ...river.crossings,
      ...river.confluences,
    ].map((landmark) =>
      Math.hypot(
        landmark.x - position.x,
        landmark.y - position.y,
      ),
    ),
  );
  const caveDistance = Math.min(
    ...soloCaveRegistry(seed, generationVersion).map((portal) =>
      Math.hypot(
        portal.position.x - position.x,
        portal.position.y - position.y,
      ),
    ),
  );

  if (riverDistance <= 64 && riverDistance <= caveDistance) {
    return 'river-edge';
  }
  if (caveDistance <= 64) return 'cave-ridge';
  return 'open-ground';
}

function freezeNode(
  seed: string,
  generationVersion: number,
  node: Omit<ColonyRuinRouteNode, 'orientationContext'>,
): ColonyRuinRouteNode {
  return Object.freeze({
    ...node,
    position: Object.freeze({ ...node.position }),
    orientationContext: orientationContext(
      seed,
      generationVersion,
      node.position,
    ),
  });
}

function edge(
  from: ColonyRuinRouteNodeId,
  to: ColonyRuinRouteNodeId,
  cue: ColonyRuinRouteEdge['cue'],
): ColonyRuinRouteEdge {
  return Object.freeze({
    from,
    to,
    cue,
    reversible: true,
    requiresCombat: false,
  });
}

/**
 * Derived Phase-2 route composition around the existing Phase-1 ruin.
 *
 * This seam does not create generated entities, mutate terrain, allocate loot,
 * or add persisted state. The same seed/generation identity therefore keeps
 * the existing world/save/entity IDs unchanged while exposing authored route
 * geometry for world-domain consumers.
 */
export function colonyRuinComplexRoute(
  seed: string,
  generationVersion = 5,
): ColonyRuinComplexRoute {
  if (seed.length === 0 || ![3, 4, 5].includes(generationVersion)) {
    throw new Error('Unsupported ruin-complex route identity.');
  }

  const key = seed + ':generation:' + String(generationVersion);
  const known = cache.get(key);
  if (known !== undefined) return known;

  const ruin = getPhase1WorldLandmarks(seed).ruinPosition;
  const length = Math.hypot(ruin.x, ruin.y);
  if (length === 0) {
    throw new Error('Ruin route requires a non-origin ruin landmark.');
  }

  const inward = Object.freeze({
    x: -ruin.x / length,
    y: -ruin.y / length,
  });
  const perpendicular = Object.freeze({
    x: -inward.y,
    y: inward.x,
  });

  const occupied: WorldPosition[] = [];
  const threshold = selectPassablePosition(
    seed,
    generationVersion,
    add(ruin, inward, 30),
    occupied,
    [],
  );
  occupied.push(threshold);

  const traceA = selectPassablePosition(
    seed,
    generationVersion,
    add(add(ruin, inward, 70), perpendicular, 28),
    occupied,
    [threshold],
  );
  occupied.push(traceA);

  const traceB = selectPassablePosition(
    seed,
    generationVersion,
    add(add(ruin, inward, 70), perpendicular, -28),
    occupied,
    [threshold],
  );
  occupied.push(traceB);

  const openCourt = selectPassablePosition(
    seed,
    generationVersion,
    add(add(ruin, inward, 12), perpendicular, 16),
    occupied,
    [threshold, traceA],
  );
  occupied.push(openCourt);

  const coveredEdge = selectPassablePosition(
    seed,
    generationVersion,
    add(add(ruin, inward, -10), perpendicular, -16),
    occupied,
    [threshold, traceB, openCourt],
  );

  const nodes = Object.freeze([
    freezeNode(seed, generationVersion, {
      id: 'route:ruin:trace-a',
      kind: 'trace',
      position: traceA,
      observation:
        'Broken paving and repeated grooves are visible in the explored approach.',
      unresolved:
        'The visible trace does not establish where the construction continues.',
    }),
    freezeNode(seed, generationVersion, {
      id: 'route:ruin:trace-b',
      kind: 'trace',
      position: traceB,
      observation:
        'A second interrupted edge is visible from a different ground approach.',
      unresolved:
        'The relationship between the two visible traces remains unresolved.',
    }),
    freezeNode(seed, generationVersion, {
      id: 'route:ruin:site-threshold',
      kind: 'site-threshold',
      position: threshold,
      observation:
        'The existing engineered ruin silhouette is readable from the threshold.',
      unresolved:
        'Its builders, original purpose and final fate remain unknown.',
    }),
    freezeNode(seed, generationVersion, {
      id: 'route:ruin:open-court',
      kind: 'complex-subspace',
      subspace: 'open-court',
      position: openCourt,
      observation:
        'An open arrangement repeats the same construction relation with interrupted edges.',
      unresolved:
        'The repeated relation does not establish a function or historical event.',
    }),
    freezeNode(seed, generationVersion, {
      id: 'route:ruin:covered-edge',
      kind: 'complex-subspace',
      subspace: 'covered-edge',
      position: coveredEdge,
      observation:
        'A partly covered edge preserves a similar construction relation beneath deposits.',
      unresolved:
        'The visible overlap does not identify a builder, era or purpose.',
    }),
  ] satisfies readonly ColonyRuinRouteNode[]);

  const edges = Object.freeze([
    edge(
      'route:ruin:trace-a',
      'route:ruin:site-threshold',
      'broken-paving',
    ),
    edge(
      'route:ruin:trace-b',
      'route:ruin:site-threshold',
      'terrain-opening',
    ),
    edge(
      'route:ruin:site-threshold',
      'route:ruin:open-court',
      'construction-continuity',
    ),
    edge(
      'route:ruin:site-threshold',
      'route:ruin:covered-edge',
      'construction-continuity',
    ),
    edge(
      'route:ruin:open-court',
      'route:ruin:covered-edge',
      'construction-continuity',
    ),
    edge(
      'route:ruin:open-court',
      'route:ruin:trace-a',
      'return-silhouette',
    ),
    edge(
      'route:ruin:covered-edge',
      'route:ruin:trace-b',
      'return-silhouette',
    ),
  ] satisfies readonly ColonyRuinRouteEdge[]);

  const route = Object.freeze({
    seed,
    generationVersion,
    ruinAnchorPosition: Object.freeze({ ...ruin }),
    nodes,
    edges,
  });
  if (cache.size >= 16) cache.clear();
  cache.set(key, route);
  return route;
}

/**
 * Player-facing/knowledge consumers should use this view instead of the full
 * authored graph. Hidden nodes contribute only a local frontier cue; their
 * identity and coordinates are not returned until independently observed.
 */
export function colonyRuinObservedRouteView(
  route: ColonyRuinComplexRoute,
  observedNodeIds: readonly ColonyRuinRouteNodeId[],
): ColonyRuinObservedRouteView {
  const observed = new Set(observedNodeIds);
  const nodes = route.nodes.filter((node) => observed.has(node.id));
  const edges = route.edges.filter(
    (candidate) =>
      observed.has(candidate.from) && observed.has(candidate.to),
  );
  const frontiers = route.edges.flatMap((candidate) => {
    const fromObserved = observed.has(candidate.from);
    const toObserved = observed.has(candidate.to);
    if (fromObserved === toObserved) return [];
    const from = fromObserved ? candidate.from : candidate.to;
    return [Object.freeze({
      from,
      cue: candidate.cue,
      destinationKnown: false as const,
    })];
  });

  const uniqueFrontiers = new Map<string, (typeof frontiers)[number]>();
  for (const frontier of frontiers) {
    uniqueFrontiers.set(
      frontier.from + ':' + frontier.cue,
      frontier,
    );
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    frontiers: Object.freeze([...uniqueFrontiers.values()]),
  });
}
