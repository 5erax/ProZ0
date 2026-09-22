# ADR-P1-TECH-002 — Phase 1 Data-Driven Content Schema and Registry

**Task:** P1-TECH-002 / Issue #38  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-002..006 / #32..#36  
**Implementation authorization:** NONE — this ADR defines contracts only.

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- Phase 1 content must be data-driven, validated, immutable after startup, and distinct from mutable runtime state.
- The approved Phase 1 slice has a finite item, recipe, resource-node, structure, machine, hazard/weather, hostile, ruin, and progression/profession content set.
- Phase 0 already defines `content` as a lower-level read-only module that may depend only on `foundation`.
- Runtime saves, world state, inventory state, fog state, machine state, player progression state, and network/session state are not content definitions.
- Stable content identities must survive save/load and hosted-co-op boundaries.
- Authoritative world/simulation code must not depend on renderer objects or presentation asset identity.
- Deterministic authoritative output must not depend on content source-file order.
- The approved Phase 1 Game Design sources contain all gameplay values required by this ADR; this ADR must not rebalance them.

## CONSTRAINT

- Do not redesign approved gameplay values from P1-DES-002..006.
- Do not introduce Phase 2+ catalog categories merely because they may exist later.
- Do not put Pixi/texture/sprite/animation/camera/UI state into canonical domain content definitions.
- Do not make content registry mutable during an active authoritative session.
- Do not authorize implementation from this ADR.
- P1-TECH-003..009 own authority algorithms, runtime aggregate state, networking, save V2, and performance gates.

## DECISION NEEDED

None.

---

# ADR

## ADR ID

ADR-P1-TECH-002

## CONTEXT

Phase 0 intentionally kept the content module minimal:

`ContentId = string` plus a duplicate-safe read-only `ContentRegistry`.

Phase 1 now needs enough content structure to support:

- exact item weights/volumes/stacks/condition capability;
- recipes and station requirements;
- deterministic resource-node gather definitions;
- the finite structure set;
- Compact Power Unit and Atmospheric Water Condenser static configuration;
- cold hazard/weather content;
- Territorial Predator static tuning;
- previous-civilization ruin content/reward references;
- XP/level/skill/profession prototype definitions.

Without one validated content contract, downstream systems would risk:
- hard-coding the same values in multiple modules;
- using display/render identity as gameplay identity;
- accepting missing or wrong-kind references;
- changing authoritative content without save/network compatibility visibility;
- producing different canonical content depending on load order;
- persisting entire mutable content objects instead of stable IDs.

The content architecture therefore needs one small, strict compatibility unit for the Phase 1 vertical slice.

---

# DECISION

Use one **versioned Phase 1 Content Pack** containing a closed discriminated union of immutable JSON-compatible definitions keyed by globally unique stable `ContentId` values.

The validated pack is finalized into one read-only `ContentCatalog`.

Canonical runtime/world/save state stores:
- stable `ContentId` references;
- mutable runtime fields owned by simulation/world;

and does **not** embed live mutable copies of content definitions.

---

# 1. CONTENT PACK IDENTITY

Phase 1 defines:

```ts
export const CONTENT_FORMAT_ID = 'proz0-content-pack' as const;
export const CONTENT_SCHEMA_VERSION = 1 as const;
export const PHASE1_CONTENT_PACK_ID = 'proz0-phase1-vertical-slice' as const;
export const PHASE1_CONTENT_PACK_VERSION = 1 as const;
```

Conceptual envelope:

```ts
interface ContentPackV1 {
  readonly formatId: 'proz0-content-pack';
  readonly schemaVersion: 1;
  readonly packId: 'proz0-phase1-vertical-slice';
  readonly packVersion: 1;
  readonly definitions: readonly ContentDefinitionV1[];
}
```

### Meaning of versions

- `schemaVersion` = shape/meaning of the technical content schema.
- `packVersion` = compatibility revision of the approved Phase 1 content pack.
- save-schema version remains separate.
- network-protocol version remains separate.
- world-generation version remains separate.
- RNG/seed-derivation versions remain separate.

Any intentional authoritative content change after a pack has become a compatibility dependency requires:
1. packVersion change;
2. explicit save/network/content-compatibility decision;
3. updated exact-content/golden evidence.

Changing content values without changing pack compatibility identity is not allowed.

---

# 2. CANONICAL CONTENT COMPATIBILITY IDENTITY

For save/rejoin/host-client compatibility, a validated pack exposes:

```ts
interface ContentCompatibilityIdentityV1 {
  readonly formatId: 'proz0-content-pack';
  readonly schemaVersion: 1;
  readonly packId: string;
  readonly packVersion: number;
  readonly canonicalFingerprint: string;
}
```

The fingerprint contract is:

- algorithm identity: `sha256-canonical-json-v1`;
- input encoding: UTF-8;
- input data: canonicalized content-pack payload excluding the fingerprint itself;
- definitions ordered by stable `id`;
- object keys serialized canonically;
- set-like reference collections ordered by stable ID;
- semantically ordered collections, such as profession quest objectives, preserve approved order.

Fingerprint computation is a **validation/build/host concern outside authoritative fixed-tick execution**.

The content domain contract only consumes/exposes the final string identity.

Reason:
- a packVersion expresses intended compatibility;
- fingerprint detects accidental drift between two builds that claim the same version.

