import {
  CONTENT_FORMAT_ID,
  CONTENT_SCHEMA_VERSION,
  PHASE1_CONTENT_PACK_ID,
  PHASE1_CONTENT_PACK_VERSION,
  type ContentDefinitionV1,
  type ContentKindV1,
  type ContentPackV1,
  type ItemDefinitionV1,
  type ProgressionDefinitionV1,
} from './SchemaV1';
import {
  ContentValidationException,
  type ContentValidationErrorV1,
  type ContentValidationFailureCodeV1,
} from './ContentValidationError';
import { cloneJsonValue, isJsonCompatible, isPlainObject } from './Immutable';
import { PHASE1_REQUIRED_CONTENT_IDS } from './Phase1Ids';

const CONTENT_ID_PATTERN =
  /^[a-z][a-z0-9-]*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTENT_KINDS = new Set<ContentKindV1>([
  'item',
  'recipe',
  'resource',
  'entity',
  'structure',
  'machine',
  'hazard',
  'weather',
  'hostile',
  'ruin',
  'progression',
  'skill',
  'profession',
  'profession-quest',
]);

const ITEM_CATEGORIES = new Set([
  'raw-resource',
  'food',
  'water',
  'component',
  'tool',
  'weapon',
  'equipment',
  'medical',
  'construction-kit',
  'discovery-item',
]);

const ITEM_CAPABILITIES = new Set([
  'consumable',
  'equippable',
  'usable',
  'gather-tool',
  'melee-weapon',
  'thermal-equipment',
  'construction-kit',
  'discovery-reward',
]);

const STRUCTURE_ROLES = new Set([
  'base-anchor',
  'respawn-anchor',
  'shared-storage',
  'crafting-station',
  'shelter',
  'power-source',
  'machine-host',
]);

type ValidationContext = {
  readonly errors: ContentValidationErrorV1[];
  readonly definitionId?: string;
};

function addError(
  context: ValidationContext,
  code: ContentValidationFailureCodeV1,
  path: string,
  message: string,
): void {
  context.errors.push({
    code,
    ...(context.definitionId === undefined
      ? {}
      : { definitionId: context.definitionId }),
    path,
    message,
  });
}

function checkKeys(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      addError(
        context,
        'INVALID_DEFINITION',
        `${path}.${key}`,
        `Unknown field ${key}.`,
      );
    }
  }
}

function requireString(
  context: ValidationContext,
  value: unknown,
  path: string,
  options: { readonly nonEmpty?: boolean } = {},
): value is string {
  if (
    typeof value !== 'string'
    || (options.nonEmpty === true && value.trim().length === 0)
  ) {
    addError(context, 'INVALID_VALUE', path, 'Expected a valid string.');
    return false;
  }
  return true;
}

function requireBoolean(
  context: ValidationContext,
  value: unknown,
  path: string,
): value is boolean {
  if (typeof value !== 'boolean') {
    addError(context, 'INVALID_VALUE', path, 'Expected a boolean.');
    return false;
  }
  return true;
}

function requireFiniteNumber(
  context: ValidationContext,
  value: unknown,
  path: string,
  options: {
    readonly min?: number;
    readonly exclusiveMin?: number;
    readonly max?: number;
    readonly integer?: boolean;
  } = {},
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addError(context, 'INVALID_VALUE', path, 'Expected a finite number.');
    return false;
  }

  if (options.integer === true && !Number.isSafeInteger(value)) {
    addError(context, 'INVALID_VALUE', path, 'Expected a safe integer.');
  }
  if (options.min !== undefined && value < options.min) {
    addError(
      context,
      'INVALID_VALUE',
      path,
      `Expected value >= ${options.min}.`,
    );
  }
  if (options.exclusiveMin !== undefined && value <= options.exclusiveMin) {
    addError(
      context,
      'INVALID_VALUE',
      path,
      `Expected value > ${options.exclusiveMin}.`,
    );
  }
  if (options.max !== undefined && value > options.max) {
    addError(
      context,
      'INVALID_VALUE',
      path,
      `Expected value <= ${options.max}.`,
    );
  }

  return true;
}

function requireLiteral(
  context: ValidationContext,
  value: unknown,
  path: string,
  expected: string | number | boolean,
): boolean {
  if (value !== expected) {
    addError(
      context,
      'INVALID_VALUE',
      path,
      `Expected literal ${String(expected)}.`,
    );
    return false;
  }
  return true;
}

function requireEnum(
  context: ValidationContext,
  value: unknown,
  path: string,
  allowed: ReadonlySet<string>,
): value is string {
  if (typeof value !== 'string' || !allowed.has(value)) {
    addError(context, 'INVALID_VALUE', path, 'Expected an approved enum value.');
    return false;
  }
  return true;
}

function requireContentId(
  context: ValidationContext,
  value: unknown,
  path: string,
): value is string {
  if (typeof value !== 'string' || !CONTENT_ID_PATTERN.test(value)) {
    addError(
      context,
      'INVALID_CONTENT_ID',
      path,
      'Expected a valid kind-prefixed ContentId.',
    );
    return false;
  }
  return true;
}

function validateContentIdArray(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!Array.isArray(value)) {
    addError(context, 'INVALID_VALUE', path, 'Expected an array.');
    return;
  }

  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (requireContentId(context, entry, entryPath)) {
      if (seen.has(entry)) {
        addError(
          context,
          'INVALID_VALUE',
          entryPath,
          `Duplicate reference ${entry}.`,
        );
      }
      seen.add(entry);
    }
  });
}

function validateItemQuantity(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!isPlainObject(value)) {
    addError(context, 'INVALID_DEFINITION', path, 'Expected item quantity object.');
    return;
  }

  checkKeys(context, value, path, ['itemId', 'quantity', 'initialCondition']);
  requireContentId(context, value.itemId, `${path}.itemId`);
  requireFiniteNumber(context, value.quantity, `${path}.quantity`, {
    exclusiveMin: 0,
    integer: true,
  });

  if ('initialCondition' in value) {
    requireFiniteNumber(
      context,
      value.initialCondition,
      `${path}.initialCondition`,
      { min: 0, max: 100, integer: true },
    );
  }
}

function validateItemQuantityArray(
  context: ValidationContext,
  value: unknown,
  path: string,
  allowEmpty: boolean,
): void {
  if (!Array.isArray(value)) {
    addError(context, 'INVALID_VALUE', path, 'Expected an array.');
    return;
  }
  if (!allowEmpty && value.length === 0) {
    addError(context, 'INVALID_VALUE', path, 'Array must not be empty.');
  }

  value.forEach((entry, index) => {
    validateItemQuantity(context, entry, `${path}[${index}]`);
  });
}

