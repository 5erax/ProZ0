import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPhase1ContentCatalog,
} from '../../src/content';
import {
  composePhase1SaveV2,
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
  Phase1AuthorityBundle,
} from '../../src/integration';
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  type PortableSaveBundleV2,
} from '../../src/persistence';
import {
  getPhase1WorldLandmarks,
  PHASE1_WORLD_GENERATION_VERSION,
} from '../../src/world/phase1/Phase1ChunkGenerator';

const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-int-001-product-review',
);
const WORLD_SEED = 'p1-world-golden';
const NOW_UTC = '2026-09-26T00:00:00.000Z';

type PlayerFacing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

interface PlayerSeed {
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
}

function portableBundle(
  request: ReturnType<typeof composePhase1SaveV2>,
): PortableSaveBundleV2 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  });
}

function validateEvidenceBundle(
  bundle: PortableSaveBundleV2,
): PortableSaveBundleV2 {
  const catalog = createPhase1ContentCatalog();
  const validation = reconstructPhase1ReopenState(
    bundle,
    createPhase1SaveV2Compatibility(
      catalog,
      Object.freeze([PHASE1_WORLD_GENERATION_VERSION]),
    ),
  );
  if (!validation.ok) {
    throw new Error(
      'Evidence Save V2 failed canonical validation: '
        + validation.code + ': ' + validation.message,
    );
  }
  return bundle;
}

async function createBaseSave(
  worldId: string,
  players: readonly PlayerSeed[],
  mutate?: (bundle: Phase1AuthorityBundle) => Promise<void> | void,
): Promise<PortableSaveBundleV2> {
  const authority = await Phase1AuthorityBundle.create({
    worldId,
    worldSeed: WORLD_SEED,
    playerIds: Object.freeze(players.map((entry) => entry.playerId)),
    interactionRangeWorldUnits:
      PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
    spawnClearanceRadiusWorldUnits:
      PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
    requiredAccessRadiusWorldUnits:
      PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  });

  try {
    for (const player of players) {
      authority.getRuntime(player.playerId).relocatePlayer(
        Object.freeze({ x: player.x, y: player.y }),
        player.facing,
      );
    }
    await authority.stepSolo();
    await mutate?.(authority);
    for (const player of players) {
      const runtime = authority.getRuntime(player.playerId);
      const movement = runtime.getSnapshot().player;
      runtime.relocatePlayer(movement.position, movement.facing ?? player.facing);
    }
    return validateEvidenceBundle(
      portableBundle(composePhase1SaveV2(authority, {
        nowUtc: NOW_UTC,
      })),
    );
  } finally {
    await authority.destroy();
  }
}

function withAuthorityTick(
  bundle: PortableSaveBundleV2,
  authorityTick: number,
): PortableSaveBundleV2 {
  return validateEvidenceBundle(Object.freeze({
    ...bundle,
    world: Object.freeze({
      ...bundle.world,
      authorityTick,
      environment: Object.freeze({
        ...bundle.world.environment,
        activeTick: authorityTick,
      }),
    }),
  }));
}

function withLocalLoadout(
  bundle: PortableSaveBundleV2,
  playerId: string,
  options: {
    readonly thermalWrap?: boolean;
    readonly spear?: boolean;
    readonly habitatKit?: boolean;
    readonly machineKit?: boolean;
  },
): PortableSaveBundleV2 {
  const inventoryId = 'inventory:' + playerId;
  const extraStacks = [
    ...(options.thermalWrap
      ? [Object.freeze({
          stackId: 'evidence:thermal-wrap:' + playerId,
          itemDefinitionId: 'item:thermal-wrap',
          quantity: 1,
          condition: 100,
        })]
      : []),
    ...(options.spear
      ? [Object.freeze({
          stackId: 'evidence:basic-spear:' + playerId,
          itemDefinitionId: 'item:basic-spear',
          quantity: 1,
          condition: 100,
        })]
      : []),
    ...(options.habitatKit
      ? [Object.freeze({
          stackId: 'evidence:habitat-kit:' + playerId,
          itemDefinitionId: 'item:habitat-kit',
          quantity: 1,
          condition: null,
        })]
      : []),
    ...(options.machineKit
      ? [Object.freeze({
          stackId: 'evidence:machine-kit:' + playerId,
          itemDefinitionId: 'item:machine-kit',
          quantity: 1,
          condition: null,
        })]
      : []),
  ];

  const next = Object.freeze({
    ...bundle,
    players: Object.freeze(bundle.players.map((player) =>
      player.playerId !== playerId
        ? player
        : Object.freeze({
            ...player,
            equipment: Object.freeze({
              equippedWeaponStackId: options.spear
                ? 'evidence:basic-spear:' + playerId
                : player.equipment.equippedWeaponStackId,
              equippedThermalWrapStackId: options.thermalWrap
                ? 'evidence:thermal-wrap:' + playerId
                : player.equipment.equippedThermalWrapStackId,
            }),
          }),
    )),
    containers: Object.freeze(bundle.containers.map((container) =>
      container.containerId !== inventoryId
        ? container
        : Object.freeze({
            ...container,
            revision: container.revision + (extraStacks.length > 0 ? 1 : 0),
            stacks: Object.freeze([
              ...container.stacks,
              ...extraStacks,
            ]),
          }),
    )),
  });
  return validateEvidenceBundle(next);
}

function withInventoryLogisticsLoadout(
  bundle: PortableSaveBundleV2,
  playerId: string,
): PortableSaveBundleV2 {
  const inventoryId = 'inventory:' + playerId;
  const wrapStackId =
    'evidence:p1-polish-005:thermal-wrap:' + playerId;
  const extraStacks = Object.freeze([
    Object.freeze({
      stackId: 'evidence:p1-polish-005:water:' + playerId,
      itemDefinitionId: 'item:clean-water',
      quantity: 2,
      condition: null,
    }),
    Object.freeze({
      stackId: 'evidence:p1-polish-005:food:' + playerId,
      itemDefinitionId: 'item:edible-plant',
      quantity: 2,
      condition: null,
    }),
    Object.freeze({
      stackId: 'evidence:p1-polish-005:spear:' + playerId,
      itemDefinitionId: 'item:basic-spear',
      quantity: 1,
      condition: 87,
    }),
    Object.freeze({
      stackId: wrapStackId,
      itemDefinitionId: 'item:thermal-wrap',
      quantity: 1,
      condition: 81,
    }),
    Object.freeze({
      stackId: 'evidence:p1-polish-005:fiber:' + playerId,
      itemDefinitionId: 'item:plant-fiber',
      quantity: 6,
      condition: null,
    }),
    Object.freeze({
      stackId: 'evidence:p1-polish-005:metal:' + playerId,
      itemDefinitionId: 'item:metal-ore',
      quantity: 12,
      condition: null,
    }),
    Object.freeze({
      stackId: 'evidence:p1-polish-005:storage-kit:' + playerId,
      itemDefinitionId: 'item:storage-crate-kit',
      quantity: 1,
      condition: null,
    }),
  ]);

  return validateEvidenceBundle(Object.freeze({
    ...bundle,
    players: Object.freeze(bundle.players.map((player) =>
      player.playerId !== playerId
        ? player
        : Object.freeze({
            ...player,
            playerRevision: player.playerRevision + 1,
            equipment: Object.freeze({
              ...player.equipment,
              equippedThermalWrapStackId: wrapStackId,
            }),
            survival: Object.freeze({
              ...player.survival,
              revision: player.survival.revision + 1,
              foodMilli: 50_000,
            }),
          }),
    )),
    containers: Object.freeze(bundle.containers.map((container) =>
      container.containerId !== inventoryId
        ? container
        : Object.freeze({
            ...container,
            revision: container.revision + 1,
            stacks: Object.freeze([
              ...container.stacks,
              ...extraStacks,
            ]),
          }),
    )),
  }));
}

function withStorageCapacityFixture(
  bundle: PortableSaveBundleV2,
): PortableSaveBundleV2 {
  const storage = bundle.containers.find(
    (container) => container.kind === 'storage-crate',
  );
  if (storage === undefined) {
    throw new Error(
      'P1-POLISH-005 fixture expected canonical Storage Crate container.',
    );
  }
  return validateEvidenceBundle(Object.freeze({
    ...bundle,
    containers: Object.freeze(bundle.containers.map((container) =>
      container.containerId !== storage.containerId
        ? container
        : Object.freeze({
            ...container,
            revision: container.revision + 1,
            stacks: Object.freeze([
              ...container.stacks,
              Object.freeze({
                stackId: 'evidence:p1-polish-005:storage-timber',
                itemDefinitionId: 'item:timber',
                quantity: 5,
                condition: null,
              }),
            ]),
          }),
    )),
  }));
}

async function createPresentationConformanceSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  const playerId = 'visual-local';
  const base = await createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId,
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
  );
  const loadout = withLocalLoadout(base, playerId, {
    spear: true,
    thermalWrap: true,
  });
  const inventoryId = 'inventory:' + playerId;
  const inventory = loadout.containers.find(
    (container) => container.containerId === inventoryId,
  );
  const spear = inventory?.stacks.find(
    (stack) => stack.itemDefinitionId === 'item:basic-spear',
  );
  if (spear === undefined) {
    throw new Error(
      'P1-POLISH-007 fixture expected canonical Basic Spear.',
    );
  }

  return validateEvidenceBundle(Object.freeze({
    ...loadout,
    containers: Object.freeze(loadout.containers.map((container) =>
      container.containerId !== inventoryId
        ? container
        : Object.freeze({
            ...container,
            revision: container.revision + 1,
            stacks: Object.freeze(container.stacks.map((stack) =>
              stack.stackId !== spear.stackId
                ? stack
                : Object.freeze({
                    ...stack,
                    condition: 0,
                  }),
            )),
          }),
    )),
  }));
}