P1-TECH-007 must use this identity during hosted compatibility handshake.
P1-TECH-008 must persist/validate it according to its migration policy.

---

# 3. STABLE CONTENT ID CONTRACT

All definitions share one global ContentId namespace with a required kind prefix.

Syntax:

```text
<kind>:<slug>
```

Allowed characters:
- lowercase ASCII `a-z`;
- digits;
- internal hyphen.

Conceptual validation:

```text
^[a-z][a-z0-9-]*:[a-z0-9]+(?:-[a-z0-9]+)*$
```

Examples:

- `item:clean-water`
- `recipe:basic-spear`
- `resource:metal-ore-node`
- `structure:compact-power-unit`
- `machine:atmospheric-water-condenser`
- `weather:cold-rain`
- `hostile:territorial-predator`
- `ruin:previous-civilization-ruin`
- `skill:fieldcraft-basics`
- `profession:explorer-prototype`
- `profession-quest:chart-the-unknown`

Rules:

1. IDs are globally unique across all kinds.
2. ID prefix must match the definition `kind`.
3. IDs are immutable once persisted/network-referenced.
4. Display names may change with an approved pack update; IDs do not silently rename.
5. A rename of a persisted ID requires explicit migration/remapping under P1-TECH-008.
6. IDs are domain identity, never texture/sprite/file-path identity.

---

# 4. COMMON DEFINITION CONTRACT

Every definition has:

```ts
interface BaseContentDefinitionV1 {
  readonly id: ContentId;
  readonly kind: ContentKindV1;
  readonly displayName: string;
}
```

`displayName` is player-facing semantic text for the Phase 1 English content set.

It is not:
- a Pixi Text object;
- a texture path;
- a localization engine contract;
- an authoritative mutable field.

A future localization migration may replace/augment displayName without changing runtime ownership.

All validated definitions are:
- JSON-compatible;
- deeply immutable;
- finite-number only;
- free of `undefined`, functions, classes, Maps, Sets, DOM/Pixi objects, cyclic references, NaN and Infinity.

---

# 5. CLOSED PHASE 1 DEFINITION KINDS

Phase 1 schema supports only the kinds required by the accepted slice:

```ts
type ContentKindV1 =
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
```

Not included in V1:
- full biome definitions;
- factions;
- NPC jobs;
- dialogue trees;
- full research trees;
- vehicles;
- automation/conveyors;
- production quest framework;
- PvP rules;
- account/store/season content.

A later phase must extend the schema explicitly rather than hiding unrelated data in generic property bags.

---

# 6. ITEM DEFINITION

Conceptual contract:

```ts
type ItemCategoryV1 =
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

interface ItemDefinitionV1 extends BaseContentDefinitionV1 {
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
```

The approved design describes FOOD / WATER as one player-facing category group while its content table distinguishes Food and Water.

Technical representation uses separate `food` and `water` semantic values so the approved Food/Water effects remain type-safe; UI may present them under the same player-facing FOOD / WATER grouping.

### ItemCapabilityV1

Closed Phase 1 semantic tags:

- `consumable`
- `equippable`
- `usable`
- `gather-tool`
- `melee-weapon`
- `thermal-equipment`
- `construction-kit`
- `discovery-reward`

Capabilities do not grant authority by themselves; subsystem logic validates runtime state.

### ItemUseProfileV1

Only approved item-specific static effects are represented.

Conceptual union:

```ts
type ItemUseProfileV1 =
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
```

Runtime values NOT stored in ItemDefinition:
- quantity;
- current condition;
- equipped owner;
- container;
- world position;
- stack instance ID;
- reservation/lock;
- death-drop membership.

Those belong to P1-TECH-003/P1-TECH-005 runtime authority.

### Required Phase 1 item IDs

The Phase 1 pack must contain the accepted finite set:

- `item:plant-fiber`
- `item:timber`
- `item:stone`
- `item:metal-ore`
- `item:edible-plant`
- `item:clean-water`
- `item:cordage`
- `item:stone-field-tool`
- `item:basic-spear`
- `item:thermal-wrap`
- `item:field-dressing`
- `item:repair-patch`
- `item:storage-crate-kit`
- `item:workbench-kit`
- `item:habitat-kit`
- `item:power-unit-kit`
- `item:machine-kit`
- `item:ancient-alloy-shard`

Exact approved weights/volumes/stacks/condition maxima from P1-DES-002 are pack data and must be covered by golden/content tests.

---

# 7. RECIPE DEFINITION

Conceptual:

```ts
interface ItemQuantitySpecV1 {
  readonly itemId: ContentId;
  readonly quantity: number;
  readonly initialCondition?: number;
}

interface RecipeDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'recipe';
  readonly tier: 'hand' | 'workbench';
  readonly requiredStationStructureId: ContentId | null;
  readonly inputs: readonly ItemQuantitySpecV1[];
  readonly outputs: readonly ItemQuantitySpecV1[];
}
```

Rules:

- quantities are positive safe integers;
- input/output IDs must reference `item` definitions;
- no duplicate item ID appears twice in the same input or output list;
- workbench recipes must reference `structure:workbench`;
- hand recipes have null station;
- condition-bearing crafted output may specify its approved initial condition;
- recipe definition stores no current craft progress, actor, inventory reservation or transaction revision.

Required recipe IDs:

- `recipe:cordage`
- `recipe:stone-field-tool`
- `recipe:basic-spear`
- `recipe:thermal-wrap`
- `recipe:field-dressing`
- `recipe:storage-crate-kit`
- `recipe:workbench-kit`
- `recipe:repair-patch`
- `recipe:habitat-kit`
- `recipe:power-unit-kit`
- `recipe:machine-kit`

The exact 11 approved input/output sets from P1-DES-002 are content-pack golden data.

Clean Water, Edible Plant and Ancient Alloy Shard have no recipe definitions.

---

# 8. RESOURCE NODE DEFINITION

Conceptual:

```ts
interface ResourceNodeDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'resource';
  readonly gatherChannelSeconds: number;
  readonly requiredToolItemId: ContentId | null;
  readonly output: ItemQuantitySpecV1;
  readonly maxGatherActions: number | null;
  readonly regenerationActiveSeconds: number | null;
  readonly toolConditionCostPerSuccessfulGather: number;
}
```

Meaning:

- null `maxGatherActions` = unlimited interaction source;
- regeneration time is **active canonical world time**, not offline wall clock;
- fixed output replaces random critical-slice yield rolls;
- current remaining actions, depleted state and regeneration progress are runtime world state.

Required resource IDs:

- `resource:fiber-plant`
- `resource:food-plant`
- `resource:potable-water-source`
- `resource:timber-source`
- `resource:stone-outcrop`
- `resource:metal-ore-node`

Exact source data from P1-DES-002 must validate:
- output item;
- quantity;
- tool requirement;
- gather duration;
- action count;
- regeneration duration;
- condition cost.

Resource placement density and world coordinates are NOT content-registry runtime instances; P1-TECH-004 owns deterministic placement/runtime entity state.

---

# 9. GENERIC ENTITY DEFINITION

The Phase 1 world also requires passive/neutral wildlife presence whose exact species/lore identity is not defined by the current Game Design source.

Schema therefore permits a minimal entity definition without inventing a species:

```ts
interface EntityDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'entity';
  readonly role: 'passive-wildlife';
}
```

Rules:

- this kind is only for the accepted passive/neutral wildlife role in Phase 1;
- implementation may use a functional placeholder identity until Art/Product supplies final species naming;
- it has no combat/drop/progression semantics unless a later approved source extends them;
- live position/state remains world runtime state.

This prevents Engineering from inventing unsupported ecology content.

---

# 10. STRUCTURE DEFINITION

Conceptual:

```ts
type StructureRoleV1 =
  | 'base-anchor'
  | 'respawn-anchor'
  | 'shared-storage'
  | 'crafting-station'
  | 'shelter'
  | 'power-source'
  | 'machine-host';

interface StructureDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required structure IDs:

- `structure:landing-module`
- `structure:storage-crate`
- `structure:workbench`
- `structure:habitat-room`
- `structure:compact-power-unit`
- `structure:atmospheric-water-condenser`

Approved finite caps are content-pack static data:
- Landing Module 1 pre-existing;
- Habitat Room 1;
- Workbench 1;
- Compact Power Unit 1;
- Atmospheric Water Condenser 1;
- Storage Crate 4.

Cross-reference rules:
- player-placeable structures must reference the correct construction-kit item;
- Landing Module has null source kit and is not player-placeable;
- Storage Crate uses the approved 100 kg / 120 u shared-storage capacity;
- Habitat Room's shelter profile uses thermal target 50;
- Compact Power Unit uses the approved 10 PU capacity and 8-footprint radius;
- Condenser structure references `machine:atmospheric-water-condenser`.

Current placement, orientation, connector graph, ownership, revision and power allocation state are runtime world state, not content.

---

# 11. MACHINE DEFINITION

Conceptual:

```ts
interface MachineDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required machine definition:

`machine:atmospheric-water-condenser`

Golden content requirements:

- power demand = 5 PU;
- no portable item input;
- output = `item:clean-water`;
- output per cycle = 1;
- cycle = 90 seconds active powered time;
- buffer = 4;
- supports enabled/disabled state;
- offline production = false;
- periodic machine wear = false.

Runtime fields NOT content:
- enabled;
- current power allocation;
- current state DISABLED/UNPOWERED/RUNNING/OUTPUT FULL;
- partial cycle progress;
- current output quantity;
- world placement;
- structure revision.

P1-TECH-006 owns those authoritative state transitions.

---

# 12. HAZARD DEFINITION

Conceptual:

```ts
interface HazardDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'hazard';
  readonly hazardType: 'cold-exposure';
  readonly mitigationItemIds: readonly ContentId[];
  readonly directHealthDamage: false;
}
```

Required:

`hazard:cold-exposure`

Static relationships:

- mitigation item includes `item:thermal-wrap`;
- Cold Rain may reference this hazard;
- direct arbitrary weather health damage is false.

Exact player thermal state, thresholds, fixed-step drift, stamina modifiers and damage cadence remain P1-TECH-005 authority semantics derived from P1-DES-003.

The content definition identifies the hazard/content relationship; it does not own current temperature.

---

# 13. WEATHER DEFINITION

Conceptual:

```ts
interface WeatherDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required:

`weather:cold-rain`

Approved pack values:
- first-session onset window: 28–38 active world minutes;
- duration: 360 active seconds;
- warning: 60 seconds;
- day thermal target: 30;
- night thermal target: 20;
- persistent explored map knowledge unchanged;
- direct health damage false;
- references `hazard:cold-exposure`.

The exact deterministic event scheduling/substream/tick representation belongs to P1-TECH-004/P1-TECH-005.

Current weather event state is world runtime state, not content.

---

# 14. HOSTILE DEFINITION

Conceptual:

```ts
interface HostileDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required:

`hostile:territorial-predator`

Approved values:
- max Health 75;
- aggression radius 5 footprint widths;
- ALERT cue 0.4 s;
- leash radius 12 footprint widths;
- outside-leash disengage 2.0 s;
- attack range 1.1 footprint widths;
- attack windup 0.55 s;
- damage 20;
- recovery/cooldown 1.20 s;
- no unique progression-required drop.

Runtime hostile fields NOT content:
- current Health;
- current AI state;
- current target;
- position;
- encounter anchor;
- cooldown/windup progress;
- dead/alive runtime entity state.

P1-TECH-005 owns deterministic state-machine/tie-break/authority behavior.

---

# 15. RUIN DEFINITION

Conceptual:

```ts
interface RuinDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required:

`ruin:previous-civilization-ruin`

Approved values:
- locate radius = 6 footprint widths;
- Inspect is immediate;
- investigated/discovered knowledge is shared/persistent;
- exactly one physical `item:ancient-alloy-shard` reward;
- full inventory leaves the reward claimable at the ruin;
- discovery knowledge and physical item state are separate.

Runtime fields NOT content:
- UNKNOWN/LOCATED/INVESTIGATED current world state;
- reward already claimed flag;
- current world position;
- fog state;
- per-player personal XP acknowledgement.

P1-TECH-004 owns runtime/persistence/revision behavior.

---

# 16. PROGRESSION DEFINITION

Phase 1 progression is bounded and may be represented as one static progression definition plus separate skill/profession/quest definitions.

Conceptual:

```ts
interface LevelThresholdV1 {
  readonly level: number;
  readonly totalXpRequired: number;
}

type ProgressionTriggerV1 =
  | { readonly type: 'first-gather'; readonly resourceId: ContentId }
  | { readonly type: 'first-craft'; readonly recipeId: ContentId }
  | { readonly type: 'first-condition-repair' }
  | { readonly type: 'first-structure-placement'; readonly structureId: ContentId }
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

interface MilestoneXpRuleV1 {
  readonly id: string;
  readonly trigger: ProgressionTriggerV1;
  readonly xp: number;
  readonly lifetimeScope: 'per-player-world';
}

interface RepeatXpRuleV1 {
  readonly id: string;
  readonly triggerType: 'gather' | 'craft' | 'repair';
  readonly xpPerRewardedAction: number;
  readonly maxRewardedActions: number;
  readonly lifetimeScope: 'per-player-world';
}

interface ProgressionDefinitionV1 extends BaseContentDefinitionV1 {
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
```

Required ID:

`progression:phase1-early-progression`

Golden requirements include:
- thresholds 0 / 100 / 225 / 400 / 650 for Levels 1..5;
- approved first-gather rewards;
- 8 XP first unique craft rules for all 11 recipes;
- first repair 12 XP;
- first structure placement rewards;
- first Condenser-water collection 20 XP;
- Expedition Band 20 XP;
- ruin locate 30 XP;
- personal ruin inspect 100 XP;
- Territorial Predator retreat/kill milestone policy from P1-DES-006;
- first own Death Cache recovery 15 XP;
- repeat gather 2 × 20;
- repeat craft 2 × 5;
- repeat repair 4 × 3;
- death loss formula 5% current-level progress, level floor protected.

The exact runtime event envelope and idempotency belong to P1-TECH-003/P1-TECH-005 and hosted ordering to P1-TECH-007.

Current XP, counters and milestone completion flags are runtime player state, not content.

---

# 17. SKILL DEFINITION

Conceptual:

```ts
type SkillRequirementV1 =
  | { readonly type: 'minimum-level'; readonly level: number }
  | { readonly type: 'first-expedition-band-entry' }
  | { readonly type: 'first-workbench-condition-repair' };

interface SkillDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'skill';
  readonly requirements: readonly SkillRequirementV1[];
  readonly grantsPhase1StatModifier: false;
}
```

Required:

- `skill:fieldcraft-basics`
- `skill:maintenance-basics`

Approved:
- Fieldcraft Basics = Level >= 2 + personal Expedition Band entry;
- Maintenance Basics = Level >= 2 + successful Workbench repair that increases condition;
- neither grants a Phase 1 stat modifier.

Current unlocked state is personal runtime state.

---

# 18. PROFESSION DEFINITION

Conceptual:

```ts
interface ProfessionDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'profession';
  readonly prototypeOnly: true;
  readonly exclusiveLock: false;
  readonly grantsExclusiveCriticalPathCapability: false;
}
```

Required:

- `profession:explorer-prototype`
- `profession:engineer-prototype`

No profession-only movement, fog, survival, recipe, machine, building, weapon or critical-path privilege is defined in Phase 1.

Current unlock state is personal runtime state.

---

# 19. PROFESSION QUEST DEFINITION

Conceptual:

```ts
type ProfessionQuestObjectiveV1 =
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