function validateUseProfile(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    addError(context, 'INVALID_DEFINITION', path, 'Expected use profile object.');
    return;
  }

  switch (value.type) {
    case 'restore-stat':
      checkKeys(context, value, path, [
        'type',
        'stat',
        'amount',
        'channelSeconds',
      ]);
      requireEnum(
        context,
        value.stat,
        `${path}.stat`,
        new Set(['health', 'food', 'water']),
      );
      requireFiniteNumber(context, value.amount, `${path}.amount`, {
        exclusiveMin: 0,
      });
      requireFiniteNumber(
        context,
        value.channelSeconds,
        `${path}.channelSeconds`,
        { min: 0 },
      );
      break;

    case 'melee-weapon':
      checkKeys(context, value, path, [
        'type',
        'rangeFootprints',
        'frontalArcDegrees',
        'staminaCost',
        'damage',
        'cooldownSeconds',
        'conditionCostOnSuccessfulHit',
      ]);
      requireFiniteNumber(
        context,
        value.rangeFootprints,
        `${path}.rangeFootprints`,
        { exclusiveMin: 0 },
      );
      requireFiniteNumber(
        context,
        value.frontalArcDegrees,
        `${path}.frontalArcDegrees`,
        { exclusiveMin: 0, max: 360 },
      );
      requireFiniteNumber(context, value.staminaCost, `${path}.staminaCost`, {
        min: 0,
      });
      requireFiniteNumber(context, value.damage, `${path}.damage`, {
        min: 0,
      });
      requireFiniteNumber(
        context,
        value.cooldownSeconds,
        `${path}.cooldownSeconds`,
        { min: 0 },
      );
      requireFiniteNumber(
        context,
        value.conditionCostOnSuccessfulHit,
        `${path}.conditionCostOnSuccessfulHit`,
        { min: 0, integer: true },
      );
      break;

    case 'thermal-protection':
      checkKeys(context, value, path, [
        'type',
        'harmfulThermalRateMultiplier',
      ]);
      requireFiniteNumber(
        context,
        value.harmfulThermalRateMultiplier,
        `${path}.harmfulThermalRateMultiplier`,
        { min: 0, max: 1 },
      );
      break;

    default:
      addError(
        context,
        'INVALID_VALUE',
        `${path}.type`,
        'Unknown item use profile type.',
      );
  }
}

function validateBase(
  context: ValidationContext,
  value: Record<string, unknown>,
  index: number,
): ContentKindV1 | null {
  requireContentId(context, value.id, `definitions[${index}].id`);
  requireString(
    context,
    value.displayName,
    `definitions[${index}].displayName`,
    { nonEmpty: true },
  );

  if (
    typeof value.kind !== 'string'
    || !CONTENT_KINDS.has(value.kind as ContentKindV1)
  ) {
    addError(
      context,
      'INVALID_VALUE',
      `definitions[${index}].kind`,
      'Unknown content definition kind.',
    );
    return null;
  }

  if (
    typeof value.id === 'string'
    && CONTENT_ID_PATTERN.test(value.id)
    && value.id.split(':', 1)[0] !== value.kind
  ) {
    addError(
      context,
      'ID_KIND_MISMATCH',
      `definitions[${index}].id`,
      `ContentId prefix must match kind ${value.kind}.`,
    );
  }

  return value.kind as ContentKindV1;
}

function validateItem(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'category',
    'unitWeightKg',
    'unitVolume',
    'maxStack',
    'conditionMax',
    'ordinaryStorageAllowed',
    'capabilities',
    'useProfile',
  ]);

  requireEnum(context, value.category, `${path}.category`, ITEM_CATEGORIES);
  requireFiniteNumber(context, value.unitWeightKg, `${path}.unitWeightKg`, {
    exclusiveMin: 0,
  });
  requireFiniteNumber(context, value.unitVolume, `${path}.unitVolume`, {
    exclusiveMin: 0,
  });
  requireFiniteNumber(context, value.maxStack, `${path}.maxStack`, {
    exclusiveMin: 0,
    integer: true,
  });

  if (value.conditionMax !== null) {
    requireFiniteNumber(
      context,
      value.conditionMax,
      `${path}.conditionMax`,
      { exclusiveMin: 0, integer: true },
    );
  }

  requireBoolean(
    context,
    value.ordinaryStorageAllowed,
    `${path}.ordinaryStorageAllowed`,
  );

  if (!Array.isArray(value.capabilities)) {
    addError(context, 'INVALID_VALUE', `${path}.capabilities`, 'Expected array.');
  } else {
    const seen = new Set<string>();
    value.capabilities.forEach((capability, index) => {
      const capabilityPath = `${path}.capabilities[${index}]`;
      if (
        requireEnum(
          context,
          capability,
          capabilityPath,
          ITEM_CAPABILITIES,
        )
      ) {
        if (seen.has(capability)) {
          addError(
            context,
            'INVALID_VALUE',
            capabilityPath,
            `Duplicate capability ${capability}.`,
          );
        }
        seen.add(capability);
      }
    });
  }

  if ('useProfile' in value) {
    validateUseProfile(context, value.useProfile, `${path}.useProfile`);
  }
}

function validateRecipe(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'tier',
    'requiredStationStructureId',
    'inputs',
    'outputs',
  ]);
  requireEnum(
    context,
    value.tier,
    `${path}.tier`,
    new Set(['hand', 'workbench']),
  );
  if (value.requiredStationStructureId !== null) {
    requireContentId(
      context,
      value.requiredStationStructureId,
      `${path}.requiredStationStructureId`,
    );
  }
  validateItemQuantityArray(context, value.inputs, `${path}.inputs`, false);
  validateItemQuantityArray(context, value.outputs, `${path}.outputs`, false);
}

function validateResource(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'gatherChannelSeconds',
    'requiredToolItemId',
    'output',
    'maxGatherActions',
    'regenerationActiveSeconds',
    'toolConditionCostPerSuccessfulGather',
  ]);
  requireFiniteNumber(
    context,
    value.gatherChannelSeconds,
    `${path}.gatherChannelSeconds`,
    { exclusiveMin: 0 },
  );
  if (value.requiredToolItemId !== null) {
    requireContentId(
      context,
      value.requiredToolItemId,
      `${path}.requiredToolItemId`,
    );
  }
  validateItemQuantity(context, value.output, `${path}.output`);
  if (value.maxGatherActions !== null) {
    requireFiniteNumber(
      context,
      value.maxGatherActions,
      `${path}.maxGatherActions`,
      { exclusiveMin: 0, integer: true },
    );
  }
  if (value.regenerationActiveSeconds !== null) {
    requireFiniteNumber(
      context,
      value.regenerationActiveSeconds,
      `${path}.regenerationActiveSeconds`,
      { exclusiveMin: 0 },
    );
  }
  requireFiniteNumber(
    context,
    value.toolConditionCostPerSuccessfulGather,
    `${path}.toolConditionCostPerSuccessfulGather`,
    { min: 0, integer: true },
  );
}