async function createInventoryLogisticsSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  const playerId = 'visual-local';
  const base = await createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId,
        x: 2.75,
        y: 0.25,
        facing: 'E' as const,
      }),
    ]),
  );
  const seeded = withInventoryLogisticsLoadout(base, playerId);
  const catalog = createPhase1ContentCatalog();
  const reconstructed = reconstructPhase1ReopenState(
    seeded,
    createPhase1SaveV2Compatibility(
      catalog,
      Object.freeze([PHASE1_WORLD_GENERATION_VERSION]),
    ),
  );
  if (!reconstructed.ok) {
    throw new Error(
      'P1-POLISH-005 fixture reopen failed: '
        + reconstructed.code
        + ': '
        + reconstructed.message,
    );
  }

  const authority = await Phase1AuthorityBundle.create({
    worldId,
    worldSeed: WORLD_SEED,
    playerIds: [playerId],
    interactionRangeWorldUnits:
      PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
    spawnClearanceRadiusWorldUnits:
      PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
    requiredAccessRadiusWorldUnits:
      PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
    reopen: reconstructed.value,
  });

  try {
    const runtime = authority.getRuntime(playerId);
    runtime.relocatePlayer(
      Object.freeze({ x: 2.75, y: 0.25 }),
      'E',
    );
    await authority.stepSolo();

    const inventory = authority.items.getContainerView(
      'inventory:' + playerId,
    );
    const kit = inventory.stacks.find(
      (stack) =>
        stack.itemDefinitionId === 'item:storage-crate-kit',
    );
    if (kit === undefined) {
      throw new Error(
        'P1-POLISH-005 fixture expected Storage Crate Kit.',
      );
    }

    const placed = authority.placeStructure({
      operationId: 'evidence:p1-polish-005:place-storage',
      actorPlayerId: playerId,
      structureDefinitionId: 'structure:storage-crate',
      sourceKitStackId: kit.stackId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      expectedBuildRevision: authority.buildings.getBuildRevision(),
      placement: {
        mode: 'free',
        anchor: Object.freeze({ x: 2.75, y: 0.25 }),
        orientationQuarterTurns: 0,
      },
    });
    if (placed.status !== 'committed') {
      throw new Error(
        'P1-POLISH-005 Storage Crate placement failed: '
          + placed.reason,
      );
    }

    const portable = portableBundle(composePhase1SaveV2(authority, {
      nowUtc: NOW_UTC,
    }));
    return withStorageCapacityFixture(portable);
  } finally {
    await authority.destroy();
  }
}

async function selectInventoryItem(
  page: Page,
  pane: 'player' | 'storage',
  itemName: string,
): Promise<void> {
  const panel = page.locator('[data-panel-kind="container"]');
  const paneSelector =
    '[data-inventory-pane="' + pane + '"]';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const selected = panel.locator(
      paneSelector + ' .p1-item-row[data-selected="true"]',
    );
    if ((await selected.textContent())?.includes(itemName)) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(
    'Could not select ' + itemName + ' in ' + pane + ' pane.',
  );
}

function inventoryItemRow(
  page: Page,
  pane: 'player' | 'storage',
  itemName: string,
) {
  return page.locator(
    '[data-panel-kind="container"] '
      + '[data-inventory-pane="' + pane + '"] '
      + '.p1-item-row',
  ).filter({ hasText: itemName }).first();
}

async function carryWeight(page: Page): Promise<number> {
  const label = await page.locator(
    '[data-region="carry"]',
  ).textContent();
  const match = label?.match(/([0-9]+(?:\.[0-9]+)?)\//);
  if (match?.[1] === undefined) {
    throw new Error('Could not parse Product Review carry weight.');
  }
  return Number(match[1]);
}

async function createPredatorWindupSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const entity = authority.world.findGeneratedEntityByDefinition(
        'hostile:territorial-predator',
      );
      if (entity === null || entity.type !== 'hostile') {
        throw new Error('Evidence setup could not resolve canonical predator.');
      }
      authority.getRuntime('visual-local').relocatePlayer(
        Object.freeze({
          x: entity.position.x - 0.35,
          y: entity.position.y,
        }),
        'E',
      );
      await authority.stepSolo();
      const predator = authority.world.getPredator(entity.entityId);
      if (predator === null) {
        throw new Error('Evidence setup lost canonical predator state.');
      }
      const committed = authority.world.commitPredatorRuntime({
        entityId: predator.entityId,
        expectedRevision: predator.revision,
        health: predator.health,
        state: 'attack-windup',
        targetPlayerId: 'visual-local',
        stateUntilTick: authority.authorityTick + 120,
        outsideLeashTicks: 0,
      });
      if (committed === null) {
        throw new Error('Evidence setup could not stage canonical windup.');
      }
    },
  );
}

async function createDeathSave(
  worldId: string,
  respawn: boolean,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const lethalTick = authority.authorityTick;
      const lethal = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:lethal',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:predator',
        targetPlayerId: 'visual-local',
        amount: 100,
        tick: lethalTick,
      });
      if (lethal.status !== 'applied' || !lethal.lethal) {
        throw new Error('Evidence setup failed to stage canonical lethal damage.');
      }
      await authority.stepSolo();

      if (!respawn) return;
      const state = authority.survival.getPlayerState('visual-local');
      if (state.lifeState.type !== 'dead-pending-respawn') {
        throw new Error('Evidence setup expected pending respawn.');
      }
      while (authority.authorityTick < state.lifeState.respawnAtTick) {
        await authority.stepSolo();
      }
    },
  );
}

async function createCriticalHealthSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const result = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:critical-health',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:predator',
        targetPlayerId: 'visual-local',
        amount: 75,
        tick: authority.authorityTick,
      });
      if (result.status !== 'applied' || result.healthAfter > 30) {
        throw new Error('Evidence setup failed to stage critical health.');
      }
      await authority.stepSolo();
    },
  );
}

async function createResourceFocusSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    (authority) => {
      const resource = authority.world.getActiveGeneratedEntities().find(
        (entity) =>
          entity.type === 'resource'
          && entity.definitionId === 'resource:fiber-plant',
      );
      if (resource === undefined) {
        throw new Error('Evidence setup could not resolve canonical Fiber Plant.');
      }
      authority.getRuntime('visual-local').relocatePlayer(
        Object.freeze({
          x: resource.position.x - 0.5,
          y: resource.position.y,
        }),
        'E',
      );
    },
  );
}

async function createWorldDropSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 3,
        y: 3,
        facing: 'E' as const,
      }),
    ]),
    (authority) => {
      const inventory = authority.items.getContainerView(
        'inventory:visual-local',
      );
      const tool = inventory.stacks.find(
        (stack) => stack.itemDefinitionId === 'item:stone-field-tool',
      );
      if (tool === undefined) {
        throw new Error('Evidence setup is missing canonical starter tool.');
      }
      const result = authority.executeItemCommand({
        type: 'drop',
        operationId: 'evidence:world-drop',
        playerId: 'visual-local',
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
        sourceStackId: tool.stackId,
        quantity: 1,
      });
      if (result.status !== 'committed') {
        throw new Error(
          'Evidence setup failed canonical world drop: ' + result.reason,
        );
      }
    },
  );
}

async function createSpatialMapEvidenceSave(
  worldId: string,
  finalPlayerPosition: Readonly<{ x: number; y: number }> | null = null,
): Promise<PortableSaveBundleV2> {
  const players = Object.freeze([
    Object.freeze({
      playerId: 'visual-local',
      x: 0,
      y: 0,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-teammate',
      x: 6,
      y: 4,
      facing: 'NW' as const,
    }),
  ]);

  return createBaseSave(
    worldId,
    players,
    async (authority) => {
      const runtime = authority.getRuntime('visual-local');

      // Reveal representative water while preserving binary discovery.
      runtime.relocatePlayer(
        Object.freeze({ x: 34, y: -18 }),
        'E',
      );
      await authority.stepSolo();

      // Locate the canonical ruin through ordinary authoritative reveal.
      const landmarks = getPhase1WorldLandmarks(WORLD_SEED);
      runtime.relocatePlayer(landmarks.ruinPosition, 'W');
      await authority.stepSolo();
      const ruin =
        authority.world.findGeneratedEntityByDefinition(
          'ruin:previous-civilization-ruin',
        );
      if (ruin === null || ruin.type !== 'ruin') {
        throw new Error(
          'Map evidence could not resolve canonical ruin.',
        );
      }
      const ruinState = authority.worldStore.getRuinState(
        ruin.entityId,
      );
      if (
        ruinState === undefined
        || ruinState.discoveryState === 'unknown'
      ) {
        throw new Error(
          'Map evidence expected authoritative LOCATED ruin state.',
        );
      }

      // Stage a recovery target in the accepted MID commitment band.
      runtime.relocatePlayer(
        Object.freeze({ x: 100, y: 0 }),
        'W',
      );
      await authority.stepSolo();
      const lethal = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:p1-polish-002-map-cache',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:map-cache-source',
        targetPlayerId: 'visual-local',
        amount: 100,
        tick: authority.authorityTick,
      });
      if (lethal.status !== 'applied' || !lethal.lethal) {
        throw new Error(
          'Map evidence failed to stage canonical lethal damage.',
        );
      }
      await authority.stepSolo();

      const pending = authority.survival.getPlayerState(
        'visual-local',
      );
      if (pending.lifeState.type !== 'dead-pending-respawn') {
        throw new Error(
          'Map evidence expected pending authoritative respawn.',
        );
      }
      while (
        authority.authorityTick
        < pending.lifeState.respawnAtTick
      ) {
        await authority.stepSolo();
      }

      const cache =
        authority.world.exportSnapshot().deathCaches.caches[0];
      if (cache === undefined) {
        throw new Error(
          'Map evidence expected an active Death Cache.',
        );
      }
      const contents = authority.items.getContainerView(
        cache.containerId,
      );
      if (contents.stacks.length === 0) {
        throw new Error(
          'Map evidence Death Cache must retain recoverable items.',
        );
      }

      if (finalPlayerPosition !== null) {
        runtime.relocatePlayer(
          Object.freeze({
            x: finalPlayerPosition.x,
            y: finalPlayerPosition.y,
          }),
          'W',
        );
        await authority.stepSolo();
      }
    },
  );
}

async function seedIndexedDb(
  page: Page,
  databaseName: string,
  bundle: PortableSaveBundleV2,
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    async ({ dbName, save }) => {
      await new Promise<void>((resolveDelete) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolveDelete();
        request.onerror = () => resolveDelete();
        request.onblocked = () => resolveDelete();
      });

      const database = await new Promise<IDBDatabase>((resolveOpen, rejectOpen) => {
        const request = indexedDB.open(dbName, 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          const transaction = request.transaction;
          if (transaction === null) {
            rejectOpen(new Error('IndexedDB upgrade transaction unavailable.'));
            return;
          }
          const specs: readonly [string, string | string[]][] = [
            ['players', ['worldId', 'playerId']],
            ['containers', ['worldId', 'containerId']],
            ['chunks', ['worldId', 'coord.x', 'coord.y']],
            ['footholds', ['worldId', 'footholdId']],
            ['structures', ['worldId', 'structureId']],
          ];
          if (!db.objectStoreNames.contains('worlds')) {
            db.createObjectStore('worlds', { keyPath: 'worldId' });
          }
          for (const [storeName, keyPath] of specs) {
            const store = db.objectStoreNames.contains(storeName)
              ? transaction.objectStore(storeName)
              : db.createObjectStore(storeName, { keyPath });
            if (!store.indexNames.contains('worldId')) {
              store.createIndex('worldId', 'worldId');
            }
          }
        };
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(
          request.error ?? new Error('IndexedDB evidence open failed.'),
        );
      });

      await new Promise<void>((resolveTx, rejectTx) => {
        const storeNames = [
          'worlds',
          'players',
          'containers',
          'chunks',
          'footholds',
          'structures',
        ];
        const transaction = database.transaction(storeNames, 'readwrite');
        transaction.objectStore('worlds').put(save.world);
        for (const player of save.players) {
          transaction.objectStore('players').put(player);
        }
        for (const container of save.containers) {
          transaction.objectStore('containers').put(container);
        }
        for (const chunk of save.chunks) {
          transaction.objectStore('chunks').put(chunk);
        }
        for (const foothold of save.footholds) {
          transaction.objectStore('footholds').put(foothold);
        }
        for (const structure of save.structures) {
          transaction.objectStore('structures').put(structure);
        }
        transaction.oncomplete = () => resolveTx();
        transaction.onerror = () => rejectTx(
          transaction.error ?? new Error('IndexedDB evidence write failed.'),
        );
        transaction.onabort = () => rejectTx(
          transaction.error ?? new Error('IndexedDB evidence write aborted.'),
        );
      });
      database.close();
    },
    { dbName: databaseName, save: bundle },
  );
}