interface ProfessionQuestDefinitionV1 extends BaseContentDefinitionV1 {
  readonly kind: 'profession-quest';
  readonly minimumLevel: number;
  readonly requiredSkillId: ContentId;
  readonly objectives: readonly ProfessionQuestObjectiveV1[];
  readonly rewardProfessionId: ContentId;
  readonly rewardXp: number;
}
```

Required:

### `profession-quest:chart-the-unknown`

- min level 3;
- skill = Fieldcraft Basics;
- ordered objectives:
  1. locate Previous-Civilization Ruin;
  2. inspect it;
  3. return alive to Landing Module or Habitat Room;
- reward = Explorer Prototype;
- reward XP = 40.

### `profession-quest:bring-water-online`

- min level 3;
- skill = Maintenance Basics;
- objectives:
  1. Compact Power Unit + Atmospheric Water Condenser exist in shared foothold;
  2. player enables/interacts with powered Condenser;
  3. player collects >=1 Clean Water produced by that Condenser;
- reward = Engineer Prototype;
- reward XP = 40.

Current quest progress/completed objectives are personal runtime state and are persisted separately.

---

# 20. CROSS-REFERENCE VALIDATION

Content validation is multi-stage.

## Stage A — structural validation

Reject:
- non-object definition;
- wrong format/schema;
- malformed ID;
- kind/prefix mismatch;
- empty display name;
- unknown fields for the selected schema;
- NaN/Infinity;
- invalid enum;
- negative/zero values where prohibited;
- non-integer quantity/stack/count fields;
- invalid tuple lengths/ranges.

## Stage B — global identity validation

Reject:
- duplicate ContentId anywhere in the pack;
- duplicate stable rule IDs inside one progression definition where those IDs are persisted/tested;
- duplicate recipe input/output item entries.

## Stage C — reference existence and kind validation

Examples:

- recipe item refs -> item;
- recipe station -> structure;
- resource tool/output -> item;
- structure source kit -> item of category construction-kit;
- structure machine ref -> machine;
- machine output -> item;
- hazard mitigation refs -> item;
- weather hazard refs -> hazard;
- ruin reward -> item of discovery-item category for the approved Phase 1 ruin;
- progression gather trigger -> resource;
- progression craft trigger -> recipe;
- progression structure trigger -> structure;
- progression machine trigger -> machine/item;
- progression ruin trigger -> ruin;
- progression hostile trigger -> hostile;
- profession quest requiredSkill -> skill;
- profession quest reward -> profession;
- profession quest structure/machine/item/ruin refs -> matching kinds.

Missing and wrong-kind references are fatal validation errors.

## Stage D — semantic Phase 1 invariants

Validator/test suite must enforce at least:

- condition-bearing items have maxStack = 1 in Phase 1;
- conditionMax is null for non-condition items;
- approved condition-bearing items use max 100;
- construction structures consume the exact approved kit type;
- Landing Module is pre-existing/non-placeable;
- workbench Tier 1 recipes reference Workbench;
- resource outputs match approved source items;
- Potable Water Source is unlimited and produces Clean Water;
- Condenser outputs Clean Water and has no portable input;
- Condenser power/cycle/buffer/offline settings match approved design;
- Cold Rain references cold exposure and does not erase map knowledge/directly damage Health;
- ruin reward is exactly one Ancient Alloy Shard;
- profession definitions are non-exclusive;
- profession quest references are coherent with approved skill/structure/machine/ruin definitions;
- progression thresholds are strictly increasing by level and cumulative XP;
- all content referenced by accepted Phase 1 critical path exists.

---

# 21. REGISTRY FINALIZATION AND IMMUTABILITY

Validation flow:

```text
raw ContentPack
  -> parse / JSON-compatibility validation
  -> structural validation
  -> global ID validation
  -> cross-reference validation
  -> semantic validation
  -> canonicalize
  -> compatibility fingerprint
  -> deep immutable ContentCatalog