function validateStructure(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'sourceKitItemId',
    'placeableByPlayer',
    'phase1WorldCap',
    'roles',
    'container',
    'shelter',
    'powerSource',
    'machineDefinitionId',
  ]);

  if (value.sourceKitItemId !== null) {
    requireContentId(context, value.sourceKitItemId, `${path}.sourceKitItemId`);
  }
  requireBoolean(context, value.placeableByPlayer, `${path}.placeableByPlayer`);
  requireFiniteNumber(context, value.phase1WorldCap, `${path}.phase1WorldCap`, {
    exclusiveMin: 0,
    integer: true,
  });

  if (!Array.isArray(value.roles) || value.roles.length === 0) {
    addError(context, 'INVALID_VALUE', `${path}.roles`, 'Expected non-empty array.');
  } else {
    const seen = new Set<string>();
    value.roles.forEach((role, index) => {
      const rolePath = `${path}.roles[${index}]`;
      if (requireEnum(context, role, rolePath, STRUCTURE_ROLES)) {
        if (seen.has(role)) {
          addError(context, 'INVALID_VALUE', rolePath, `Duplicate role ${role}.`);
        }
        seen.add(role);
      }
    });
  }

  if ('container' in value) {
    if (!isPlainObject(value.container)) {
      addError(context, 'INVALID_DEFINITION', `${path}.container`, 'Expected object.');
    } else {
      checkKeys(context, value.container, `${path}.container`, [
        'maxWeightKg',
        'maxVolume',
        'acceptsAllPhase1PortableCategories',
        'nestedContainersAllowed',
      ]);
      requireFiniteNumber(
        context,
        value.container.maxWeightKg,
        `${path}.container.maxWeightKg`,
        { exclusiveMin: 0 },
      );
      requireFiniteNumber(
        context,
        value.container.maxVolume,
        `${path}.container.maxVolume`,
        { exclusiveMin: 0 },
      );
      requireLiteral(
        context,
        value.container.acceptsAllPhase1PortableCategories,
        `${path}.container.acceptsAllPhase1PortableCategories`,
        true,
      );
      requireLiteral(
        context,
        value.container.nestedContainersAllowed,
        `${path}.container.nestedContainersAllowed`,
        false,
      );
    }
  }

  if ('shelter' in value) {
    if (!isPlainObject(value.shelter)) {
      addError(context, 'INVALID_DEFINITION', `${path}.shelter`, 'Expected object.');
    } else {
      checkKeys(context, value.shelter, `${path}.shelter`, ['thermalTarget']);
      requireFiniteNumber(
        context,
        value.shelter.thermalTarget,
        `${path}.shelter.thermalTarget`,
        { min: 0, max: 100 },
      );
    }
  }

  if ('powerSource' in value) {
    if (!isPlainObject(value.powerSource)) {
      addError(context, 'INVALID_DEFINITION', `${path}.powerSource`, 'Expected object.');
    } else {
      checkKeys(context, value.powerSource, `${path}.powerSource`, [
        'capacityPu',
        'radiusFootprints',
        'alwaysOn',
        'consumesPortableFuel',
      ]);
      requireFiniteNumber(
        context,
        value.powerSource.capacityPu,
        `${path}.powerSource.capacityPu`,
        { exclusiveMin: 0 },
      );
      requireFiniteNumber(
        context,
        value.powerSource.radiusFootprints,
        `${path}.powerSource.radiusFootprints`,
        { exclusiveMin: 0 },
      );
      requireLiteral(
        context,
        value.powerSource.alwaysOn,
        `${path}.powerSource.alwaysOn`,
        true,
      );
      requireLiteral(
        context,
        value.powerSource.consumesPortableFuel,
        `${path}.powerSource.consumesPortableFuel`,
        false,
      );
    }
  }

  if ('machineDefinitionId' in value) {
    requireContentId(
      context,
      value.machineDefinitionId,
      `${path}.machineDefinitionId`,
    );
  }
}

function validateMachine(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'powerDemandPu',
    'inputItems',
    'outputItemId',
    'outputQuantityPerCycle',
    'cycleActivePoweredSeconds',
    'outputBufferCapacity',
    'supportsManualEnable',
    'producesWhileAuthorityOffline',
    'hasPeriodicWear',
  ]);
  requireFiniteNumber(context, value.powerDemandPu, `${path}.powerDemandPu`, {
    exclusiveMin: 0,
  });
  validateItemQuantityArray(context, value.inputItems, `${path}.inputItems`, true);
  requireContentId(context, value.outputItemId, `${path}.outputItemId`);
  requireFiniteNumber(
    context,
    value.outputQuantityPerCycle,
    `${path}.outputQuantityPerCycle`,
    { exclusiveMin: 0, integer: true },
  );
  requireFiniteNumber(
    context,
    value.cycleActivePoweredSeconds,
    `${path}.cycleActivePoweredSeconds`,
    { exclusiveMin: 0 },
  );
  requireFiniteNumber(
    context,
    value.outputBufferCapacity,
    `${path}.outputBufferCapacity`,
    { exclusiveMin: 0, integer: true },
  );
  requireBoolean(
    context,
    value.supportsManualEnable,
    `${path}.supportsManualEnable`,
  );
  requireLiteral(
    context,
    value.producesWhileAuthorityOffline,
    `${path}.producesWhileAuthorityOffline`,
    false,
  );
  requireLiteral(
    context,
    value.hasPeriodicWear,
    `${path}.hasPeriodicWear`,
    false,
  );
}

function validateProgressionTrigger(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    addError(context, 'INVALID_DEFINITION', path, 'Expected progression trigger.');
    return;
  }

  switch (value.type) {
    case 'first-gather':
      checkKeys(context, value, path, ['type', 'resourceId']);
      requireContentId(context, value.resourceId, `${path}.resourceId`);
      break;
    case 'first-craft':
      checkKeys(context, value, path, ['type', 'recipeId']);
      requireContentId(context, value.recipeId, `${path}.recipeId`);
      break;
    case 'first-condition-repair':
    case 'first-expedition-band-entry':
    case 'first-own-death-cache-recovery':
      checkKeys(context, value, path, ['type']);
      break;
    case 'first-structure-placement':
      checkKeys(context, value, path, ['type', 'structureId']);
      requireContentId(context, value.structureId, `${path}.structureId`);
      break;
    case 'first-machine-output-collect':
      checkKeys(context, value, path, ['type', 'machineId', 'itemId']);
      requireContentId(context, value.machineId, `${path}.machineId`);
      requireContentId(context, value.itemId, `${path}.itemId`);
      break;
    case 'first-ruin-locate':
    case 'first-ruin-inspect':
      checkKeys(context, value, path, ['type', 'ruinId']);
      requireContentId(context, value.ruinId, `${path}.ruinId`);
      break;
    case 'hostile-resolution':
      checkKeys(context, value, path, ['type', 'hostileId']);
      requireContentId(context, value.hostileId, `${path}.hostileId`);
      break;
    default:
      addError(context, 'INVALID_VALUE', `${path}.type`, 'Unknown progression trigger.');
  }
}