async function openProductReview(
  page: Page,
  bundle: PortableSaveBundleV2,
  databaseName: string,
  scale: 1 | 2 | 3,
  localPlayerId = 'visual-local',
  sessionPlayerIds?: readonly string[],
): Promise<void> {
  await page.setViewportSize({
    width: 640 * scale,
    height: 360 * scale,
  });
  await seedIndexedDb(page, databaseName, bundle);
  const query = new URLSearchParams({
    proz0Mode: 'phase1-product-review',
    proz0WorldId: bundle.world.worldId,
    proz0WorldSeed: bundle.world.worldSeed,
    proz0Players: (
      sessionPlayerIds
      ?? bundle.players.map((player) => player.playerId)
    ).join(','),
    proz0Player: localPlayerId,
    proz0SaveDb: databaseName,
  });
  const diagnostics: string[] = [];
  const onConsole = (message: { type(): string; text(): string }): void => {
    if (message.type() === 'error') diagnostics.push(message.text());
  };
  const onPageError = (error: Error): void => {
    diagnostics.push(error.message);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto('/?' + query.toString());

  const root = page.locator('[data-proz0-autoboot]');
  const world = page.locator('[data-product-review-world="canonical"]');
  await expect.poll(
    async () => root.getAttribute('data-runtime-status'),
    { timeout: 5_000 },
  ).not.toBe('booting');
  const runtimeStatus = await root.getAttribute('data-runtime-status');
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  if (runtimeStatus !== 'ready') {
    throw new Error(
      'Product Review evidence boot failed: '
        + (diagnostics.join(' | ') || 'no browser diagnostic'),
    );
  }
  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'phase1-product-review',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-authority',
    'canonical',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-reopened',
    'true',
  );
  await expect(world).toHaveAttribute(
    'data-production-asset-foundation',
    'p1-75-78',
  );
  await expect(page.locator('[data-production-world-preview]')).toHaveCount(0);
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-display-scale',
    String(scale),
  );
}

async function captureViewport(
  page: Page,
  fileName: string,
): Promise<void> {
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
    fullPage: false,
  });
}

async function captureProductWorld(
  page: Page,
  fileName: string,
): Promise<void> {
  await page.locator('[data-product-review-world="canonical"]').screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
  });
}

async function assertPanelCompositionIsolated(
  page: Page,
  activePanelSelector: string,
): Promise<void> {
  const geometry = await page.evaluate((panelSelector) => {
    type Rect = {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };

    const visibleRect = (element: Element | null): Rect | null => {
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      if (
        style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) === 0
      ) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };

    const panel = visibleRect(document.querySelector(panelSelector));
    const controlsHint = visibleRect(
      document.querySelector('.p1-product-controls-hint'),
    );
    const firstAction = visibleRect(
      document.querySelector('[data-first-action-cue="visible"]'),
    );
    const contextualHud = [
      ...document.querySelectorAll('.p1-context-hud'),
    ].map(visibleRect).filter((rect): rect is Rect => rect !== null);

    return {
      panel,
      controlsHint,
      firstAction,
      contextualHud,
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
    };
  }, activePanelSelector);

  if (geometry.panel === null) {
    throw new Error(
      'Expected visible active panel: ' + activePanelSelector,
    );
  }
  const activePanel = geometry.panel;

  const intersects = (
    left: NonNullable<typeof geometry.panel>,
    right: typeof geometry.controlsHint,
  ): boolean => {
    if (right === null) return false;
    return !(
      left.right <= right.left
      || right.right <= left.left
      || left.bottom <= right.top
      || right.bottom <= left.top
    );
  };

  expect(
    intersects(activePanel, geometry.controlsHint),
    'Controls hint must not intersect active panel',
  ).toBe(false);
  expect(
    intersects(activePanel, geometry.firstAction),
    'First-action cue must not intersect active panel',
  ).toBe(false);
  expect(geometry.controlsHint).toBeNull();
  expect(geometry.firstAction).toBeNull();
  expect(geometry.contextualHud).toEqual([]);

  expect(activePanel.left).toBeGreaterThanOrEqual(0);
  expect(activePanel.top).toBeGreaterThanOrEqual(0);
  expect(activePanel.right).toBeLessThanOrEqual(
    geometry.viewport.width,
  );
  expect(activePanel.bottom).toBeLessThanOrEqual(
    geometry.viewport.height,
  );
}

test.use({ deviceScaleFactor: 1 });

test('P1-POLISH-001 isolates primary panels from contextual HUD at required integer scales', async ({ page }) => {
  test.setTimeout(90_000);
  const normal = await createBaseSave(
    'world:p1-polish-001-panel-composition',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
  );

  const layouts = [
    Object.freeze({ label: '1x', scale: 1 as const, viewport: null }),
    Object.freeze({ label: '2x', scale: 2 as const, viewport: null }),
    Object.freeze({ label: '3x', scale: 3 as const, viewport: null }),
    Object.freeze({
      label: '1363x936',
      scale: 2 as const,
      viewport: Object.freeze({ width: 1363, height: 936 }),
    }),
  ] as const;

  const panels = [
    Object.freeze({
      label: 'inventory',
      key: 'i',
      selector: '[data-panel-kind="inventory"]',
    }),
    Object.freeze({
      label: 'craft',
      key: 'c',
      selector: '[data-panel-kind="craft"]',
    }),
    Object.freeze({
      label: 'map',
      key: 'm',
      selector: '[data-panel-kind="map"]',
    }),
    Object.freeze({
      label: 'build',
      key: 'b',
      selector: '[data-panel-kind="build"]',
    }),
    Object.freeze({
      label: 'help',
      key: 'h',
      selector: '.p1-product-controls-panel',
    }),
  ] as const;

  for (const layout of layouts) {
    for (const panelCase of panels) {
      const databaseName =
        'proz0-p1-polish-001-panel-'
        + layout.label
        + '-'
        + panelCase.label;
      await openProductReview(
        page,
        normal,
        databaseName,
        layout.scale,
      );

      if (layout.viewport !== null) {
        await page.setViewportSize(layout.viewport);
        await expect(page.locator('#proz0-canvas')).toHaveAttribute(
          'data-display-scale',
          String(Math.min(layout.viewport.width / 640, layout.viewport.height / 360)),
        );
      }

      await expect(page.locator('.p1-product-controls-hint')).toBeVisible();
      await expect(
        page.locator('[data-first-action-cue="visible"]'),
      ).toBeVisible();

      await page.keyboard.press(panelCase.key);
      await expect(page.locator(panelCase.selector)).toBeVisible();

      await assertPanelCompositionIsolated(
        page,
        panelCase.selector,
      );

      if (panelCase.label === 'help') {
        await expect(
          page.locator('[data-proz0-autoboot]'),
        ).toHaveAttribute('data-product-review-help-open', 'true');
      } else {
        await expect(
          page.locator('[data-proz0-autoboot]'),
        ).toHaveAttribute('data-product-review-panel-open', 'true');
      }
    }
  }
});

