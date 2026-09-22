export const CONTENT_FORMAT_ID = 'proz0-content-pack' as const;
export const CONTENT_SCHEMA_VERSION = 1 as const;
export const PHASE1_CONTENT_PACK_ID = 'proz0-phase1-vertical-slice' as const;
export const PHASE1_CONTENT_PACK_VERSION = 1 as const;
export const CONTENT_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1' as const;

export type ContentId = string;

export type ContentKindV1 =
  | 'item'
  | 'recipe'
  | 'resource'
  | 'entity'
  | 'structure'
  | 'machine'
  | 'hazard'
  | 'weather'
  | 'hostile'
  | 'ruin'
  | 'progression'
  | 'skill'
  | 'profession'
  | 'profession-quest';

export interface BaseContentDefinitionV1 {
  readonly id: ContentId;
  readonly kind: ContentKindV1;
  readonly displayName: string;
}

export type ItemCategoryV1 =
  | 'raw-resource'
  | 'food'
  | 'water'
  | 'component'
  | 'tool'
  | 'weapon'
  | 'equipment'
  | 'medical'
  | 'construction-kit'
  | 'discovery-item';

export type ItemCapabilityV1 =
  | 'consumable'
  | 'equippable'
  | 'usable'
  | 'gather-tool'
  | 'melee-weapon'
  | 'thermal-equipment'
  | 'construction-kit'
  | 'discovery-reward';

export type ItemUseProfileV1 =
  | {
      readonly type: 'restore-stat';
      readonly stat: 'health' | 'food' | 'water';
      readonly amount: number;
      readonly channelSeconds: number;
    }
  | {
      readonly type: 'melee-weapon';
      readonly rangeFootprints: number;
      readonly frontalArcDegrees: number;
      readonly staminaCost: number;
      readonly damage: number;
      readonly cooldownSeconds: number;
      readonly conditionCostOnSuccessfulHit: number;
    }
  | {
      readonly type: 'thermal-protection';
      readonly harmfulThermalRateMultiplier: number;
    };

export interface ItemDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'item';
  readonly category: ItemCategoryV1;
  readonly unitWeightKg: number;
  readonly unitVolume: number;
  readonly maxStack: number;
  readonly conditionMax: number | null;
  readonly ordinaryStorageAllowed: boolean;
  readonly capabilities: readonly ItemCapabilityV1[];
  readonly useProfile?: ItemUseProfileV1;
}

export interface ItemQuantitySpecV1 {
  readonly itemId: ContentId;
  readonly quantity: number;
  readonly initialCondition?: number;
}

export interface RecipeDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'recipe';
  readonly tier: 'hand' | 'workbench';
  readonly requiredStationStructureId: ContentId | null;
  readonly inputs: readonly ItemQuantitySpecV1[];
  readonly outputs: readonly ItemQuantitySpecV1[];
}

export interface ResourceNodeDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'resource';
  readonly gatherChannelSeconds: number;
  readonly requiredToolItemId: ContentId | null;
  readonly output: ItemQuantitySpecV1;
  readonly maxGatherActions: number | null;
  readonly regenerationActiveSeconds: number | null;
  readonly toolConditionCostPerSuccessfulGather: number;
}

export interface EntityDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'entity';
  readonly role: 'passive-wildlife';
}

export type StructureRoleV1 =
  | 'base-anchor'
  | 'respawn-anchor'
  | 'shared-storage'
  | 'crafting-station'
  | 'shelter'
  | 'power-source'
  | 'machine-host';

export interface StructureDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'structure';
  readonly sourceKitItemId: ContentId | null;
  readonly placeableByPlayer: boolean;
  readonly phase1WorldCap: number;
  readonly roles: readonly StructureRoleV1[];
  readonly container?: {
    readonly maxWeightKg: number;
    readonly maxVolume: number;
    readonly acceptsAllPhase1PortableCategories: true;
    readonly nestedContainersAllowed: false;
  };
  readonly shelter?: {
    readonly thermalTarget: number;
  };
  readonly powerSource?: {
    readonly capacityPu: number;
    readonly radiusFootprints: number;
    readonly alwaysOn: true;
    readonly consumesPortableFuel: false;
  };
  readonly machineDefinitionId?: ContentId;
}

export interface MachineDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'machine';
  readonly powerDemandPu: number;
  readonly inputItems: readonly ItemQuantitySpecV1[];
  readonly outputItemId: ContentId;
  readonly outputQuantityPerCycle: number;
  readonly cycleActivePoweredSeconds: number;
  readonly outputBufferCapacity: number;
  readonly supportsManualEnable: boolean;
  readonly producesWhileAuthorityOffline: false;
  readonly hasPeriodicWear: false;
}

export interface HazardDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'hazard';
  readonly hazardType: 'cold-exposure';
  readonly mitigationItemIds: readonly ContentId[];
  readonly directHealthDamage: false;
}

export interface WeatherDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'weather';
  readonly hazardIds: readonly ContentId[];
  readonly firstSessionStartWindowActiveMinutes: readonly [number, number];
  readonly durationActiveSeconds: number;
  readonly warningSeconds: number;
  readonly dayThermalTarget: number;
  readonly nightThermalTarget: number;
  readonly changesPersistentFogKnowledge: false;
  readonly directHealthDamage: false;
}

export interface HostileDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'hostile';
  readonly maxHealth: number;
  readonly aggressionRadiusFootprints: number;
  readonly alertSeconds: number;
  readonly leashRadiusFootprints: number;
  readonly disengageOutsideSeconds: number;
  readonly attack: {
    readonly rangeFootprints: number;
    readonly windupSeconds: number;
    readonly damage: number;
    readonly recoverySeconds: number;
  };
  readonly targetPolicy: 'nearest-valid-threatening-player';
  readonly requiredUniqueDropItemId: null;
}