function validateProgression(
  context: ValidationContext,
  value: Record<string, unknown>,
  path: string,
): void {
  checkKeys(context, value, path, [
    'id',
    'kind',
    'displayName',
    'levelThresholds',
    'milestoneRules',
    'repeatRules',
    'deathXpLoss',
  ]);

  if (!Array.isArray(value.levelThresholds) || value.levelThresholds.length === 0) {
    addError(context, 'INVALID_VALUE', `${path}.levelThresholds`, 'Expected non-empty array.');
  } else {
    value.levelThresholds.forEach((entry, index) => {
      const entryPath = `${path}.levelThresholds[${index}]`;
      if (!isPlainObject(entry)) {
        addError(context, 'INVALID_DEFINITION', entryPath, 'Expected threshold object.');
        return;
      }
      checkKeys(context, entry, entryPath, ['level', 'totalXpRequired']);
      requireFiniteNumber(context, entry.level, `${entryPath}.level`, {
        exclusiveMin: 0,
        integer: true,
      });
      requireFiniteNumber(
        context,
        entry.totalXpRequired,
        `${entryPath}.totalXpRequired`,
        { min: 0, integer: true },
      );
    });
  }

  if (!Array.isArray(value.milestoneRules)) {
    addError(context, 'INVALID_VALUE', `${path}.milestoneRules`, 'Expected array.');
  } else {
    value.milestoneRules.forEach((entry, index) => {
      const entryPath = `${path}.milestoneRules[${index}]`;
      if (!isPlainObject(entry)) {
        addError(context, 'INVALID_DEFINITION', entryPath, 'Expected milestone rule.');
        return;
      }
      checkKeys(context, entry, entryPath, ['id', 'trigger', 'xp', 'lifetimeScope']);
      requireString(context, entry.id, `${entryPath}.id`, { nonEmpty: true });
      validateProgressionTrigger(context, entry.trigger, `${entryPath}.trigger`);
      requireFiniteNumber(context, entry.xp, `${entryPath}.xp`, {
        exclusiveMin: 0,
        integer: true,
      });
      requireLiteral(
        context,
        entry.lifetimeScope,
        `${entryPath}.lifetimeScope`,
        'per-player-world',
      );
    });
  }

  if (!Array.isArray(value.repeatRules)) {
    addError(context, 'INVALID_VALUE', `${path}.repeatRules`, 'Expected array.');
  } else {
    value.repeatRules.forEach((entry, index) => {
      const entryPath = `${path}.repeatRules[${index}]`;
      if (!isPlainObject(entry)) {
        addError(context, 'INVALID_DEFINITION', entryPath, 'Expected repeat rule.');
        return;
      }
      checkKeys(context, entry, entryPath, [
        'id',
        'triggerType',
        'xpPerRewardedAction',
        'maxRewardedActions',
        'lifetimeScope',
      ]);
      requireString(context, entry.id, `${entryPath}.id`, { nonEmpty: true });
      requireEnum(
        context,
        entry.triggerType,
        `${entryPath}.triggerType`,
        new Set(['gather', 'craft', 'repair']),
      );
      requireFiniteNumber(
        context,
        entry.xpPerRewardedAction,
        `${entryPath}.xpPerRewardedAction`,
        { exclusiveMin: 0, integer: true },
      );
      requireFiniteNumber(
        context,
        entry.maxRewardedActions,
        `${entryPath}.maxRewardedActions`,
        { exclusiveMin: 0, integer: true },
      );
      requireLiteral(
        context,
        entry.lifetimeScope,
        `${entryPath}.lifetimeScope`,
        'per-player-world',
      );
    });
  }

  if (!isPlainObject(value.deathXpLoss)) {
    addError(context, 'INVALID_DEFINITION', `${path}.deathXpLoss`, 'Expected object.');
  } else {
    checkKeys(context, value.deathXpLoss, `${path}.deathXpLoss`, [
      'percentCurrentLevelProgress',
      'minimumLossWhenProgressPositive',
      'mayReduceLevel',
    ]);
    requireLiteral(
      context,
      value.deathXpLoss.percentCurrentLevelProgress,
      `${path}.deathXpLoss.percentCurrentLevelProgress`,
      5,
    );
    requireLiteral(
      context,
      value.deathXpLoss.minimumLossWhenProgressPositive,
      `${path}.deathXpLoss.minimumLossWhenProgressPositive`,
      1,
    );
    requireLiteral(
      context,
      value.deathXpLoss.mayReduceLevel,
      `${path}.deathXpLoss.mayReduceLevel`,
      false,
    );
  }
}

function validateSkillRequirement(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    addError(context, 'INVALID_DEFINITION', path, 'Expected skill requirement.');
    return;
  }
  switch (value.type) {
    case 'minimum-level':
      checkKeys(context, value, path, ['type', 'level']);
      requireFiniteNumber(context, value.level, `${path}.level`, {
        exclusiveMin: 0,
        integer: true,
      });
      break;
    case 'first-expedition-band-entry':
    case 'first-workbench-condition-repair':
      checkKeys(context, value, path, ['type']);
      break;
    default:
      addError(context, 'INVALID_VALUE', `${path}.type`, 'Unknown skill requirement.');
  }
}

function validateProfessionObjective(
  context: ValidationContext,
  value: unknown,
  path: string,
): void {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    addError(context, 'INVALID_DEFINITION', path, 'Expected profession objective.');
    return;
  }

  switch (value.type) {
    case 'locate-ruin':
    case 'inspect-ruin':
      checkKeys(context, value, path, ['type', 'ruinId']);
      requireContentId(context, value.ruinId, `${path}.ruinId`);
      break;
    case 'return-alive-to-any-structure':
    case 'structures-present':
      checkKeys(context, value, path, ['type', 'structureIds']);
      validateContentIdArray(context, value.structureIds, `${path}.structureIds`);
      break;
    case 'interact-powered-machine':
      checkKeys(context, value, path, ['type', 'machineId']);
      requireContentId(context, value.machineId, `${path}.machineId`);
      break;
    case 'collect-machine-output':
      checkKeys(context, value, path, ['type', 'machineId', 'itemId', 'quantity']);
      requireContentId(context, value.machineId, `${path}.machineId`);
      requireContentId(context, value.itemId, `${path}.itemId`);
      requireFiniteNumber(context, value.quantity, `${path}.quantity`, {
        exclusiveMin: 0,
        integer: true,
      });
      break;
    default:
      addError(context, 'INVALID_VALUE', `${path}.type`, 'Unknown profession objective.');
  }
}