test('P1-POLISH-007 closes Final QA presentation conformance gaps', async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const inventoryEvidence = await createPresentationConformanceSave(
    'world:p1-polish-007-presentation-conformance',
  );
  const storageEvidence = await createInventoryLogisticsSave(
    'world:p1-polish-007-storage-capacity',
  );
  const files: string[] = [];
  const buildOrder = [
    'structure:storage-crate',
    'structure:workbench',
    'structure:habitat-room',
    'structure:compact-power-unit',
    'structure:atmospheric-water-condenser',
  ] as const;

  for (const scale of [1, 2, 3] as const) {
    const suffix = String(scale) + 'x';
    await openProductReview(
      page,
      inventoryEvidence,
      'proz0-p1-polish-007-conformance-' + suffix,
      scale,
    );

    const weapon = page.locator(
      '[data-equipment-slot="weapon"]',
    );
    const protection = page.locator(
      '[data-equipment-slot="protection"]',
    );
    await expect(weapon).toHaveAttribute(
      'data-equipment-state',
      'BROKEN',
    );
    await expect(weapon.locator('.p1-equipment-broken'))
      .toHaveText('BROKEN');
    await expect(
      weapon.locator('.p1-equipment-condition-track'),
    ).toHaveAttribute('data-condition-current', '0');
    await expect(
      protection.locator('.p1-equipment-condition-track'),
    ).toHaveAttribute('data-condition-current', '100');
    await expect(protection).not.toHaveAttribute(
      'data-equipment-state',
      'BROKEN',
    );
    const equipmentFile =
      'p1-polish-007-equipment-broken-' + suffix + '.png';
    await captureViewport(page, equipmentFile);
    files.push(equipmentFile);

    await page.keyboard.press('i');
    const inventoryPanel = page.locator(
      '[data-panel-kind="inventory"]',
    );
    await expect(inventoryPanel).toBeVisible();
    const inventoryCapacity = inventoryPanel.locator(
      '.p1-panel-capacity',
    );
    await expect(inventoryCapacity).toContainText('/20.0 kg');
    await expect(inventoryCapacity).toContainText('/24.0 u');
    await expect(inventoryCapacity).toContainText(
      /NORMAL|HEAVY|OVERLOADED/,
    );
    const brokenSpear = inventoryPanel.locator(
      '.p1-item-row',
    ).filter({ hasText: 'Basic Spear' }).first();
    await expect(brokenSpear).toHaveAttribute(
      'data-available',
      'false',
    );
    await expect(
      brokenSpear.locator('.p1-item-condition-track'),
    ).toHaveAttribute('data-condition-current', '0');
    await expect(
      brokenSpear.locator('.p1-item-condition-track'),
    ).toHaveAttribute('data-condition-max', '100');
    const inventoryFile =
      'p1-polish-007-inventory-capacity-' + suffix + '.png';
    await captureViewport(page, inventoryFile);
    files.push(inventoryFile);
    await page.keyboard.press('i');

    await page.keyboard.press('c');
    const craftPanel = page.locator('[data-panel-kind="craft"]');
    await expect(craftPanel).toBeVisible();
    const craftRows = craftPanel.locator('.p1-craft-row');
    expect(await craftRows.count()).toBeGreaterThan(0);
    for (let index = 0; index < await craftRows.count(); index += 1) {
      const row = craftRows.nth(index);
      await expect(row.locator('.p1-craft-output-icon').first())
        .toBeVisible();
      const token = row.locator('.p1-craft-output-token').first();
      await expect(token).toHaveAttribute(
        'data-output-quantity',
        /[1-9][0-9]*/,
      );
      await expect(token).toHaveAttribute(
        'data-output-name',
        /.+/,
      );
    }
    const craftFile =
      'p1-polish-007-craft-output-icons-' + suffix + '.png';
    await captureViewport(page, craftFile);
    files.push(craftFile);
    await page.keyboard.press('c');

    await page.keyboard.press('b');
    const buildPanel = page.locator('[data-panel-kind="build"]');
    await expect(buildPanel).toBeVisible();
    const buildEntries = buildPanel.locator(
      '.p1-build-catalog-entry',
    );
    await expect(buildEntries).toHaveCount(5);
    expect(await buildEntries.evaluateAll((entries) =>
      entries.map((entry) =>
        (entry as HTMLElement).dataset.structureId,
      ),
    )).toEqual(buildOrder);
    await expect(
      buildEntries.locator('.p1-build-catalog-icon'),
    ).toHaveCount(5);
    await expect(
      buildEntries.locator('[data-asset-path]'),
    ).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      const entry = buildEntries.nth(index);
      await expect(entry).toHaveAttribute(
        'data-available-kit-count',
        /[0-9]+/,
      );
      await expect(entry).toHaveAttribute(
        'data-built-count',
        /[0-9]+/,
      );
      await expect(entry).toHaveAttribute(
        'data-build-cap',
        /[1-9][0-9]*/,
      );
      await expect(entry).toContainText(/AVAILABLE|CAP REACHED/);
    }
    expect(await buildEntries.evaluateAll((entries) =>
      entries.filter((entry) =>
        (entry as HTMLElement).dataset.selected === 'true',
      ).length,
    )).toBe(1);
    const buildFile =
      'p1-polish-007-build-catalog-' + suffix + '.png';
    await captureViewport(page, buildFile);
    files.push(buildFile);
    await page.keyboard.press('b');

    await page.keyboard.press('p');
    const progression = page.locator(
      '[data-panel-kind="progression"]',
    );
    await expect(progression).toBeVisible();
    await expect(
      progression.locator('.p1-progress-level'),
    ).toHaveAttribute('data-progression-icon-index', '6');
    await expect(
      progression.locator('.p1-progress-level .p1-progression-icon'),
    ).toBeVisible();
    const progressionExpected = [
      ['skill:fieldcraft-basics', '0', 'LOCKED'],
      ['skill:maintenance-basics', '1', 'LOCKED'],
      ['profession:explorer-prototype', '2', 'LOCKED'],
      ['profession:engineer-prototype', '3', 'LOCKED'],
    ] as const;
    for (const [id, iconIndex, state] of progressionExpected) {
      const row = progression.locator(
        '[data-progression-id="' + id + '"]',
      );
      await expect(row).toHaveAttribute(
        'data-progression-icon-index',
        iconIndex,
      );
      await expect(row).toHaveAttribute(
        'data-progression-state',
        state,
      );
    }
    const objectives = progression.locator(
      '[data-progression-kind="objective"]',
    );
    await expect(objectives).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await expect(objectives.nth(index)).toHaveAttribute(
        'data-progression-icon-index',
        '5',
      );
      await expect(objectives.nth(index)).toHaveAttribute(
        'data-progression-state',
        'INCOMPLETE',
      );
      await expect(objectives.nth(index)).toBeVisible();
    }
    expect(await progression.evaluate((panel) =>
      panel.scrollHeight <= panel.clientHeight,
    )).toBe(true);
    await expect(page.locator('[data-quest-rail]')).toHaveCount(0);
    const progressionFile =
      'p1-polish-007-progression-objectives-'
      + suffix
      + '.png';
    await captureViewport(page, progressionFile);
    files.push(progressionFile);
    await page.keyboard.press('p');

    await openProductReview(
      page,
      storageEvidence,
      'proz0-p1-polish-007-storage-' + suffix,
      scale,
    );
    await page.keyboard.press('i');
    const storagePanel = page.locator(
      '[data-panel-kind="container"]',
    );
    await expect(storagePanel).toBeVisible();
    const capacityRows = storagePanel.locator(
      '.p1-panel-capacity',
    );
    await expect(capacityRows).toHaveCount(2);
    await expect(capacityRows.nth(0)).toContainText('/20.0 kg');
    await expect(capacityRows.nth(0)).toContainText('/24.0 u');
    await expect(capacityRows.nth(0)).toContainText(
      /NORMAL|HEAVY|OVERLOADED/,
    );
    await expect(capacityRows.nth(1)).toContainText('/100.0 kg');
    await expect(capacityRows.nth(1)).toContainText('/120.0 u');
    const storageFile =
      'p1-polish-007-storage-capacity-' + suffix + '.png';
    await captureViewport(page, storageFile);
    files.push(storageFile);
  }

  writeFileSync(
    resolve(
      EVIDENCE_DIR,
      'p1-polish-007-presentation-manifest.json',
    ),
    JSON.stringify({
      schemaVersion: 1,
      task: 'P1-POLISH-007',
      evidenceKind: 'final-qa-presentation-conformance',
      testedHead:
        process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
      workflowCommit:
        process.env.GITHUB_SHA ?? 'local-worktree',
      generatedAt: new Date().toISOString(),
      runtime: {
        mode: 'phase1-product-review',
        canonicalAuthority: true,
        persistence: 'indexeddb-save-v2',
        qaFixture: false,
      },
      invariants: {
        inventoryCurrentMaxCapacity: true,
        storageCurrentMaxCapacity: true,
        itemConditionStripAndUnavailable: true,
        equipmentConditionAndBrokenIndependentProtection: true,
        craftOutputIconNameQuantity: true,
        exactFiveBuildCatalog: true,
        buildKitCountCapSelectedState: true,
        progressionApprovedStateIcons: true,
        progressionLevelEmblemBound: true,
        orderedQuestObjectives: true,
        allProgressionRowsVisible: true,
        noPersistentQuestRail: true,
        integerPresentation1x2x3x: true,
      },
      files,
    }, null, 2) + '\n',
    'utf8',
  );
});