export interface RuinDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'ruin';
  readonly locateRadiusFootprints: number;
  readonly interaction: 'inspect';
  readonly investigationIsImmediate: true;
  readonly discoverySharedWithTeam: true;
  readonly oneTimePhysicalReward: {
    readonly itemId: ContentId;
    readonly quantity: number;
  };
  readonly rewardRemainsClaimableIfInventoryFull: true;
}

export interface LevelThresholdV1 {
  readonly level: number;
  readonly totalXpRequired: number;
}

export type ProgressionTriggerV1 =
  | { readonly type: 'first-gather'; readonly resourceId: ContentId }
  | { readonly type: 'first-craft'; readonly recipeId: ContentId }
  | { readonly type: 'first-condition-repair' }
  | {
      readonly type: 'first-structure-placement';
      readonly structureId: ContentId;
    }
  | {
      readonly type: 'first-machine-output-collect';
      readonly machineId: ContentId;
      readonly itemId: ContentId;
    }
  | { readonly type: 'first-expedition-band-entry' }
  | { readonly type: 'first-ruin-locate'; readonly ruinId: ContentId }
  | { readonly type: 'first-ruin-inspect'; readonly ruinId: ContentId }
  | { readonly type: 'hostile-resolution'; readonly hostileId: ContentId }
  | { readonly type: 'first-own-death-cache-recovery' };

export interface MilestoneXpRuleV1 {
  readonly id: string;
  readonly trigger: ProgressionTriggerV1;
  readonly xp: number;
  readonly lifetimeScope: 'per-player-world';
}

export interface RepeatXpRuleV1 {
  readonly id: string;
  readonly triggerType: 'gather' | 'craft' | 'repair';
  readonly xpPerRewardedAction: number;
  readonly maxRewardedActions: number;
  readonly lifetimeScope: 'per-player-world';
}

export interface ProgressionDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'progression';
  readonly levelThresholds: readonly LevelThresholdV1[];
  readonly milestoneRules: readonly MilestoneXpRuleV1[];
  readonly repeatRules: readonly RepeatXpRuleV1[];
  readonly deathXpLoss: {
    readonly percentCurrentLevelProgress: 5;
    readonly minimumLossWhenProgressPositive: 1;
    readonly mayReduceLevel: false;
  };
}

export type SkillRequirementV1 =
  | { readonly type: 'minimum-level'; readonly level: number }
  | { readonly type: 'first-expedition-band-entry' }
  | { readonly type: 'first-workbench-condition-repair' };

export interface SkillDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'skill';
  readonly requirements: readonly SkillRequirementV1[];
  readonly grantsPhase1StatModifier: false;
}

export interface ProfessionDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'profession';
  readonly prototypeOnly: true;
  readonly exclusiveLock: false;
  readonly grantsExclusiveCriticalPathCapability: false;
}

export type ProfessionQuestObjectiveV1 =
  | { readonly type: 'locate-ruin'; readonly ruinId: ContentId }
  | { readonly type: 'inspect-ruin'; readonly ruinId: ContentId }
  | {
      readonly type: 'return-alive-to-any-structure';
      readonly structureIds: readonly ContentId[];
    }
  | {
      readonly type: 'structures-present';
      readonly structureIds: readonly ContentId[];
    }
  | {
      readonly type: 'interact-powered-machine';
      readonly machineId: ContentId;
    }
  | {
      readonly type: 'collect-machine-output';
      readonly machineId: ContentId;
      readonly itemId: ContentId;
      readonly quantity: number;
    };

export interface ProfessionQuestDefinitionV1
  extends BaseContentDefinitionV1 {
  readonly kind: 'profession-quest';
  readonly minimumLevel: number;
  readonly requiredSkillId: ContentId;
  readonly objectives: readonly ProfessionQuestObjectiveV1[];
  readonly rewardProfessionId: ContentId;
  readonly rewardXp: number;
}

export type ContentDefinitionV1 =
  | ItemDefinitionV1
  | RecipeDefinitionV1
  | ResourceNodeDefinitionV1
  | EntityDefinitionV1
  | StructureDefinitionV1
  | MachineDefinitionV1
  | HazardDefinitionV1
  | WeatherDefinitionV1
  | HostileDefinitionV1
  | RuinDefinitionV1
  | ProgressionDefinitionV1
  | SkillDefinitionV1
  | ProfessionDefinitionV1
  | ProfessionQuestDefinitionV1;

export type DefinitionForKind<K extends ContentKindV1> = Extract<
  ContentDefinitionV1,
  { readonly kind: K }
>;

export interface ContentPackV1 {
  readonly formatId: typeof CONTENT_FORMAT_ID;
  readonly schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  readonly packId: string;
  readonly packVersion: number;
  readonly definitions: readonly ContentDefinitionV1[];
}

export interface ContentCompatibilityIdentityV1 {
  readonly formatId: typeof CONTENT_FORMAT_ID;
  readonly schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  readonly packId: string;
  readonly packVersion: number;
  readonly canonicalFingerprint: string;
}

export interface ContentCatalogV1 {
  readonly compatibility: ContentCompatibilityIdentityV1;
  readonly size: number;

  has(id: ContentId): boolean;
  get(id: ContentId): Readonly<ContentDefinitionV1>;

  getAs<K extends ContentKindV1>(
    id: ContentId,
    kind: K,
  ): Readonly<DefinitionForKind<K>>;

  list<K extends ContentKindV1>(
    kind: K,
  ): readonly Readonly<DefinitionForKind<K>>[];
}