function validateDefinition(
  errors: ContentValidationErrorV1[],
  value: unknown,
  index: number,
): void {
  const path = `definitions[${index}]`;

  if (!isPlainObject(value)) {
    errors.push({
      code: 'INVALID_DEFINITION',
      path,
      message: 'Expected a content definition object.',
    });
    return;
  }

  const context: ValidationContext = {
    errors,
    ...(typeof value.id === 'string' ? { definitionId: value.id } : {}),
  };
  const kind = validateBase(context, value, index);

  switch (kind) {
    case 'item':
      validateItem(context, value, path);
      break;
    case 'recipe':
      validateRecipe(context, value, path);
      break;
    case 'resource':
      validateResource(context, value, path);
      break;
    case 'entity':
      checkKeys(context, value, path, ['id', 'kind', 'displayName', 'role']);
      requireLiteral(context, value.role, `${path}.role`, 'passive-wildlife');
      break;
    case 'structure':
      validateStructure(context, value, path);
      break;
    case 'machine':
      validateMachine(context, value, path);
      break;
    case 'hazard':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'hazardType',
        'mitigationItemIds',
        'directHealthDamage',
      ]);
      requireLiteral(
        context,
        value.hazardType,
        `${path}.hazardType`,
        'cold-exposure',
      );
      validateContentIdArray(
        context,
        value.mitigationItemIds,
        `${path}.mitigationItemIds`,
      );
      requireLiteral(
        context,
        value.directHealthDamage,
        `${path}.directHealthDamage`,
        false,
      );
      break;
    case 'weather':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'hazardIds',
        'firstSessionStartWindowActiveMinutes',
        'durationActiveSeconds',
        'warningSeconds',
        'dayThermalTarget',
        'nightThermalTarget',
        'changesPersistentFogKnowledge',
        'directHealthDamage',
      ]);
      validateContentIdArray(context, value.hazardIds, `${path}.hazardIds`);
      if (
        !Array.isArray(value.firstSessionStartWindowActiveMinutes)
        || value.firstSessionStartWindowActiveMinutes.length !== 2
      ) {
        addError(
          context,
          'INVALID_VALUE',
          `${path}.firstSessionStartWindowActiveMinutes`,
          'Expected a two-value start window.',
        );
      } else {
        const first = value.firstSessionStartWindowActiveMinutes[0];
        const second = value.firstSessionStartWindowActiveMinutes[1];
        if (
          requireFiniteNumber(
            context,
            first,
            `${path}.firstSessionStartWindowActiveMinutes[0]`,
            { min: 0 },
          )
          && requireFiniteNumber(
            context,
            second,
            `${path}.firstSessionStartWindowActiveMinutes[1]`,
            { min: 0 },
          )
          && first > second
        ) {
          addError(
            context,
            'INVALID_VALUE',
            `${path}.firstSessionStartWindowActiveMinutes`,
            'Start window must be ascending.',
          );
        }
      }
      requireFiniteNumber(
        context,
        value.durationActiveSeconds,
        `${path}.durationActiveSeconds`,
        { exclusiveMin: 0 },
      );
      requireFiniteNumber(
        context,
        value.warningSeconds,
        `${path}.warningSeconds`,
        { min: 0 },
      );
      requireFiniteNumber(
        context,
        value.dayThermalTarget,
        `${path}.dayThermalTarget`,
        { min: 0, max: 100 },
      );
      requireFiniteNumber(
        context,
        value.nightThermalTarget,
        `${path}.nightThermalTarget`,
        { min: 0, max: 100 },
      );
      requireLiteral(
        context,
        value.changesPersistentFogKnowledge,
        `${path}.changesPersistentFogKnowledge`,
        false,
      );
      requireLiteral(
        context,
        value.directHealthDamage,
        `${path}.directHealthDamage`,
        false,
      );
      break;
    case 'hostile':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'maxHealth',
        'aggressionRadiusFootprints',
        'alertSeconds',
        'leashRadiusFootprints',
        'disengageOutsideSeconds',
        'attack',
        'targetPolicy',
        'requiredUniqueDropItemId',
      ]);
      for (const [field, fieldValue] of [
        ['maxHealth', value.maxHealth],
        ['aggressionRadiusFootprints', value.aggressionRadiusFootprints],
        ['alertSeconds', value.alertSeconds],
        ['leashRadiusFootprints', value.leashRadiusFootprints],
        ['disengageOutsideSeconds', value.disengageOutsideSeconds],
      ] as const) {
        requireFiniteNumber(context, fieldValue, `${path}.${field}`, {
          exclusiveMin: 0,
        });
      }
      if (!isPlainObject(value.attack)) {
        addError(context, 'INVALID_DEFINITION', `${path}.attack`, 'Expected attack object.');
      } else {
        checkKeys(context, value.attack, `${path}.attack`, [
          'rangeFootprints',
          'windupSeconds',
          'damage',
          'recoverySeconds',
        ]);
        for (const [field, fieldValue] of [
          ['rangeFootprints', value.attack.rangeFootprints],
          ['windupSeconds', value.attack.windupSeconds],
          ['damage', value.attack.damage],
          ['recoverySeconds', value.attack.recoverySeconds],
        ] as const) {
          requireFiniteNumber(
            context,
            fieldValue,
            `${path}.attack.${field}`,
            { exclusiveMin: 0 },
          );
        }
      }
      requireLiteral(
        context,
        value.targetPolicy,
        `${path}.targetPolicy`,
        'nearest-valid-threatening-player',
      );
      if (value.requiredUniqueDropItemId !== null) {
        addError(
          context,
          'INVALID_VALUE',
          `${path}.requiredUniqueDropItemId`,
          'Phase 1 hostile must not require a unique progression drop.',
        );
      }
      break;
    case 'ruin':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'locateRadiusFootprints',
        'interaction',
        'investigationIsImmediate',
        'discoverySharedWithTeam',
        'oneTimePhysicalReward',
        'rewardRemainsClaimableIfInventoryFull',
      ]);
      requireFiniteNumber(
        context,
        value.locateRadiusFootprints,
        `${path}.locateRadiusFootprints`,
        { exclusiveMin: 0 },
      );
      requireLiteral(context, value.interaction, `${path}.interaction`, 'inspect');
      requireLiteral(
        context,
        value.investigationIsImmediate,
        `${path}.investigationIsImmediate`,
        true,
      );
      requireLiteral(
        context,
        value.discoverySharedWithTeam,
        `${path}.discoverySharedWithTeam`,
        true,
      );
      validateItemQuantity(
        context,
        value.oneTimePhysicalReward,
        `${path}.oneTimePhysicalReward`,
      );
      requireLiteral(
        context,
        value.rewardRemainsClaimableIfInventoryFull,
        `${path}.rewardRemainsClaimableIfInventoryFull`,
        true,
      );
      break;
    case 'progression':
      validateProgression(context, value, path);
      break;
    case 'skill':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'requirements',
        'grantsPhase1StatModifier',
      ]);
      if (!Array.isArray(value.requirements) || value.requirements.length === 0) {
        addError(context, 'INVALID_VALUE', `${path}.requirements`, 'Expected non-empty array.');
      } else {
        value.requirements.forEach((entry, requirementIndex) => {
          validateSkillRequirement(
            context,
            entry,
            `${path}.requirements[${requirementIndex}]`,
          );
        });
      }
      requireLiteral(
        context,
        value.grantsPhase1StatModifier,
        `${path}.grantsPhase1StatModifier`,
        false,
      );
      break;
    case 'profession':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'prototypeOnly',
        'exclusiveLock',
        'grantsExclusiveCriticalPathCapability',
      ]);
      requireLiteral(context, value.prototypeOnly, `${path}.prototypeOnly`, true);
      requireLiteral(context, value.exclusiveLock, `${path}.exclusiveLock`, false);
      requireLiteral(
        context,
        value.grantsExclusiveCriticalPathCapability,
        `${path}.grantsExclusiveCriticalPathCapability`,
        false,
      );
      break;
    case 'profession-quest':
      checkKeys(context, value, path, [
        'id',
        'kind',
        'displayName',
        'minimumLevel',
        'requiredSkillId',
        'objectives',
        'rewardProfessionId',
        'rewardXp',
      ]);
      requireFiniteNumber(context, value.minimumLevel, `${path}.minimumLevel`, {
        exclusiveMin: 0,
        integer: true,
      });
      requireContentId(context, value.requiredSkillId, `${path}.requiredSkillId`);
      if (!Array.isArray(value.objectives) || value.objectives.length === 0) {
        addError(context, 'INVALID_VALUE', `${path}.objectives`, 'Expected non-empty array.');
      } else {
        value.objectives.forEach((entry, objectiveIndex) => {
          validateProfessionObjective(
            context,
            entry,
            `${path}.objectives[${objectiveIndex}]`,
          );
        });
      }
      requireContentId(
        context,
        value.rewardProfessionId,
        `${path}.rewardProfessionId`,
      );
      requireFiniteNumber(context, value.rewardXp, `${path}.rewardXp`, {
        exclusiveMin: 0,
        integer: true,
      });
      break;
    case null:
      break;
  }
}