```

No authoritative world/simulation runtime may start from an unvalidated catalog.

After finalization:
- no register();
- no unregister();
- no mutation;
- no hot-reload into an active authority session.

Development content hot reload is deferred.

Conceptual public API:

```ts
interface ContentCatalogV1 {
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
```

Rules:
- `getAs` fails explicitly for missing/wrong-kind IDs;
- `list(kind)` returns canonical ID-sorted order;
- returned definitions/arrays are immutable;
- no mutable Map is exposed.

The existing Phase 0 `ContentRegistry` may be replaced/extended by this validated catalog under P1-ENG-001.

---

# 22. LOAD-ORDER INDEPENDENCE

Authoring/source order is never authoritative.

Two packs containing the same valid definitions and same semantically unordered collections in different source order must produce:
- the same canonical definition order;
- the same canonical fingerprint;
- the same lookup behavior;
- the same deterministic downstream content identity.

Rules:

- top-level definitions canonicalize by ContentId;
- recipe inputs/outputs canonicalize by itemId;
- unordered content-reference sets canonicalize by ContentId;
- level thresholds canonicalize by level;
- progression milestone/repeat rules canonicalize by their stable rule ID;
- quest objectives preserve approved order because order is gameplay semantics.

World generation must never consume “Nth loaded definition”.
It must reference stable ContentId or explicitly canonical ID-sorted lists.

---

# 23. CONTENT VERSUS RUNTIME STATE BOUNDARY

Content pack contains **definitions/configuration**.

It never contains live mutable state.

Examples that MUST remain outside content:

### item/runtime
- current quantity;
- current condition;
- instance/stack ID;
- owner;
- container membership;
- world drop position.

### resource/runtime
- current actions remaining;
- depleted flag;
- regeneration progress;
- world position/entity revision.

### hostile/runtime
- current Health;
- current AI state/target;
- position;
- windup/cooldown progress;
- death state.

### ruin/runtime
- UNKNOWN/LOCATED/INVESTIGATED current state;
- reward claimed flag;
- world position;
- personal inspection milestones.

### structure/machine runtime
- placed position;
- orientation;
- connectivity;
- machine enabled state;
- allocated power;
- partial production timer;
- output contents;
- current revision.

### progression runtime
- player XP;
- level;
- milestone flags;
- repeat counters;
- skills unlocked;
- quest progress;
- profession unlocks.

### weather/runtime
- current event instance;
- event start tick/end tick;
- current weather;
- forecast state.

Those are owned by P1-TECH-003..006 and persisted under P1-TECH-008.

---

# 24. RENDERER / ART BOUNDARY

Domain ContentId is not an asset key.

No domain definition may contain:
- Pixi Texture/Sprite/Container;
- renderer handles;
- canvas coordinates;
- animation runtime objects;
- camera values;
- pixel collider presentation bounds;
- UI panel state.

P1-ART-002 / P1-UI-001 may define a separate presentation mapping:

```text
ContentId -> client-only visual/UI asset definition
```

That mapping may include:
- sprite/atlas keys;
- animation names;
- icon keys;
- UI grouping;
- presentation sizes/layers.

Presentation mapping cannot change gameplay meaning.

A missing visual mapping may fail client presentation validation, but it does not become domain authority.

---

# 25. FAILURE SEMANTICS

Conceptual validation result:

```ts
type ContentValidationFailureCodeV1 =
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'INVALID_PACK_ID'
  | 'INVALID_PACK_VERSION'
  | 'INVALID_DEFINITION'
  | 'INVALID_CONTENT_ID'
  | 'ID_KIND_MISMATCH'
  | 'DUPLICATE_ID'
  | 'INVALID_VALUE'
  | 'MISSING_REFERENCE'
  | 'WRONG_REFERENCE_KIND'
  | 'INVALID_CROSS_REFERENCE'
  | 'CONTENT_COMPATIBILITY_MISMATCH';
```

Failures are startup/pack-activation failures.

Required behavior:
- no silent default definition;
- no unknown-ID fallback to another item/entity;
- no “best effort” deletion of invalid references;
- no partial catalog publication;
- no mutation of input data to make it pass;
- preserve deterministic error ordering for tests.

Recommended validator output:

```ts
interface ContentValidationErrorV1 {
  readonly code: ContentValidationFailureCodeV1;
  readonly definitionId?: string;
  readonly path?: string;
  readonly message: string;
}
```

If multiple errors are collected, canonical sort:
1. definitionId;
2. path;
3. code.

---

# 26. SAVE / PERSISTENCE COMPATIBILITY CONTRACT

P1-TECH-008 must treat content identity as save compatibility metadata.

Save V2 should persist/identify at least:

- content schema version;
- content pack ID;
- content pack version;
- canonical content fingerprint.

Persisted runtime records reference stable ContentId rather than copying full definitions.

On load:

1. validate save schema;
2. identify saved content compatibility;
3. compare against available approved content pack/migration policy;
4. migrate/remap explicitly if authorized;
5. validate every persisted ContentId reference;
6. construct unpublished authoritative state;
7. publish only after cross-record/content references are coherent.

No behavior is allowed where:
- unknown saved item becomes another item;
- removed structure definition silently deletes structure;
- changed machine definition silently reinterprets persisted progress;
- ruin/progression IDs silently reset.

Exact migration policy is P1-TECH-008.

---

# 27. HOSTED CO-OP COMPATIBILITY CONTRACT

P1-TECH-007 must include the same content compatibility identity in session handshake.

Phase 1 default:
- host and joining client must match exact approved content compatibility identity.

A client with:
- wrong schemaVersion;
- wrong packId;
- wrong packVersion;
- wrong canonical fingerprint;

cannot enter the authoritative gameplay session as compatible.

Remote client content does not grant authority; host/server uses its own validated catalog.

This protects:
- item/recipe meaning;
- structure/machine definitions;
- progression rules;
- hostile/weather tuning;
- ruin identity.

---

# 28. DETERMINISM CONTRACT

Content definitions are deterministic inputs, not mutable deterministic state.

Required:

- validated catalog is load-order independent;
- authoritative generators reference stable IDs;
- iteration over content in authoritative logic uses explicit stable order when order matters;
- no reliance on JavaScript object/source insertion order for procedural choice;
- content pack compatibility identity is stable for canonical equivalent input;
- authoritative random selection from content uses project RNG and stable candidate order.

Any Phase 1 procedural output whose exact result depends on content must lock:
- world generation version;
- RNG/seed derivation version;
- content compatibility identity;
- golden fixture/output.

P1-TECH-004 owns world-generation integration.

---

# 29. PHASE 1 CATALOG BOUNDARY

The schema intentionally contains only categories needed by the accepted slice.

Required/approved named domain content includes:

### Items
18 item definitions listed in Section 6.

### Recipes
11 recipe definitions listed in Section 7.

### Resource nodes
6 definitions listed in Section 8.

### Structures
- Landing Module
- Storage Crate
- Workbench
- Habitat Room
- Compact Power Unit
- Atmospheric Water Condenser

### Machine
- Atmospheric Water Condenser

### Hazard
- Cold Exposure

### Weather
- Cold Rain

### Hostile
- Territorial Predator

### Ruin
- Previous-Civilization Ruin

### Progression
- Phase 1 Early Progression

### Prototype skills
- Fieldcraft Basics
- Maintenance Basics

### Professions
- Explorer — Prototype
- Engineer — Prototype

### Profession quests
- Chart the Unknown
- Bring Water Online

### Passive wildlife
A bounded passive/neutral wildlife role is allowed by the `entity` schema without inventing unsupported species/faction/ecology behavior.

No additional content family is implied.

---

# 30. DOWNSTREAM ADR CONTRACTS

## P1-TECH-003 / #39

Consumes:
- ItemDefinition;
- RecipeDefinition;
- ResourceNodeDefinition;
- Structure Workbench/Storage identities;
- progression trigger references.

Must define:
- runtime item/stack/container IDs;
- atomic transactions;
- capacities/weight state authority;
- gather/craft/repair authority;
- anti-duplication;
- revision/idempotency.

It may not redefine item weights, recipe inputs, resource yields or stable IDs.

## P1-TECH-004 / #40

Consumes:
- ResourceNodeDefinition;
- EntityDefinition;
- WeatherDefinition;
- RuinDefinition;
- content compatibility identity.

Must define:
- deterministic placement;
- fog/discovery runtime state;
- environment schedule;
- generated base vs delta;
- world entity IDs/revisions/persistence.

It may not redefine approved Cold Rain/ruin/static source values.

## P1-TECH-005 / #41

Consumes:
- Item use profiles;
- HazardDefinition;
- HostileDefinition;
- ProgressionDefinition references as needed.

Must define:
- fixed-step needs;
- player attack resolution;
- hostile runtime state;
- damage/death/cache/respawn;
- progression-authoritative event handoff.

It may not rebalance static approved content values.

## P1-TECH-006 / #42

Consumes:
- StructureDefinition;
- MachineDefinition;
- construction-kit item IDs;
- Workbench/storage/power/static machine values.

Must define:
- placement transaction;
- world structure identity;
- power allocation;
- machine runtime state/progress;
- co-op contention.

It may not reinterpret the Condenser core function.

## P1-TECH-007 / #43

Consumes:
- ContentCompatibilityIdentity;
- stable ContentIds.

Must define:
- session handshake;
- compatibility rejection;
- replicated content references.

## P1-TECH-008 / #44

Consumes:
- ContentCompatibilityIdentity;
- stable persisted ContentIds.

Must define:
- save V2 compatibility/migration/remapping policy.

## P1-TECH-009 / #45

Must include:
- invalid-content tests;
- canonical fingerprint evidence;
- exact-pack golden fixtures;
- architecture rule that renderer fields cannot enter content domain;
- exact-head content validation artifacts as useful.

---

# 31. TEST STRATEGY

P1-ENG-001 must provide automated coverage at minimum.

## Schema

1. valid Phase 1 pack validates;
2. wrong format fails;
3. newer schema fails;
4. invalid pack version fails;
5. malformed ID fails;
6. kind-prefix mismatch fails;
7. non-finite number fails;
8. unknown field/type violation fails.

## Identity/reference

9. duplicate ID fails;
10. missing reference fails;
11. wrong-kind reference fails;
12. construction kit/structure mismatch fails;
13. invalid recipe reference fails;
14. invalid profession/skill/quest reference fails.

## Immutability

15. finalized definitions cannot be mutated through public catalog;
16. source object mutation after validation cannot mutate catalog state;
17. catalog exposes no mutable Map/array authority.

## Determinism

18. shuffled definition source order -> same canonical catalog/fingerprint;
19. shuffled unordered recipe/reference lists -> same canonical representation;
20. profession quest objective order remains significant;
21. stable ID-sorted listing is identical across runs.

## Exact Phase 1 golden content

22. exact item set/approved item numeric values;
23. exact 11 recipes;
24. exact six resource definitions;
25. exact structure caps/source kits;
26. Compact Power Unit 10 PU / 8-footprint static contract;
27. Condenser 5 PU / 1 Clean Water / 90 active seconds / buffer 4 / no offline production;
28. Cold Rain static schedule/effect values;
29. Territorial Predator static profile;
30. ruin reward exactly one Ancient Alloy Shard;
31. progression thresholds/rewards/caps;
32. Fieldcraft/Maintenance prerequisites;
33. Explorer/Engineer quest cross-references and non-exclusive profession flags.

## Compatibility

34. any canonical pack content change changes canonical fingerprint;
35. pack identity fixture is retained as exact expected evidence;
36. save/network compatibility DTO round-trip is serializable and renderer-free.

---

# 32. PERFORMANCE

Content validation occurs before active authority starts.

Phase 1 expectations:

- O(N) structural/ID collection;
- O(N + references) cross-reference validation;
- O(1) ID lookup after finalization;
- ID-sorted lists cached/finalized rather than repeatedly sorted every simulation tick;
- no content-file parsing inside fixed-step simulation;
- no hash/fingerprint computation per frame/tick.

The Phase 1 pack is intentionally small; no content database/indexing service is required.

---

# 33. SECURITY / TRUST

Treat external/imported/raw content pack data as untrusted until validated.

Authoritative hosted server uses its own approved pack.

Clients may send ContentIds as command intent but cannot:
- define new content;
- change item stats;
- change recipes;
- change machine production;
- change damage values;
- change progression XP.

Unknown or incompatible ContentIds are rejected at authority validation.

No dynamic mod loading is authorized in Phase 1.

---

# 34. FILE / MODULE PLAN FOR P1-ENG-001

Implementation task #47 may refine file names while preserving these boundaries.

Recommended creation:

```text
src/content/
  schema/
    ContentSchema.ts
    ContentDefinitionsV1.ts
  validation/
    ContentPackValidator.ts
  canonical/
    ContentCanonicalizer.ts
  registry/
    ContentCatalog.ts
  packs/
    phase1/
      Phase1ContentPack.ts
      Phase1ContentIds.ts
```

Recommended modification:

```text
src/content/index.ts
src/content/ContentRegistry.ts
```

The old generic registry may be:
- replaced by the validated catalog; or
- retained internally as a small lookup primitive.

It must not remain the only Phase 1 validation boundary.

Tests:

```text
tests/unit/content-schema-validation.test.ts
tests/unit/content-cross-reference-validation.test.ts
tests/unit/content-catalog-immutability.test.ts
tests/determinism/content-pack-canonicalization.test.ts
tests/determinism/phase1-content-golden.test.ts
```

A build/test helper may produce the SHA-256 canonical fingerprint outside fixed-tick authority.

---

# 35. FAILURE MODES CONSIDERED

### Duplicate ID
Fail pack activation.

### Missing/wrong-kind reference
Fail pack activation.

### Invalid approved numeric tuning
Fail pack activation.

### Partial pack
Fail if required Phase 1 critical-path content is absent.

### Content drift with unchanged human version
Canonical fingerprint mismatch exposes the drift.

### Save references removed ID
P1-TECH-008 compatibility/migration failure; no silent substitution.

### Client joins with different content
P1-TECH-007 rejects compatibility handshake.

### Renderer mapping missing
Client presentation may fail/readably fallback only under its own approved Art/UI rules; domain does not alter gameplay definition.

### Source load order differs
Canonicalization produces identical catalog/fingerprint.

### Active runtime attempts hot content mutation
Not supported; requires authority restart/new compatible session.

---

# 36. MIGRATION / FUTURE EXTENSION

Phase 1 uses one pack-level compatibility unit.

Future phases may add:
- content-pack composition;
- localization;
- mods;
- multiple biome packs;
- research trees;
- richer entity archetypes.

Those are not silently added to V1.

If content schema changes:
- increment CONTENT_SCHEMA_VERSION;
- define explicit migration/loader compatibility.

If only approved Phase 1 content values/definitions change:
- increment packVersion;
- record save/network compatibility decision;
- update fingerprint/golden fixtures.

Stable persisted IDs are never repurposed to mean a different concept.

---

# 37. ACCEPTANCE CRITERIA SELF-CHECK

- Content definitions read-only/data-driven and separate from runtime state: **PASS**
- Stable IDs defined: **PASS**
- Pack/schema version identity defined: **PASS**
- Canonical fingerprint defined: **PASS**
- Validation/failure behavior defined: **PASS**
- Cross-reference integrity enforceable: **PASS**
- Deterministic/load-order-independent registry behavior defined: **PASS**
- Renderer-specific data excluded from domain authority: **PASS**
- Exact Phase 1 item/recipe/resource/structure/machine/hazard/weather/hostile/ruin/progression contracts identified: **PASS**
- Atmospheric Water Condenser approved values preserved: **PASS**
- Explorer/Engineer prototype content preserved with no class lock: **PASS**
- Schema bounded to Phase 1: **PASS**
- Save/network compatibility seams identified: **PASS**
- Specialized ADR responsibilities not collapsed into content layer: **PASS**
- No gameplay values invented/rebalanced: **PASS**
- No implementation authorized: **PASS**
- Blocking open question: **NONE**

---

# 38. CONSEQUENCES

## Benefits

- one authoritative vocabulary for Phase 1 content;
- saved/networked runtime state can use stable IDs instead of serialized gameplay definitions;
- missing/duplicate references fail before play;
- content source order cannot change deterministic authoritative behavior;
- host/client/save compatibility can detect exact content drift;
- item/recipe/resource/building/progression values stop being duplicated across systems;
- Art/UI can map visuals by stable ContentId without becoming canonical authority.

## Costs

- content changes require explicit version/fingerprint discipline;
- all critical cross-references must validate before startup;
- downstream systems must lookup immutable definitions rather than embed duplicate constants;
- content changes affecting old saves require migration/compatibility decisions.

These costs are accepted because Phase 1 persistence and hosted co-op make silent content drift materially dangerous.

---

# 39. IMPLEMENTATION AUTHORIZATION

**NOT AUTHORIZED by P1-TECH-002.**

This ADR is a specification source.

Producer may activate downstream ADRs according to dependency graph only after verifying this artifact.

P1-ENG-001 / #47 remains blocked until its full Design + Technical Design gate is satisfied.

---

# 40. HANDOFF

**Task:** P1-TECH-002  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-002-content-schema-registry.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** verify DoD/AC, mark P1-TECH-002 TECH READY if accepted, then evaluate #39/#40/#41 activation according to their matching approved gameplay sources.  
**Project Owner decision required:** NONE.