test('P1-POLISH-005 drives selected-stack inventory and storage actions', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const evidence = await createInventoryLogisticsSave(
    'world:p1-polish-005-inventory-actions',
  );
  const files: string[] = [];
  await openProductReview(
    page,
    evidence,
    'proz0-p1-polish-005-inventory-actions',
    2,
  );

  const carryBeforeActions = await carryWeight(page);
  expect(carryBeforeActions).toBeGreaterThan(17);
  expect(carryBeforeActions).toBeLessThan(20);

  await page.keyboard.press('i');
  const panel = page.locator('[data-panel-kind="container"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute(
    'data-inventory-active-pane',
    'player',
  );

  // Multiple-stack keyboard selection keeps the selected row inside
  // the scrollable pane viewport rather than clipping below the panel.
  await selectInventoryItem(page, 'player', 'Metal Ore');
  const selectedWithinPane = await panel.locator(
    '[data-inventory-pane="player"]',
  ).evaluate((paneElement) => {
    const paneRect = paneElement.getBoundingClientRect();
    const selected = paneElement.querySelector<HTMLElement>(
      '.p1-item-row[data-selected="true"]',
    );
    if (selected === null) return false;
    const selectedRect = selected.getBoundingClientRect();
    return selectedRect.top >= paneRect.top
      && selectedRect.bottom <= paneRect.bottom;
  });
  expect(selectedWithinPane).toBe(true);

  // Selected-stack consume: Edible Plant changes; Clean Water does not.
  await selectInventoryItem(page, 'player', 'Edible Plant');
  await expect(
    inventoryItemRow(page, 'player', 'Edible Plant'),
  ).toContainText('×2');
  await expect(
    inventoryItemRow(page, 'player', 'Clean Water'),
  ).toContainText('×2');
  await page.keyboard.press('v');
  await expect(
    inventoryItemRow(page, 'player', 'Edible Plant'),
  ).toContainText('×1');
  await expect(
    inventoryItemRow(page, 'player', 'Clean Water'),
  ).toContainText('×2');
  await captureViewport(
    page,
    'p1-polish-005-selected-consume-2x.png',
  );
  files.push('p1-polish-005-selected-consume-2x.png');

  // Selected equipment: spear does not disturb independent Thermal Wrap.
  await selectInventoryItem(page, 'player', 'Basic Spear');
  await page.keyboard.press('x');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('EQUIP · Basic Spear');
  await page.keyboard.press('i');
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).toContainText('Basic Spear');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('Thermal Wrap');
  await captureViewport(
    page,
    'p1-polish-005-selected-equip-2x.png',
  );
  files.push('p1-polish-005-selected-equip-2x.png');

  await page.keyboard.press('i');
  await selectInventoryItem(page, 'player', 'Basic Spear');
  await page.keyboard.press('x');
  await page.keyboard.press('i');
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).not.toContainText('Basic Spear');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('Thermal Wrap');

  // Exact selected quantity Drop.
  await page.keyboard.press('i');
  await selectInventoryItem(page, 'player', 'Plant Fiber');
  await page.keyboard.press(']');
  await expect(panel).toHaveAttribute(
    'data-inventory-quantity',
    '2',
  );
  await page.keyboard.press('g');
  await expect(
    inventoryItemRow(page, 'player', 'Plant Fiber'),
  ).toContainText('×4');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('DROP · Plant Fiber ×2');
  await expect(
    page.locator('[data-world-role="world-drop"]'),
  ).toHaveCount(1);
  await captureViewport(
    page,
    'p1-polish-005-selected-drop-2x.png',
  );
  files.push('p1-polish-005-selected-drop-2x.png');

  // Capacity rejection is authoritative and does not silently partial-transfer.
  await page.keyboard.press('Tab');
  await expect(panel).toHaveAttribute(
    'data-inventory-active-pane',
    'storage',
  );
  await selectInventoryItem(page, 'storage', 'Timber');

  // Invalid Drop source pane rejects without deleting the selected stack.
  await page.keyboard.press('g');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('SOURCE MISSING');
  await expect(
    inventoryItemRow(page, 'storage', 'Timber'),
  ).toContainText('×5');

  // Chosen quantity 3 crosses the normal inbound weight threshold.
  await page.keyboard.press(']');
  await page.keyboard.press(']');
  await expect(panel).toHaveAttribute(
    'data-inventory-quantity',
    '3',
  );
  await page.keyboard.press('Enter');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('INVENTORY WEIGHT LIMIT');
  await expect(
    inventoryItemRow(page, 'storage', 'Timber'),
  ).toContainText('×5');
  await expect(
    inventoryItemRow(page, 'player', 'Timber'),
  ).toHaveCount(0);

  // Partial deposit through exact source StackId + chosen quantity.
  await page.keyboard.press('Tab');
  await selectInventoryItem(page, 'player', 'Plant Fiber');
  await page.keyboard.press(']');
  await page.keyboard.press('Enter');
  await expect(
    inventoryItemRow(page, 'player', 'Plant Fiber'),
  ).toContainText('×2');
  await expect(
    inventoryItemRow(page, 'storage', 'Plant Fiber'),
  ).toContainText('×2');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('PLAYER → STORAGE');

  await page.keyboard.press('i');
  const carryAfterDeposit = await carryWeight(page);
  expect(carryAfterDeposit).toBeLessThan(carryBeforeActions);

  // Retrieve exact quantity and restore carry.
  await page.keyboard.press('i');
  await page.keyboard.press('Tab');
  await selectInventoryItem(page, 'storage', 'Plant Fiber');
  await page.keyboard.press(']');
  await page.keyboard.press('Enter');
  await expect(
    inventoryItemRow(page, 'storage', 'Plant Fiber'),
  ).toHaveCount(0);
  await expect(
    inventoryItemRow(page, 'player', 'Plant Fiber'),
  ).toContainText('×4');
  await expect(panel.locator('.p1-feedback'))
    .toContainText('STORAGE → PLAYER');
  await expect(
    panel.locator(
      '[data-inventory-pane="storage"] '
        + '.p1-item-row[data-selected="true"]',
    ),
  ).toContainText('Timber');

  await page.keyboard.press('i');
  const carryAfterRetrieve = await carryWeight(page);
  expect(carryAfterRetrieve).toBeGreaterThan(carryAfterDeposit);

  // Conditioned stack survives player->storage->player round trip.
  await page.keyboard.press('i');
  await selectInventoryItem(page, 'player', 'Basic Spear');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await selectInventoryItem(page, 'storage', 'Basic Spear');
  await expect(
    inventoryItemRow(page, 'storage', 'Basic Spear'),
  ).toContainText('COND 87');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await selectInventoryItem(page, 'player', 'Basic Spear');
  await expect(
    inventoryItemRow(page, 'player', 'Basic Spear'),
  ).toContainText('COND 87');

  // Reopening keeps a still-valid in-session selection understandable.
  await page.keyboard.press('i');
  await page.keyboard.press('i');
  await expect(
    panel.locator(
      '[data-inventory-pane="player"] '
        + '.p1-item-row[data-selected="true"]',
    ),
  ).toContainText('Basic Spear');

  // Invalid selected Use rejects that exact stack; Water is not fallback-used.
  await selectInventoryItem(page, 'player', 'Stone Field Tool');
  await page.keyboard.press('v');
  await expect(panel.locator('.p1-feedback')).toContainText(
    /NOT CONSUMABLE|INVALID|SOURCE/,
  );
  await expect(
    inventoryItemRow(page, 'player', 'Clean Water'),
  ).toContainText('×2');

  await captureViewport(
    page,
    'p1-polish-005-storage-logistics-2x.png',
  );
  files.push('p1-polish-005-storage-logistics-2x.png');

  writeFileSync(
    resolve(
      EVIDENCE_DIR,
      'p1-polish-005-inventory-manifest.json',
    ),
    JSON.stringify({
      schemaVersion: 1,
      task: 'P1-POLISH-005',
      evidenceKind: 'selected-stack-player-actions',
      testedHead:
        process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
      workflowCommit:
        process.env.GITHUB_SHA ?? 'local-worktree',
      generatedAt: new Date().toISOString(),
      runtime: {
        mode: 'phase1-product-review',
        canonicalAuthority: true,
        persistence: 'indexeddb-save-v2',
        qaFixture: false,
      },
      invariants: {
        selectedFoodNotWater: true,
        selectedEquipmentOnly: true,
        independentProtectionSlot: true,
        selectedDropExactQuantity: true,
        invalidDropNoLoss: true,
        longListSelectionVisible: true,
        capacityRejectNoPartial: true,
        storagePartialDeposit: true,
        storageExactRetrieve: true,
        carryChangesWithTransfer: true,
        conditionPreserved: true,
        selectionNormalizesAfterRemoval: true,
        reopenSelectionUnderstandable: true,
        invalidUseNoFallback: true,
      },
      files,
    }, null, 2) + '\n',
    'utf8',
  );
});

test('P1-POLISH-002 captures authoritative spatial map evidence', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const evidence = await createSpatialMapEvidenceSave(
    'world:p1-polish-002-map-evidence-near',
  );
  const midEvidence = await createSpatialMapEvidenceSave(
    'world:p1-polish-002-map-evidence-mid',
    Object.freeze({ x: 100, y: 0 }),
  );
  const baseReadability = await createBaseSave(
    'world:p1-polish-002-base-anchor',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
  );
  const decorReadability = await createBaseSave(
    'world:p1-polish-002-decor-readability',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 8,
        y: 1,
        facing: 'E' as const,
      }),
    ]),
  );
  const worldReadability = await createResourceFocusSave(
    'world:p1-polish-002-resource-readability',
  );
  const playerIds = ['visual-local', 'visual-teammate'] as const;
  const files: string[] = [];

  const assertSpatialMap = async (
    expectedBaseBand: 'NEAR' | 'MID' | 'FAR',
    expectedCacheBand: 'NEAR' | 'MID' | 'FAR',
  ): Promise<void> => {
    const field = page.locator('[data-map-spatial="true"]');
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute(
      'data-map-knowledge',
      'explored-only',
    );
    const mapCellScale = Number(
      await field.getAttribute('data-map-cell-scale'),
    );
    expect(mapCellScale).toBeGreaterThanOrEqual(3);
    expect(
      Number(
        await field.getAttribute(
          'data-visible-explored-cell-count',
        ),
      ),
    ).toBeGreaterThan(0);
    await expect(
      field.locator('[data-map-marker-kind="player"]'),
    ).toHaveAttribute('data-map-marker-label', 'YOU');
    await expect(
      field.locator('[data-map-marker-kind="base"]'),
    ).toHaveAttribute('data-distance-band', expectedBaseBand);
    await expect(
      field.locator('[data-map-marker-kind="ruin"]'),
    ).toHaveAttribute('data-distance-band', 'FAR');
    await expect(
      field.locator('[data-map-marker-kind="ruin"]'),
    ).toHaveAttribute('data-map-marker-clamped', 'true');
    await expect(
      field.locator('[data-map-marker-kind="death-cache"]'),
    ).toHaveAttribute('data-distance-band', expectedCacheBand);
    await expect(
      field.locator('[data-map-marker-kind="teammate"]'),
    ).toHaveAttribute(
      'data-presentation-identity-slot',
      'TEAM_A',
    );
    await expect(
      field.locator('[data-map-marker-kind="resource"]'),
    ).toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="EXPLORED"]'
          + '[data-terrain-state="ground"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="EXPLORED"]'
          + '[data-terrain-state="water"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="UNKNOWN_BOUNDARY"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="UNKNOWN_BOUNDARY"]'
          + '[data-terrain-state]',
      ),
    ).toHaveCount(0);
    await expect(field).not.toContainText('HOME');
    await expect(field).not.toContainText('Fiber');
    await expect(field).not.toContainText('Metal Ore');

    const boundaryTouchesExploredWater = await field.evaluate(
      (node) => {
        const element = node as HTMLElement;
        const scale = Number(
          element.dataset.mapCellScale ?? '0',
        );
        const water = [
          ...element.querySelectorAll<HTMLElement>(
            '[data-map-cell-state="EXPLORED"]'
              + '[data-terrain-state="water"]',
          ),
        ];
        const boundary = [
          ...element.querySelectorAll<HTMLElement>(
            '[data-map-cell-state="UNKNOWN_BOUNDARY"]',
          ),
        ];
        const position = (entry: HTMLElement) => ({
          x: Number.parseFloat(entry.style.left),
          y: Number.parseFloat(entry.style.top),
        });
        return water.some((waterCell) => {
          const w = position(waterCell);
          return boundary.some((unknownCell) => {
            const u = position(unknownCell);
            return (
              Math.abs(w.x - u.x)
              + Math.abs(w.y - u.y)
            ) === scale;
          });
        });
      },
    );
    expect(boundaryTouchesExploredWater).toBe(true);
  };

  for (const scale of [1, 2, 3] as const) {
    await openProductReview(
      page,
      evidence,
      'proz0-p1-polish-002-map-' + String(scale) + 'x',
      scale,
      'visual-local',
      playerIds,
    );

    await page.keyboard.press('m');
    await assertSpatialMap('NEAR', 'NEAR');

    const initialDetail = page.locator('.p1-map-detail');
    await expect(initialDetail).toContainText(
      'LANDING MODULE · BASE · NEAR',
    );
    await expect(
      page.locator('[data-map-selection-label="BASE"]'),
    ).toBeVisible();

    const scaleFile =
      'p1-polish-002-map-' + String(scale) + 'x.png';
    await captureViewport(page, scaleFile);
    files.push(scaleFile);

    if (scale === 2) {
      await page.keyboard.press('Tab');
      await expect(page.locator('.p1-map-detail'))
        .toContainText('UNINVESTIGATED RUIN · FAR');
      await expect(
        page.locator(
          '[data-map-selection-label="UNINVESTIGATED RUIN"]',
        ),
      ).toBeVisible();
      await captureViewport(
        page,
        'p1-polish-002-map-ruin-far-2x.png',
      );
      files.push('p1-polish-002-map-ruin-far-2x.png');

      await page.keyboard.press('Tab');
      await expect(page.locator('.p1-map-detail'))
        .toContainText('DEATH CACHE · NEAR');

      await page.addStyleTag({
        content:
          '[data-panel-kind="map"]{filter:grayscale(1)!important;}',
      });
      const grayscalePanel = page.locator(
        '[data-panel-kind="map"]',
      );
      await expect(grayscalePanel).toHaveCSS(
        'filter',
        'grayscale(1)',
      );
      await page.evaluate(
        () => new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        }),
      );
      await captureViewport(
        page,
        'p1-polish-002-map-grayscale-2x.png',
      );
      files.push('p1-polish-002-map-grayscale-2x.png');
    }
  }

  await openProductReview(
    page,
    baseReadability,
    'proz0-p1-polish-002-base-anchor-2x',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="structure"]'
        + '[data-world-id="structure-instance:landing-module"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-world-role="player"][data-local-player="true"]',
    ),
  ).toHaveCount(1);
  await captureProductWorld(
    page,
    'p1-polish-002-base-anchor-2x.png',
  );
  files.push('p1-polish-002-base-anchor-2x.png');

  await openProductReview(
    page,
    decorReadability,
    'proz0-p1-polish-002-decor-readability-2x',
    2,
  );
  await expect(
    page.locator('[data-world-role="flora-decor"]'),
  ).not.toHaveCount(0);
  await expect(
    page.locator('[data-world-role="flora-decor"]').first(),
  ).toHaveAttribute('data-interactive', 'false');
  await expect(
    page.locator('[data-world-role="flora-decor"]').first(),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/world/terrain/flora_decor.png',
  );
  await captureProductWorld(
    page,
    'p1-polish-002-decor-readability-2x.png',
  );
  files.push('p1-polish-002-decor-readability-2x.png');

  await openProductReview(
    page,
    worldReadability,
    'proz0-p1-polish-002-resource-readability-2x',
    2,
  );
  await expect(
    page.locator('[data-world-role="resource"]'),
  ).not.toHaveCount(0);
  await expect(
    page.locator(
      '[data-world-role="resource"][data-focused-target="true"]',
    ),
  ).toHaveCount(1);
  await captureProductWorld(
    page,
    'p1-polish-002-resource-readability-2x.png',
  );
  files.push(
    'p1-polish-002-resource-readability-2x.png',
  );

  await openProductReview(
    page,
    midEvidence,
    'proz0-p1-polish-002-map-mid-2x',
    2,
    'visual-local',
    playerIds,
  );
  await page.keyboard.press('m');
  await assertSpatialMap('MID', 'MID');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('LANDING MODULE · BASE · MID');
  await page.keyboard.press('Tab');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('UNINVESTIGATED RUIN · FAR');
  await page.keyboard.press('Tab');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('DEATH CACHE · MID');
  await captureViewport(
    page,
    'p1-polish-002-map-cache-mid-2x.png',
  );
  files.push('p1-polish-002-map-cache-mid-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P1-POLISH-002',
    evidenceKind: 'authoritative-spatial-map',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    runtime: {
      mode: 'phase1-product-review',
      canonicalAuthority: true,
      persistence: 'indexeddb-save-v2',
      qaFixture: false,
    },
    cases: {
      map1x: 'p1-polish-002-map-1x.png',
      map2x: 'p1-polish-002-map-2x.png',
      map3x: 'p1-polish-002-map-3x.png',
      ruinFar2x: 'p1-polish-002-map-ruin-far-2x.png',
      deathCacheMid2x: 'p1-polish-002-map-cache-mid-2x.png',
      nearCaseIncludesBaseAndCache: true,
      midCaseMovesPlayerThroughAuthority: true,
      grayscale2x: 'p1-polish-002-map-grayscale-2x.png',
      baseAnchor2x: 'p1-polish-002-base-anchor-2x.png',
      decorReadability2x:
        'p1-polish-002-decor-readability-2x.png',
      resourceReadability2x:
        'p1-polish-002-resource-readability-2x.png',
    },
    invariants: {
      playerFirstReadMarker: true,
      baseAnchorNoHomeState: true,
      exploredUnknownBinary: true,
      unknownCarriesNoTerrainDetail: true,
      waterBoundaryEvidence: true,
      ruinLocatedMarker: true,
      activeDeathCacheMarker: true,
      teammateCurrentPositionOnly: true,
      noGenericResourcePins: true,
      nearMidFarOnlyEligibleTargets: true,
      integerPresentation1x2x3x: true,
      grayscaleEvidence: true,
      grayscalePaintedFrameVerified: true,
      remoteMarkersDoNotCompressLocalTerrain: true,
      selectedOverlapLabel: true,
      baseAnchorWorldEvidence: true,
      decorativeFloraPresentationOnly: true,
      deterministicDecorRevealFixture: true,
      gatherableVsDecorWorldEvidence: true,
    },
    files,
  };
  writeFileSync(
    resolve(
      EVIDENCE_DIR,
      'p1-polish-002-map-manifest.json',
    ),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});