function checkDuplicateItemSpecs(
  errors: ContentValidationErrorV1[],
  definitionId: string,
  specs: readonly { readonly itemId: string }[],
  path: string,
): void {
  const seen = new Set<string>();
  specs.forEach((spec, index) => {
    if (seen.has(spec.itemId)) {
      errors.push({
        code: 'DUPLICATE_ID',
        definitionId,
        path: `${path}[${index}].itemId`,
        message: `Duplicate item reference ${spec.itemId}.`,
      });
    }
    seen.add(spec.itemId);
  });
}

function collectIdentityErrors(
  pack: ContentPackV1,
  errors: ContentValidationErrorV1[],
): Map<string, ContentDefinitionV1> {
  const byId = new Map<string, ContentDefinitionV1>();

  for (const definition of pack.definitions) {
    if (byId.has(definition.id)) {
      errors.push({
        code: 'DUPLICATE_ID',
        definitionId: definition.id,
        path: 'id',
        message: `Duplicate content definition id ${definition.id}.`,
      });
      continue;
    }
    byId.set(definition.id, definition);

    if (definition.kind === 'recipe') {
      checkDuplicateItemSpecs(
        errors,
        definition.id,
        definition.inputs,
        'inputs',
      );
      checkDuplicateItemSpecs(
        errors,
        definition.id,
        definition.outputs,
        'outputs',
      );
    }

    if (definition.kind === 'progression') {
      const ruleIds = new Set<string>();
      for (const [groupName, rules] of [
        ['milestoneRules', definition.milestoneRules],
        ['repeatRules', definition.repeatRules],
      ] as const) {
        rules.forEach((rule, index) => {
          if (ruleIds.has(rule.id)) {
            errors.push({
              code: 'DUPLICATE_ID',
              definitionId: definition.id,
              path: `${groupName}[${index}].id`,
              message: `Duplicate progression rule id ${rule.id}.`,
            });
          }
          ruleIds.add(rule.id);
        });
      }
    }
  }

  return byId;
}

function requireReference(
  errors: ContentValidationErrorV1[],
  byId: ReadonlyMap<string, ContentDefinitionV1>,
  ownerId: string,
  path: string,
  id: string,
  expectedKind: ContentKindV1,
  predicate?: (definition: ContentDefinitionV1) => boolean,
): void {
  const target = byId.get(id);

  if (target === undefined) {
    errors.push({
      code: 'MISSING_REFERENCE',
      definitionId: ownerId,
      path,
      message: `Missing referenced content ${id}.`,
    });
    return;
  }

  if (target.kind !== expectedKind) {
    errors.push({
      code: 'WRONG_REFERENCE_KIND',
      definitionId: ownerId,
      path,
      message: `Reference ${id} must be kind ${expectedKind}, received ${target.kind}.`,
    });
    return;
  }

  if (predicate !== undefined && !predicate(target)) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: ownerId,
      path,
      message: `Reference ${id} violates the Phase 1 cross-reference contract.`,
    });
  }
}

function collectReferenceErrors(
  pack: ContentPackV1,
  byId: ReadonlyMap<string, ContentDefinitionV1>,
  errors: ContentValidationErrorV1[],
): void {
  for (const definition of pack.definitions) {
    switch (definition.kind) {
      case 'item':
      case 'entity':
      case 'hostile':
      case 'profession':
        break;

      case 'recipe':
        definition.inputs.forEach((spec, index) => {
          requireReference(
            errors,
            byId,
            definition.id,
            `inputs[${index}].itemId`,
            spec.itemId,
            'item',
          );
        });
        definition.outputs.forEach((spec, index) => {
          requireReference(
            errors,
            byId,
            definition.id,
            `outputs[${index}].itemId`,
            spec.itemId,
            'item',
          );
        });
        if (definition.requiredStationStructureId !== null) {
          requireReference(
            errors,
            byId,
            definition.id,
            'requiredStationStructureId',
            definition.requiredStationStructureId,
            'structure',
          );
        }
        break;

      case 'resource':
        if (definition.requiredToolItemId !== null) {
          requireReference(
            errors,
            byId,
            definition.id,
            'requiredToolItemId',
            definition.requiredToolItemId,
            'item',
            (target) =>
              target.kind === 'item'
              && target.capabilities.includes('gather-tool'),
          );
        }
        requireReference(
          errors,
          byId,
          definition.id,
          'output.itemId',
          definition.output.itemId,
          'item',
        );
        break;

      case 'structure':
        if (definition.sourceKitItemId !== null) {
          requireReference(
            errors,
            byId,
            definition.id,
            'sourceKitItemId',
            definition.sourceKitItemId,
            'item',
            (target) =>
              target.kind === 'item'
              && target.category === 'construction-kit',
          );
        }
        if (definition.machineDefinitionId !== undefined) {
          requireReference(
            errors,
            byId,
            definition.id,
            'machineDefinitionId',
            definition.machineDefinitionId,
            'machine',
          );
        }
        break;

      case 'machine':
        definition.inputItems.forEach((spec, index) => {
          requireReference(
            errors,
            byId,
            definition.id,
            `inputItems[${index}].itemId`,
            spec.itemId,
            'item',
          );
        });
        requireReference(
          errors,
          byId,
          definition.id,
          'outputItemId',
          definition.outputItemId,
          'item',
        );
        break;

      case 'hazard':
        definition.mitigationItemIds.forEach((id, index) => {
          requireReference(
            errors,
            byId,
            definition.id,
            `mitigationItemIds[${index}]`,
            id,
            'item',
          );
        });
        break;

      case 'weather':
        definition.hazardIds.forEach((id, index) => {
          requireReference(
            errors,
            byId,
            definition.id,
            `hazardIds[${index}]`,
            id,
            'hazard',
          );
        });
        break;

      case 'ruin':
        requireReference(
          errors,
          byId,
          definition.id,
          'oneTimePhysicalReward.itemId',
          definition.oneTimePhysicalReward.itemId,
          'item',
          (target) =>
            target.kind === 'item'
            && target.category === 'discovery-item',
        );
        break;

      case 'progression':
        definition.milestoneRules.forEach((rule, index) => {
          const path = `milestoneRules[${index}].trigger`;
          const trigger = rule.trigger;

          switch (trigger.type) {
            case 'first-gather':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.resourceId`,
                trigger.resourceId,
                'resource',
              );
              break;
            case 'first-craft':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.recipeId`,
                trigger.recipeId,
                'recipe',
              );
              break;
            case 'first-structure-placement':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.structureId`,
                trigger.structureId,
                'structure',
              );
              break;
            case 'first-machine-output-collect':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.machineId`,
                trigger.machineId,
                'machine',
              );
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.itemId`,
                trigger.itemId,
                'item',
              );
              break;
            case 'first-ruin-locate':
            case 'first-ruin-inspect':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.ruinId`,
                trigger.ruinId,
                'ruin',
              );
              break;
            case 'hostile-resolution':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.hostileId`,
                trigger.hostileId,
                'hostile',
              );
              break;
            case 'first-condition-repair':
            case 'first-expedition-band-entry':
            case 'first-own-death-cache-recovery':
              break;
          }
        });
        break;

      case 'skill':
        break;

      case 'profession-quest':
        requireReference(
          errors,
          byId,
          definition.id,
          'requiredSkillId',
          definition.requiredSkillId,
          'skill',
        );
        requireReference(
          errors,
          byId,
          definition.id,
          'rewardProfessionId',
          definition.rewardProfessionId,
          'profession',
        );
        definition.objectives.forEach((objective, index) => {
          const path = `objectives[${index}]`;
          switch (objective.type) {
            case 'locate-ruin':
            case 'inspect-ruin':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.ruinId`,
                objective.ruinId,
                'ruin',
              );
              break;
            case 'return-alive-to-any-structure':
            case 'structures-present':
              objective.structureIds.forEach((id, refIndex) => {
                requireReference(
                  errors,
                  byId,
                  definition.id,
                  `${path}.structureIds[${refIndex}]`,
                  id,
                  'structure',
                );
              });
              break;
            case 'interact-powered-machine':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.machineId`,
                objective.machineId,
                'machine',
              );
              break;
            case 'collect-machine-output':
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.machineId`,
                objective.machineId,
                'machine',
              );
              requireReference(
                errors,
                byId,
                definition.id,
                `${path}.itemId`,
                objective.itemId,
                'item',
              );
              break;
          }
        });
        break;
    }
  }
}