test('P1-INT-001 captures direct Product Review visual correction evidence', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const players = Object.freeze([
    Object.freeze({
      playerId: 'visual-local',
      x: 0,
      y: 0,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-zeta',
      x: 2.25,
      y: 0.25,
      facing: 'W' as const,
    }),
    Object.freeze({
      playerId: 'visual-alpha',
      x: -2.25,
      y: 0.25,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-mu',
      x: 0.25,
      y: -2.25,
      facing: 'S' as const,
    }),
  ]);
  const normalBase = await createBaseSave(
    'world:p1-int-001-visual-normal',
    players,
  );
  const normal = normalBase;
  const thermal = withLocalLoadout(
    normalBase,
    'visual-local',
    { thermalWrap: true },
  );
  const dualEquipment = withLocalLoadout(
    normalBase,
    'visual-local',
    { thermalWrap: true, spear: true },
  );
  const buildValid = withLocalLoadout(
    normalBase,
    'visual-local',
    { machineKit: true },
  );
  const buildConnector = withLocalLoadout(
    normalBase,
    'visual-local',
    { habitatKit: true },
  );

  const files: string[] = [];

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-2x',
    2,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await expect(
    page.locator('[data-world-role="terrain"][data-exploration-state="EXPLORED"]'),
  ).not.toHaveCount(0);
  await expect(page.locator('[data-world-role="fog"]')).not.toHaveCount(0);
  const terrainCoverage = await page.locator(
    '[data-world-role="terrain"]',
  ).evaluateAll((nodes) => {
    const boxes = nodes.map((node) => {
      const element = node as HTMLElement;
      return {
        left: Number.parseFloat(element.style.left),
        top: Number.parseFloat(element.style.top),
        width: Number.parseFloat(element.style.width),
        height: Number.parseFloat(element.style.height),
      };
    });
    const widths = [...new Set(boxes.map((box) => box.width))];
    const heights = [...new Set(boxes.map((box) => box.height))];
    const xs = [...new Set(boxes.map((box) => box.left))]
      .sort((left, right) => left - right);
    const ys = [...new Set(boxes.map((box) => box.top))]
      .sort((left, right) => left - right);
    return {
      widths,
      heights,
      maxXGap: Math.max(
        0,
        ...xs.slice(1).map((value, index) => value - xs[index]!),
      ),
      maxYGap: Math.max(
        0,
        ...ys.slice(1).map((value, index) => value - ys[index]!),
      ),
    };
  });
  expect(terrainCoverage.widths).toEqual([64]);
  expect(terrainCoverage.heights).toEqual([32]);
  expect(terrainCoverage.maxXGap).toBeLessThanOrEqual(64);
  expect(terrainCoverage.maxYGap).toBeLessThanOrEqual(64);
  await expect(page.locator('[data-world-role="fog"]').first())
    .toHaveCSS('width', '64px');
  await expect(page.locator('[data-world-role="fog"]').first())
    .toHaveCSS('height', '32px');

  await expect(
    page.locator('[data-world-role="teammate-identity"]'),
  ).toHaveCount(3);

  // Runtime admission order is deliberately non-lexicographic:
  // zeta -> TEAM_A, alpha -> TEAM_B, mu -> TEAM_C. A renderer that sorts
  // PlayerIds would produce a different assignment and fail this regression.
  const expectedIdentity = [
    ['visual-zeta', 'TEAM_A', 'circle'],
    ['visual-alpha', 'TEAM_B', 'diamond'],
    ['visual-mu', 'TEAM_C', 'triangle'],
  ] as const;
  for (const [playerId, slot, shape] of expectedIdentity) {
    const worldMarker = page.locator(
      '[data-world-role="teammate-identity"]'
        + '[data-world-id="' + playerId + '"]',
    );
    await expect(worldMarker).toHaveAttribute(
      'data-presentation-identity-slot',
      slot,
    );
    await expect(worldMarker).toHaveAttribute(
      'data-marker-shape',
      shape,
    );

    const hudRow = page.locator(
      '.p1-teammate[data-player-id="' + playerId + '"]',
    );
    await expect(hudRow).toHaveAttribute(
      'data-presentation-identity-slot',
      slot,
    );
    await expect(hudRow).toHaveAttribute(
      'data-marker-shape',
      shape,
    );
  }
  await expect(page.locator('[data-region="world"]'))
    .toContainText('4 TEAM');

  await expect(
    page.locator('[data-first-action-cue="visible"]'),
  ).toContainText('FIRST STEP · Move near a resource.');
  await expect(
    page.locator('[data-world-role="player"][data-local-player="true"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-world-role="structure"]'
        + '[data-world-id="structure-instance:landing-module"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-world-role="player"][data-local-player="true"]'),
  ).not.toHaveCSS('filter', 'none');
  await expect(page.locator('.p1-product-controls-panel')).toBeHidden();

  await captureViewport(page, 'polish-first-entry-2x.png');
  files.push('polish-first-entry-2x.png');

  await expect(page.locator('.p1-product-controls-hint')).toBeVisible();
  const hudLaneBounds = await page.evaluate(() => {
    const survival = document.querySelector<HTMLElement>(
      '[data-region="survival"]',
    );
    const controlsHint = document.querySelector<HTMLElement>(
      '.p1-product-controls-hint',
    );
    if (survival === null || controlsHint === null) {
      throw new Error(
        'Polish evidence requires survival and controls elements.',
      );
    }
    const survivalRect = survival.getBoundingClientRect();
    const controlsRect = controlsHint.getBoundingClientRect();
    return {
      survivalBottom: survivalRect.bottom,
      controlsTop: controlsRect.top,
      survivalHeight: survivalRect.height,
      controlsHeight: controlsRect.height,
      controlsDisplay: getComputedStyle(controlsHint).display,
      controlsVisibility: getComputedStyle(controlsHint).visibility,
    };
  });
  expect(hudLaneBounds.survivalHeight).toBeGreaterThan(0);
  expect(hudLaneBounds.controlsHeight).toBeGreaterThan(0);
  expect(hudLaneBounds.controlsDisplay).not.toBe('none');
  expect(hudLaneBounds.controlsVisibility).not.toBe('hidden');
  expect(hudLaneBounds.survivalBottom).toBeLessThanOrEqual(
    hudLaneBounds.controlsTop,
  );

  await captureViewport(page, 'normal-fog-coop-2x.png');
  files.push('normal-fog-coop-2x.png');

  const resourceFocus = await createResourceFocusSave(
    'world:p1-polish-001-resource-focus',
  );
  await openProductReview(
    page,
    resourceFocus,
    'proz0-p1-polish-001-resource-focus',
    2,
  );
  await expect(page.locator('.p1-interaction-main')).toContainText(
    '[E] GATHER · Fiber Plant',
  );
  await expect(
    page.locator('[data-first-action-cue="visible"]'),
  ).toContainText('[E] GATHER · Fiber Plant');
  await expect(
    page.locator(
      '[data-world-role="resource"][data-focused-target="true"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'polish-exact-target-2x.png');
  files.push('polish-exact-target-2x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-polish-001-inventory',
    2,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="inventory"]')).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="inventory"] .p1-item-icon').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="inventory"] .p1-item-row[data-selected="true"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'polish-inventory-2x.png');
  files.push('polish-inventory-2x.png');

  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await expect(page.locator('[data-panel-kind="craft"]')).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="craft"] .p1-craft-ingredient').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="craft"] .p1-craft-station').first(),
  ).toBeVisible();
  const craftIcons2x = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(
      '[data-panel-kind="craft"] .p1-craft-ingredient-icon',
    )].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        assetPath: element.dataset.assetPath ?? null,
        inlineWidth: element.style.width,
        inlineHeight: element.style.height,
        backgroundSize: element.style.backgroundSize,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        connected: element.isConnected,
        display: getComputedStyle(element).display,
        visibility: getComputedStyle(element).visibility,
      };
    }),
  );
  expect(craftIcons2x.length).toBeGreaterThan(0);
  for (const icon of craftIcons2x) {
    expect(icon.assetPath).toBe('assets/phase1/items/item_icon_atlas.png');
    expect(icon.inlineWidth).toBe('24px');
    expect(icon.inlineHeight).toBe('24px');
    expect(icon.backgroundSize).toBe('144px 72px');
    expect(icon.connected).toBe(true);
    expect(icon.display).not.toBe('none');
    expect(icon.visibility).not.toBe('hidden');
    expect(icon.renderedWidth).toBe(48);
    expect(icon.renderedHeight).toBe(48);
  }
  const craftLayout = await page.locator(
    '[data-panel-kind="craft"]',
  ).evaluate((panel) => {
    const element = panel as HTMLElement;
    const rows = [
      ...element.querySelectorAll<HTMLElement>('.p1-craft-row'),
    ];
    const panelRect = element.getBoundingClientRect();
    const lastRowRect = rows.at(-1)?.getBoundingClientRect();
    return {
      rowCount: rows.length,
      panelBottom: panelRect.bottom,
      lastRowBottom: lastRowRect?.bottom ?? Number.POSITIVE_INFINITY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  expect(craftLayout.rowCount).toBe(6);
  expect(craftLayout.lastRowBottom).toBeLessThanOrEqual(
    craftLayout.panelBottom,
  );
  expect(craftLayout.scrollHeight).toBeLessThanOrEqual(
    craftLayout.clientHeight,
  );
  await captureViewport(page, 'polish-craft-have-need-2x.png');
  files.push('polish-craft-have-need-2x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-polish-001-craft-1x',
    1,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await page.keyboard.press('c');
  await expect(page.locator('[data-panel-kind="craft"]')).toBeVisible();
  const craftIcons1x = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(
      '[data-panel-kind="craft"] .p1-craft-ingredient-icon',
    )].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        assetPath: element.dataset.assetPath ?? null,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        backgroundImage: getComputedStyle(element).backgroundImage,
        connected: element.isConnected,
        display: getComputedStyle(element).display,
        visibility: getComputedStyle(element).visibility,
      };
    }),
  );
  expect(craftIcons1x.length).toBeGreaterThan(0);
  for (const icon of craftIcons1x) {
    expect(icon.assetPath).toBe('assets/phase1/items/item_icon_atlas.png');
    expect(icon.connected).toBe(true);
    expect(icon.display).not.toBe('none');
    expect(icon.visibility).not.toBe('hidden');
    expect(icon.renderedWidth).toBe(24);
    expect(icon.renderedHeight).toBe(24);
    expect(icon.backgroundImage).not.toBe('none');
  }
  await captureViewport(page, 'polish-craft-have-need-1x.png');
  files.push('polish-craft-have-need-1x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-1x',
    1,
  );
  await captureViewport(page, 'polish-normal-1x.png');
  files.push('polish-normal-1x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-1363',
    2,
  );
  await page.setViewportSize({ width: 1363, height: 936 });
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-display-scale',
    String(1363 / 640),
  );
  await expect(page.locator('#proz0-canvas')).toHaveCSS('width', '1363px');
  await expect.poll(async () => (await page.locator('#proz0-canvas').boundingBox())?.height)
    .toBeCloseTo(1363 * 360 / 640, 1);
  await captureViewport(page, 'polish-1363x936-fitted.png');
  files.push('polish-1363x936-fitted.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-3x',
    3,
  );
  await captureViewport(page, 'normal-3x.png');
  files.push('normal-3x.png');

  await openProductReview(
    page,
    dualEquipment,
    'proz0-p1-polish-001-dual-equipment',
    2,
  );
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).toContainText('Basic Spear');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('Thermal Wrap');
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).toContainText('C100');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('C100');
  const equipmentOverflow = await page.locator(
    '[data-region="equipment"]',
  ).evaluate((panel) =>
    [...panel.querySelectorAll<HTMLElement>('.p1-equipment-slot')]
      .map((row) => ({
        scrollWidth: row.scrollWidth,
        clientWidth: row.clientWidth,
      })),
  );
  for (const row of equipmentOverflow) {
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  }
  await captureViewport(page, 'polish-dual-equipment-2x.png');
  files.push('polish-dual-equipment-2x.png');

  await openProductReview(
    page,
    thermal,
    'proz0-p1-int-001-thermal-wrap',
    2,
  );
  await expect(
    page.locator('[data-world-role="thermal-wrap-overlay"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'thermal-wrap-2x.png');
  files.push('thermal-wrap-2x.png');

  await openProductReview(
    page,
    buildValid,
    'proz0-p1-int-001-build-valid',
    3,
  );
  await page.keyboard.press('b');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'VALID');
  await captureViewport(page, 'build-valid-3x.png');
  await captureProductWorld(page, 'build-valid-world-3x.png');
  files.push('build-valid-3x.png', 'build-valid-world-3x.png');

  await openProductReview(
    page,
    buildConnector,
    'proz0-p1-int-001-build-connector',
    3,
  );
  await page.keyboard.press('b');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'CONNECTOR');
  await expect(
    page.locator('[data-world-role="build-preview-pattern"]'),
  ).toHaveAttribute('data-production-pattern-state', 'CONNECTOR');
  await captureViewport(page, 'build-connector-3x.png');
  await captureProductWorld(page, 'build-connector-world-3x.png');
  files.push('build-connector-3x.png', 'build-connector-world-3x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-build-invalid',
    3,
  );
  await page.keyboard.press('b');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'INVALID');
  await expect(
    page.locator('[data-panel-kind="build"]'),
  ).toContainText('KIT UNAVAILABLE');
  await captureViewport(page, 'build-invalid-3x.png');
  await captureProductWorld(page, 'build-invalid-world-3x.png');
  files.push('build-invalid-3x.png', 'build-invalid-world-3x.png');

  const criticalHealth = await createCriticalHealthSave(
    'world:p1-polish-001-critical-health',
  );
  await openProductReview(
    page,
    criticalHealth,
    'proz0-p1-polish-001-critical-health',
    2,
  );
  await expect(
    page.locator('[data-region="survival"] .p1-meter[data-severity="critical"]').first(),
  ).toBeVisible();
  await captureViewport(page, 'polish-critical-survival-2x.png');
  files.push('polish-critical-survival-2x.png');

  await page.keyboard.press('h');
  await expect(page.locator('.p1-product-controls-panel')).toBeVisible();
  await captureViewport(page, 'polish-controls-open-2x.png');
  files.push('polish-controls-open-2x.png');

  const nightRain = withAuthorityTick(
    normal,
    135_000,
  );
  await openProductReview(
    page,
    nightRain,
    'proz0-p1-int-001-night-rain',
    2,
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-weather-state',
    'active',
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-day-period',
    'night',
  );
  await expect(
    page.locator('[data-weather-effect="cold-rain"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-night-treatment="accepted-value-treatment"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'cold-rain-night-2x.png');
  files.push('cold-rain-night-2x.png');

  let windup = await createPredatorWindupSave(
    'world:p1-int-001-visual-windup',
  );
  windup = withLocalLoadout(
    windup,
    'visual-local',
    { spear: true },
  );
  await openProductReview(
    page,
    windup,
    'proz0-p1-int-001-windup',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="hostile"][data-predator-visual-state="ATTACK_WINDUP"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'predator-windup-2x.png');
  files.push('predator-windup-2x.png');

  await page.keyboard.press('Space');
  await expect(
    page.locator('[data-world-role="player"]'),
  ).toHaveAttribute('data-actor-state', 'SPEAR_ATTACK');
  await captureViewport(page, 'player-spear-attack-2x.png');
  files.push('player-spear-attack-2x.png');

  const dead = await createDeathSave(
    'world:p1-int-001-visual-dead',
    false,
  );
  await openProductReview(
    page,
    dead,
    'proz0-p1-int-001-dead',
    2,
  );
  await expect(
    page.locator('[data-world-role="player"]'),
  ).toHaveAttribute('data-actor-state', 'DEATH');
  await expect(
    page.locator('[data-world-role="death-cache"]'),
  ).not.toHaveCount(0);
  await captureViewport(page, 'player-death-cache-2x.png');
  files.push('player-death-cache-2x.png');

  const recovered = await createDeathSave(
    'world:p1-int-001-visual-recovery',
    true,
  );
  await openProductReview(
    page,
    recovered,
    'proz0-p1-int-001-recovery',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="death-cache"][data-death-cache-state="TARGETED"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'death-cache-targeted-2x.png');
  files.push('death-cache-targeted-2x.png');

  await page.keyboard.press('e');
  await expect(
    page.locator(
      '[data-world-role="death-cache-recovered"][data-death-cache-state="RECOVERED"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'death-cache-recovered-2x.png');
  files.push('death-cache-recovered-2x.png');

  const drop = await createWorldDropSave(
    'world:p1-int-001-visual-drop',
  );
  await openProductReview(
    page,
    drop,
    'proz0-p1-int-001-drop',
    2,
  );
  await expect(
    page.locator('[data-world-role="world-drop"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-world-role="world-drop-item-icon"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'world-drop-item-icon-2x.png');
  files.push('world-drop-item-icon-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P1-INT-001',
    polishTask: 'P1-POLISH-001',
    evidenceKind: 'direct-phase1-product-review',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    referenceRaster: { width: 640, height: 360 },
    productionAssetFoundation: '#75-#78 accepted raster chain',
    runtime: {
      mode: 'phase1-product-review',
      canonicalAuthority: true,
      persistence: 'indexeddb-save-v2',
      qaFixture: false,
    },
    cases: {
      normalFogCoop2x: 'normal-fog-coop-2x.png',
      polishFirstEntry2x: 'polish-first-entry-2x.png',
      polishExactTarget2x: 'polish-exact-target-2x.png',
      polishNormal1x: 'polish-normal-1x.png',
      polish1363Fitted: 'polish-1363x936-fitted.png',
      polishInventory2x: 'polish-inventory-2x.png',
      polishCraftHaveNeed1x: 'polish-craft-have-need-1x.png',
      polishCraftHaveNeed2x: 'polish-craft-have-need-2x.png',
      polishDualEquipment2x: 'polish-dual-equipment-2x.png',
      polishCriticalSurvival2x: 'polish-critical-survival-2x.png',
      polishControlsOpen2x: 'polish-controls-open-2x.png',
      normal3x: 'normal-3x.png',
      thermalWrap2x: 'thermal-wrap-2x.png',
      buildValid3x: 'build-valid-3x.png',
      buildValidWorld3x: 'build-valid-world-3x.png',
      buildConnector3x: 'build-connector-3x.png',
      buildConnectorWorld3x: 'build-connector-world-3x.png',
      buildInvalid3x: 'build-invalid-3x.png',
      buildInvalidWorld3x: 'build-invalid-world-3x.png',
      coldRainNight2x: 'cold-rain-night-2x.png',
      predatorWindup2x: 'predator-windup-2x.png',
      playerSpearAttack2x: 'player-spear-attack-2x.png',
      playerDeathCache2x: 'player-death-cache-2x.png',
      deathCacheTargeted2x: 'death-cache-targeted-2x.png',
      deathCacheRecovered2x: 'death-cache-recovered-2x.png',
      worldDropItemIcon2x: 'world-drop-item-icon-2x.png',
    },
    invariants: {
      directProductReviewPath: true,
      canonicalAuthority: true,
      saveV2Reopen: true,
      noQaWorldPreview: true,
      integerScale1x2x3x: true,
      centered1363x936FitsViewport: true,
      survivalControlsDoNotOverlap: true,
      craftShowsAllHaveNeedAndStation: true,
      craftUsesNativeItemIcons: true,
      dualEquipmentVisible: true,
      firstActionCueBoundToProgression: true,
      firstEntryBeforeControlsShowsPlayerBaseAndCue: true,
      focusedTargetMatchesInteractionResolver: true,
      terrainAndFogFromCanonicalWorld: true,
      continuousCanonicalCellCoverage: true,
      runtimeOwnedCoopIdentitySlots: true,
      nonLexicographicIdentityRegression: true,
      acceptedRasterStateProjection: true,
    },
    files,
  };
  writeFileSync(
    resolve(EVIDENCE_DIR, 'visual-evidence-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});

test('owner-reported player controls: pages, mouse equipment, pickup and fullscreen', async ({ page }) => {
  test.setTimeout(90_000);
  const evidence = await createInventoryLogisticsSave('world:player-controls-regression');
  await openProductReview(page, evidence, 'proz0-player-controls-regression', 2);
  await page.setViewportSize({ width: 1920, height: 900 });
  await expect(page.locator('canvas')).toHaveAttribute('data-display-scale', '2.5');
  const bounds = await page.locator('canvas').boundingBox();
  expect(bounds?.height).toBeCloseTo(900, 0);
  expect(bounds?.width).toBeCloseTo(1600, 0);

  await page.keyboard.press('c');
  const craft = page.locator('[data-panel-kind="craft"]');
  await expect(craft).toContainText('PAGE 1/2');
  await page.getByRole('button', { name: 'Next page [PgDn]', exact: true }).click();
  await expect(craft).toContainText('PAGE 2/2');
  await page.keyboard.press('PageUp');
  await expect(craft).toContainText('PAGE 1/2');
  await page.keyboard.press(']');
  await expect(craft).toContainText('PAGE 2/2');
  await page.getByRole('button', { name: 'Previous page [PgUp]', exact: true }).click();
  await expect(craft).toContainText('PAGE 1/2');
  await craft.locator('.p1-craft-row').last().scrollIntoViewIfNeeded();
  const lastVisible = await craft.locator('.p1-craft-row').last().evaluate((row) => {
    const box = row.getBoundingClientRect();
    const panel = row.closest('.p1-panel')!.getBoundingClientRect();
    return box.bottom <= panel.bottom + 1 && box.top >= panel.top;
  });
  expect(lastVisible).toBe(true);

  await page.keyboard.press('i');
  await inventoryItemRow(page, 'player', 'Basic Spear').click();
  await page.getByRole('button', { name: 'Equip / Unequip [X]', exact: true }).click();
  await expect(page.locator('.p1-feedback')).toContainText('EQUIP · Basic Spear');
  await page.keyboard.press('i');
  await expect(page.locator('[data-equipment-slot="weapon"]')).toContainText('Basic Spear');
  await page.keyboard.press('i');
  await inventoryItemRow(page, 'player', 'Plant Fiber').click();
  await page.keyboard.press(']');
  await page.keyboard.press('g');
  await expect(inventoryItemRow(page, 'player', 'Plant Fiber')).toContainText('×4');
  await page.keyboard.press('i');
  await expect(page.locator('.p1-interaction-main')).toContainText('PICK UP · Plant Fiber ×2');
  await page.keyboard.press('e');
  await expect(page.locator('[data-world-role="world-drop"]')).toHaveCount(0);
  await page.keyboard.press('e');
  await page.keyboard.press('i');
  await expect(inventoryItemRow(page, 'player', 'Plant Fiber')).toContainText('×6');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Toggle fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
  await page.getByRole('button', { name: 'Toggle fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});


test('colony: builds a visible bed, plants, harvests once and reopens persistent state', async ({ page }) => {
  const base = await createBaseSave('world:colony-browser', [{ playerId: 'farmer', x: -6, y: 4, facing: 'E' }], authority => {
    const inventory = authority.items.getContainerView('inventory:farmer');
    const seeded = authority.items.commitColonyExchange({ operationId: 'fixture:colony', playerId: 'farmer',
      expectedInventoryRevision: inventory.revision, inputs: [], outputs: [
        { itemDefinitionId: 'item:timber', quantity: 3 }, { itemDefinitionId: 'item:cordage', quantity: 1 },
        { itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 1 }] });
    expect(seeded.status).toBe('committed');
  });
  await openProductReview(page, base, 'colony-browser-db', 2, 'farmer');
  await page.keyboard.press('n');
  const panel = page.locator('[data-panel-kind="colony"]');
  await expect(panel).toContainText('CULTIVATION / HUSBANDRY');
  await page.locator('[data-review-action="colony:build-bed"]').click();
  await expect(panel).toContainText('BUILD-BED · DONE');
  await expect(page.locator('[data-world-role="cultivation-bed"]')).toHaveAttribute('data-built', 'true');
  await page.locator('[data-review-action="colony:plant"]').click();
  await expect(panel).toContainText('PLANT · DONE');
  await expect(panel).toContainText('GROWING');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-world-role="cultivated-crop"]')).toHaveCount(3);
  await page.keyboard.press('l');
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload();
  await expect(page.locator('[data-world-role="cultivation-bed"]')).toHaveAttribute('data-built', 'true');
  await page.keyboard.press('n');
  await expect(panel).toContainText('GROWING');
  await page.locator('[data-review-action="colony:harvest"]').click();
  await expect(panel).toContainText('CROP NOT READY');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: resolve(EVIDENCE_DIR, 'colony-growing-2x.png') });
});


test('colony: harvests once and renders a persistent captive grazer with care feedback', async ({ page }) => {
  test.setTimeout(45_000);
  const base = await createBaseSave('world:colony-complete-browser', [{ playerId: 'keeper', x: -6, y: 4, facing: 'E' }], async authority => {
    const inventory = authority.items.getContainerView('inventory:keeper');
    authority.items.commitColonyExchange({ operationId: 'fixture:complete-colony', playerId: 'keeper',
      expectedInventoryRevision: inventory.revision, inputs: [], outputs: [
        { itemDefinitionId: 'item:timber', quantity: 7 }, { itemDefinitionId: 'item:cordage', quantity: 4 },
        { itemDefinitionId: 'item:edible-plant', quantity: 3 }, { itemDefinitionId: 'item:clean-water', quantity: 3 }] });
    const act = (action: 'build-bed' | 'plant' | 'build-pen' | 'capture' | 'care', animalEntityId?: string) => {
      const result = authority.sustenance.execute({ operationId: 'fixture:' + action, playerId: 'keeper', action,
        expectedRevision: authority.sustenance.read().revision,
        expectedInventoryRevision: authority.items.getContainerView('inventory:keeper').revision,
        ...(animalEntityId === undefined ? {} : { animalEntityId }) });
      expect(result.status).toBe('committed');
    };
    act('build-bed'); act('plant');
    authority.getRuntime('keeper').relocatePlayer({ x: 6, y: 4 }); await authority.stepSolo(); act('build-pen');
    const animal = authority.world.getActiveGeneratedEntities().find(entity => entity.type === 'passive-wildlife');
    if (animal === undefined) throw Error('Missing canonical grazer');
    authority.getRuntime('keeper').relocatePlayer(animal.position); await authority.stepSolo(); act('capture', animal.entityId);
    authority.getRuntime('keeper').relocatePlayer({ x: 6, y: 4 }); act('care');
    // Explicit matured fixture. No real-player or offline-growth evidence is inferred from it.
    for (let tick = 0; tick < 10800; tick++) authority.sustenance.tick();
    authority.getRuntime('keeper').relocatePlayer({ x: -6, y: 4 });
  });
  await openProductReview(page, base, 'colony-complete-browser-db', 2, 'keeper');
  await expect(page.locator('[data-world-role="captive-grazer"]')).toHaveCount(1);
  await page.keyboard.press('n');
  const panel = page.locator('[data-panel-kind="colony"]');
  await expect(panel).toContainText('READY TO HARVEST');
  await expect(panel).toContainText('FERTILIZER · 1/4');
  await page.locator('[data-review-action="colony:harvest"]').click();
  await expect(panel).toContainText('HARVEST · DONE');
  await page.locator('[data-review-action="colony:harvest"]').click();
  await expect(panel).toContainText('CROP NOT READY');
  await page.keyboard.press('Escape'); await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="inventory"] .p1-item-row').filter({ hasText: 'Edible Plant' })).toContainText('×4');
  await page.keyboard.press('Escape');
  await page.keyboard.down('s'); await page.keyboard.down('d');
  await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-player-x')),
    { timeout: 10_000, intervals: [25] }).toBeGreaterThanOrEqual(5.8);
  await page.keyboard.up('s'); await page.keyboard.up('d');
  await page.keyboard.press('n');
  await page.locator('[data-review-action="colony:care"]').click();
  await expect(panel).toContainText('CARE · DONE');
  await expect(panel).toContainText('CARED FOR');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: resolve(EVIDENCE_DIR, 'colony-grazer-2x.png') });
});