function collectPhase1SemanticErrors(
  pack: ContentPackV1,
  byId: ReadonlyMap<string, ContentDefinitionV1>,
  errors: ContentValidationErrorV1[],
): void {
  const required = new Set<string>(PHASE1_REQUIRED_CONTENT_IDS);

  for (const id of PHASE1_REQUIRED_CONTENT_IDS) {
    if (!byId.has(id)) {
      errors.push({
        code: 'MISSING_REFERENCE',
        definitionId: id,
        path: 'definitions',
        message: `Phase 1 pack is missing required definition ${id}.`,
      });
    }
  }

  for (const definition of pack.definitions) {
    if (!required.has(definition.id)) {
      errors.push({
        code: 'INVALID_CROSS_REFERENCE',
        definitionId: definition.id,
        path: 'id',
        message: 'Definition is outside the bounded Phase 1 content catalog.',
      });
    }

    if (definition.kind === 'item') {
      if (definition.conditionMax !== null) {
        if (definition.maxStack !== 1 || definition.conditionMax !== 100) {
          errors.push({
            code: 'INVALID_CROSS_REFERENCE',
            definitionId: definition.id,
            path: 'conditionMax',
            message:
              'Phase 1 condition-bearing items must stack to 1 and use condition max 100.',
          });
        }
      }
    }

    if (definition.kind === 'recipe') {
      if (
        definition.tier === 'hand'
        && definition.requiredStationStructureId !== null
      ) {
        errors.push({
          code: 'INVALID_CROSS_REFERENCE',
          definitionId: definition.id,
          path: 'requiredStationStructureId',
          message: 'Hand recipes must not require a station.',
        });
      }
      if (
        definition.tier === 'workbench'
        && definition.requiredStationStructureId !== 'structure:workbench'
      ) {
        errors.push({
          code: 'INVALID_CROSS_REFERENCE',
          definitionId: definition.id,
          path: 'requiredStationStructureId',
          message: 'Workbench recipes must reference structure:workbench.',
        });
      }
    }

    if (definition.kind === 'progression') {
      const thresholds = [...definition.levelThresholds].sort(
        (left, right) => left.level - right.level,
      );
      for (let index = 1; index < thresholds.length; index += 1) {
        const previous = thresholds[index - 1];
        const current = thresholds[index];
        if (
          previous === undefined
          || current === undefined
          || current.level <= previous.level
          || current.totalXpRequired <= previous.totalXpRequired
        ) {
          errors.push({
            code: 'INVALID_CROSS_REFERENCE',
            definitionId: definition.id,
            path: 'levelThresholds',
            message:
              'Progression levels and cumulative XP thresholds must strictly increase.',
          });
          break;
        }
      }
    }
  }

  const kitByStructure = new Map<string, string | null>([
    ['structure:landing-module', null],
    ['structure:storage-crate', 'item:storage-crate-kit'],
    ['structure:workbench', 'item:workbench-kit'],
    ['structure:habitat-room', 'item:habitat-kit'],
    ['structure:compact-power-unit', 'item:power-unit-kit'],
    ['structure:atmospheric-water-condenser', 'item:machine-kit'],
  ]);

  for (const [structureId, expectedKit] of kitByStructure) {
    const definition = byId.get(structureId);
    if (
      definition?.kind === 'structure'
      && definition.sourceKitItemId !== expectedKit
    ) {
      errors.push({
        code: 'INVALID_CROSS_REFERENCE',
        definitionId: structureId,
        path: 'sourceKitItemId',
        message: `Structure must use approved kit ${String(expectedKit)}.`,
      });
    }
  }

  const landing = byId.get('structure:landing-module');
  if (
    landing?.kind === 'structure'
    && (landing.placeableByPlayer || landing.sourceKitItemId !== null)
  ) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: landing.id,
      path: 'placeableByPlayer',
      message: 'Landing Module must be pre-existing and non-placeable.',
    });
  }

  const water = byId.get('resource:potable-water-source');
  if (
    water?.kind === 'resource'
    && (
      water.maxGatherActions !== null
      || water.regenerationActiveSeconds !== null
      || water.output.itemId !== 'item:clean-water'
      || water.output.quantity !== 1
    )
  ) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: water.id,
      path: 'output',
      message:
        'Potable Water Source must be unlimited and yield exactly one Clean Water.',
    });
  }

  const machine = byId.get('machine:atmospheric-water-condenser');
  if (
    machine?.kind === 'machine'
    && (
      machine.powerDemandPu !== 5
      || machine.inputItems.length !== 0
      || machine.outputItemId !== 'item:clean-water'
      || machine.outputQuantityPerCycle !== 1
      || machine.cycleActivePoweredSeconds !== 90
      || machine.outputBufferCapacity !== 4
      || !machine.supportsManualEnable
      || machine.producesWhileAuthorityOffline
      || machine.hasPeriodicWear
    )
  ) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: machine.id,
      path: 'machine',
      message: 'Atmospheric Water Condenser static contract does not match approved design.',
    });
  }

  const weather = byId.get('weather:cold-rain');
  if (
    weather?.kind === 'weather'
    && (
      !weather.hazardIds.includes('hazard:cold-exposure')
      || weather.changesPersistentFogKnowledge
      || weather.directHealthDamage
    )
  ) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: weather.id,
      path: 'hazardIds',
      message: 'Cold Rain must reference Cold Exposure without direct damage or fog erasure.',
    });
  }

  const ruin = byId.get('ruin:previous-civilization-ruin');
  if (
    ruin?.kind === 'ruin'
    && (
      ruin.oneTimePhysicalReward.itemId !== 'item:ancient-alloy-shard'
      || ruin.oneTimePhysicalReward.quantity !== 1
    )
  ) {
    errors.push({
      code: 'INVALID_CROSS_REFERENCE',
      definitionId: ruin.id,
      path: 'oneTimePhysicalReward',
      message: 'Phase 1 ruin reward must be exactly one Ancient Alloy Shard.',
    });
  }

  for (const professionId of [
    'profession:explorer-prototype',
    'profession:engineer-prototype',
  ]) {
    const profession = byId.get(professionId);
    if (
      profession?.kind === 'profession'
      && (
        !profession.prototypeOnly
        || profession.exclusiveLock
        || profession.grantsExclusiveCriticalPathCapability
      )
    ) {
      errors.push({
        code: 'INVALID_CROSS_REFERENCE',
        definitionId: profession.id,
        path: 'exclusiveLock',
        message: 'Phase 1 professions must remain prototype-only and non-exclusive.',
      });
    }
  }
}

export function validateAndCloneContentPackV1(input: unknown): ContentPackV1 {
  const structuralErrors: ContentValidationErrorV1[] = [];

  if (!isJsonCompatible(input)) {
    throw new ContentValidationException([
      {
        code: 'INVALID_FORMAT',
        path: '$',
        message:
          'Content pack must contain only finite JSON-compatible plain data.',
      },
    ]);
  }

  if (!isPlainObject(input)) {
    throw new ContentValidationException([
      {
        code: 'INVALID_FORMAT',
        path: '$',
        message: 'Content pack must be a plain object.',
      },
    ]);
  }

  const rootContext: ValidationContext = { errors: structuralErrors };
  checkKeys(rootContext, input, '$', [
    'formatId',
    'schemaVersion',
    'packId',
    'packVersion',
    'definitions',
  ]);

  if (input.formatId !== CONTENT_FORMAT_ID) {
    addError(
      rootContext,
      'INVALID_FORMAT',
      '$.formatId',
      `Expected formatId ${CONTENT_FORMAT_ID}.`,
    );
  }

  if (input.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    addError(
      rootContext,
      'UNSUPPORTED_SCHEMA_VERSION',
      '$.schemaVersion',
      `Expected schemaVersion ${CONTENT_SCHEMA_VERSION}.`,
    );
  }

  if (input.packId !== PHASE1_CONTENT_PACK_ID) {
    addError(
      rootContext,
      'INVALID_PACK_ID',
      '$.packId',
      `Expected packId ${PHASE1_CONTENT_PACK_ID}.`,
    );
  }

  if (input.packVersion !== PHASE1_CONTENT_PACK_VERSION) {
    addError(
      rootContext,
      'INVALID_PACK_VERSION',
      '$.packVersion',
      `Expected packVersion ${PHASE1_CONTENT_PACK_VERSION}.`,
    );
  }

  if (!Array.isArray(input.definitions)) {
    addError(
      rootContext,
      'INVALID_FORMAT',
      '$.definitions',
      'Definitions must be an array.',
    );
  } else {
    input.definitions.forEach((definition, index) => {
      validateDefinition(structuralErrors, definition, index);
    });
  }

  if (structuralErrors.length > 0) {
    throw new ContentValidationException(structuralErrors);
  }

  const pack = cloneJsonValue(input) as unknown as ContentPackV1;
  const semanticErrors: ContentValidationErrorV1[] = [];
  const byId = collectIdentityErrors(pack, semanticErrors);

  collectReferenceErrors(pack, byId, semanticErrors);
  collectPhase1SemanticErrors(pack, byId, semanticErrors);

  if (semanticErrors.length > 0) {
    throw new ContentValidationException(semanticErrors);
  }

  return pack;
}

export function isConditionBearingItem(
  definition: ContentDefinitionV1,
): definition is ItemDefinitionV1 {
  return definition.kind === 'item' && definition.conditionMax !== null;
}

export function getProgressionDefinition(
  pack: ContentPackV1,
): ProgressionDefinitionV1 {
  const progression = pack.definitions.find(
    (definition) => definition.id === 'progression:phase1-early-progression',
  );
  if (progression?.kind !== 'progression') {
    throw new ContentValidationException([
      {
        code: 'MISSING_REFERENCE',
        definitionId: 'progression:phase1-early-progression',
        path: 'definitions',
        message: 'Phase 1 progression definition is missing.',
      },
    ]);
  }
  return progression;
}
