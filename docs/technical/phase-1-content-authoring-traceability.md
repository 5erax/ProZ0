# P1-TD-001 — Phase 1 Content Authoring Traceability and Validation Reference

**Task:** P1-TD-001 / Issue #69  
**Role:** Technical Designer / Content Systems Designer  
**Member:** B-TD-01  
**Home Company:** COMPANY_B  
**Coordinating PM:** PM-B / B-PM-01  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** COMPLETE — HANDOFF READY  
**Artifact Path:** docs/technical/phase-1-content-authoring-traceability.md  
**Scope:** Designer-facing traceability, authoring, and validation reference only. No schema, runtime, gameplay-value, or content-definition change.

---

## 1. Purpose

This reference lets future content authors and reviewers answer five questions without code archaeology:

1. Which stable Phase 1 ContentId already represents a concept?
2. Which approved design or narrative source owns the value or meaning?
3. Which approved schema family represents it?
4. Where is the merged implementation evidence?
5. Which role must approve a change before content data is modified?

This document does not become a new source of gameplay, architecture, canon, runtime state, or presentation authority. It is a traceability and authoring aid inside the already-approved Phase 1 contracts.

If this document disagrees with an approved higher-precedence source, the higher-precedence source wins and the disagreement must be recorded as a finding rather than silently reconciled.

---

## 2. Authoritative source chain

For the content covered here, use the project Source of Truth in this order.

### Gameplay values and rules

- P1-DES-002 / #32 — docs/design/phase-1-inventory-gathering-crafting-repair.md
- P1-DES-003 / #33 — docs/design/phase-1-survival-combat-death-recovery.md
- P1-DES-004 / #34 — docs/design/phase-1-habitat-building-power-machine.md
- P1-DES-005 / #35 — docs/design/phase-1-exploration-fog-weather-ruin.md
- P1-DES-006 / #36 — docs/design/phase-1-early-progression-profession.md

The Game Designer owns gameplay rules and balance intent.

### Schema / architecture

- P1-TECH-002 / #38 — docs/adr/ADR-P1-TECH-002-content-schema-registry.md

The Technical Lead owns schema and architecture authority. This reference may explain the approved schema but may not extend, reinterpret, or replace it.

### Merged implementation evidence

- P1-ENG-001 / #47
- PR #61
- merged implementation under src/content/**
- approved corrected head: 6cdb894a83bc36b6c4748331097a2e02f64e8e95
- merge commit: 484569de3247349591241bb87b499ba03fad8a6c

Engineering owns runtime implementation. The merged content pack is evidence of what is implemented; it is not permission to redefine the approved design from code.

### Narrative / world canon

- P1-NARR-001 / #65 — docs/narrative/phase-1-ruin-mystery-hook.md
- constrained by P1-DES-005 / #35 for the approved ruin/discovery gameplay contract

The Narrative & World Design Director owns narrative canon within that authority.

### Presentation / visual mapping

Art/UI owns client-only visual and UI presentation. The ADR explicitly separates domain ContentId from renderer asset identity. A future presentation mapping may map ContentId to icons, sprites, atlas keys, animation names, UI grouping, or localized presentation without becoming gameplay/domain authority.

---

## 3. Current Phase 1 pack identity

The approved Phase 1 compatibility unit is:

| Field | Current approved value | Authority / evidence |
|---|---|---|
| formatId | proz0-content-pack | #38 / src/content/SchemaV1.ts |
| schemaVersion | 1 | #38 / src/content/SchemaV1.ts |
| packId | proz0-phase1-vertical-slice | #38 / src/content/SchemaV1.ts |
| packVersion | 1 | #38 / src/content/SchemaV1.ts |
| fingerprint algorithm | sha256-canonical-json-v1 | #38 / src/content/SchemaV1.ts |
| canonical fingerprint | 3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c | #47 / PR #61 golden test |

The validated current catalog contains 54 definitions:

- 18 items
- 11 recipes
- 6 resources
- 1 passive-wildlife entity
- 6 structures
- 1 machine
- 1 hazard
- 1 weather
- 1 hostile
- 1 ruin
- 1 progression definition
- 2 skills
- 2 professions
- 2 profession quests

An intentional authoritative content-value change after this compatibility unit is depended upon requires the #38 versioning process: packVersion change, explicit save/network/content compatibility decision, and updated exact-content/golden evidence. This reference does not authorize any of those changes.

---

## 4. Content family map

| Family | Implemented schema family | Primary approved source | Implemented evidence | Change authority |
|---|---|---|---|---|
| Items | ItemDefinitionV1 | #32; item use profiles also #33 | Phase1Ids.ts, Phase1ContentPack.ts | Game Designer for gameplay values; Technical Lead for schema |
| Recipes | RecipeDefinitionV1 | #32 | Phase1Ids.ts, Phase1ContentPack.ts | Game Designer |
| Resources | ResourceNodeDefinitionV1 | #32 | Phase1Ids.ts, Phase1ContentPack.ts | Game Designer |
| Passive wildlife | EntityDefinitionV1 | #35 + #38 bounded placeholder | Phase1ContentPack.ts | Game Designer for gameplay role; Narrative/Art for later approved identity within their authority |
| Structures | StructureDefinitionV1 | #34; storage item/container contract also #32 | Phase1Ids.ts, Phase1ContentPack.ts | Game Designer |
| Machine | MachineDefinitionV1 | #34 | Phase1ContentPack.ts | Game Designer |
| Hazard | HazardDefinitionV1 | #33 + #38 | Phase1ContentPack.ts | Game Designer |
| Weather | WeatherDefinitionV1 | #35, thermal coupling #33 | Phase1ContentPack.ts | Game Designer |
| Hostile | HostileDefinitionV1 | #33 | Phase1ContentPack.ts | Game Designer |
| Ruin | RuinDefinitionV1 | #35; narrative meaning #65 | Phase1ContentPack.ts | Game Designer for gameplay; Narrative Director for canon |
| Progression | ProgressionDefinitionV1 | #36 | Phase1ContentPack.ts | Game Designer |
| Skills | SkillDefinitionV1 | #36 | Phase1ContentPack.ts | Game Designer |
| Professions | ProfessionDefinitionV1 | #36 | Phase1ContentPack.ts | Game Designer |
| Profession quests | ProfessionQuestDefinitionV1 | #36 | Phase1ContentPack.ts | Game Designer |

The schema-family names above are descriptive references to the already-approved #38 contract and merged #47 implementation. They are not new schema declarations.

---

## 5. Stable ID inventory

### 5.1 Items — 18

All item logistics values originate in P1-DES-002. Item-specific survival/combat use profiles additionally originate in P1-DES-003.

| ContentId | Display name | Category | Weight kg | Volume | Stack | Condition max | Additional approved static value |
|---|---|---|---:|---:|---:|---:|---|
| item:plant-fiber | Plant Fiber | raw-resource | 0.05 | 0.10 | 50 | none | — |
| item:timber | Timber | raw-resource | 1.00 | 2.00 | 10 | none | — |
| item:stone | Stone | raw-resource | 0.75 | 0.75 | 20 | none | — |
| item:metal-ore | Metal Ore | raw-resource | 1.00 | 0.75 | 20 | none | — |
| item:edible-plant | Edible Plant | food | 0.20 | 0.25 | 10 | none | +20 Food, 1 s use channel |
| item:clean-water | Clean Water | water | 0.50 | 0.50 | 10 | none | +25 Water, 1 s use channel |
| item:cordage | Cordage | component | 0.10 | 0.20 | 20 | none | — |
| item:stone-field-tool | Stone Field Tool | tool | 1.50 | 2.00 | 1 | 100 | gather tool |
| item:basic-spear | Basic Spear | weapon | 1.80 | 2.50 | 1 | 100 | range 1.5, arc 90°, stamina 15, damage 25, cooldown 0.65 s, condition loss 1 on successful hit |
| item:thermal-wrap | Thermal Wrap | equipment | 1.00 | 2.00 | 1 | 100 | harmful thermal movement multiplier 0.5 |
| item:field-dressing | Field Dressing | medical | 0.20 | 0.20 | 10 | none | +30 Health, 1 s use channel |
| item:repair-patch | Repair Patch | component | 0.25 | 0.30 | 10 | none | repair resource |
| item:storage-crate-kit | Storage Crate Kit | construction-kit | 5.00 | 6.00 | 1 | none | source kit for Storage Crate |
| item:workbench-kit | Workbench Kit | construction-kit | 8.00 | 8.00 | 1 | none | source kit for Workbench |
| item:habitat-kit | Habitat Kit | construction-kit | 12.00 | 12.00 | 1 | none | source kit for Habitat Room |
| item:power-unit-kit | Power Unit Kit | construction-kit | 10.00 | 8.00 | 1 | none | source kit for Compact Power Unit |
| item:machine-kit | Machine Kit | construction-kit | 10.00 | 10.00 | 1 | none | source kit for Atmospheric Water Condenser |
| item:ancient-alloy-shard | Ancient Alloy Shard | discovery-item | 2.00 | 2.00 | 1 | none | one-time physical ruin reward |

Trace:
- gameplay item table and recipes: #32 / P1-DES-002
- consumable, spear, and Thermal Wrap effects: #33 / P1-DES-003
- schema representation: #38 sections for ItemDefinitionV1
- implementation evidence: src/content/phase1/Phase1ContentPack.ts
- required ID set: src/content/Phase1Ids.ts

All current item definitions are ordinary-storage allowed in the merged pack, consistent with the Phase 1 portable-item model.

### 5.2 Recipes — 11

| ContentId | Tier / station | Approved input | Approved output | Source |
|---|---|---|---|---|
| recipe:cordage | hand | 3 Plant Fiber | 1 Cordage | #32 |
| recipe:stone-field-tool | hand | 1 Timber + 2 Stone + 1 Cordage | 1 Stone Field Tool @ 100 condition | #32 |
| recipe:basic-spear | hand | 2 Timber + 1 Stone + 1 Cordage | 1 Basic Spear @ 100 condition | #32 |
| recipe:thermal-wrap | hand | 5 Plant Fiber + 2 Cordage | 1 Thermal Wrap @ 100 condition | #32 |
| recipe:field-dressing | hand | 4 Plant Fiber | 1 Field Dressing | #32 |
| recipe:storage-crate-kit | hand | 4 Timber + 2 Cordage | 1 Storage Crate Kit | #32 |
| recipe:workbench-kit | hand | 4 Timber + 4 Stone + 2 Cordage | 1 Workbench Kit | #32 |
| recipe:repair-patch | workbench / structure:workbench | 2 Plant Fiber + 1 Metal Ore | 1 Repair Patch | #32 |
| recipe:habitat-kit | workbench / structure:workbench | 6 Timber + 6 Stone + 3 Cordage | 1 Habitat Kit | #32 |
| recipe:power-unit-kit | workbench / structure:workbench | 4 Timber + 5 Metal Ore + 2 Cordage | 1 Power Unit Kit | #32 |
| recipe:machine-kit | workbench / structure:workbench | 4 Timber + 6 Metal Ore + 3 Cordage | 1 Machine Kit | #32 |

Clean Water, Edible Plant, and Ancient Alloy Shard have no Phase 1 recipe definition. The Shard is obtained only through the approved ruin interaction.

Trace:
- design values: #32
- schema: #38 RecipeDefinitionV1
- implementation: Phase1ContentPack.ts
- ID list: Phase1Ids.ts

### 5.3 Resource nodes — 6

| ContentId | Gather time | Tool | Output | Actions | Regen active time | Tool condition / successful gather | Source |
|---|---:|---|---|---:|---:|---:|---|
| resource:fiber-plant | 0.60 s | none | 2 Plant Fiber | 4 | 600 s | 0 | #32 |
| resource:food-plant | 0.60 s | none | 1 Edible Plant | 3 | 900 s | 0 | #32 |
| resource:potable-water-source | 0.60 s | none | 1 Clean Water | unlimited | none | 0 | #32 |
| resource:timber-source | 1.00 s | item:stone-field-tool | 1 Timber | 5 | 1800 s | 2 | #32 |
| resource:stone-outcrop | 1.00 s | item:stone-field-tool | 2 Stone | 4 | 1800 s | 2 | #32 |
| resource:metal-ore-node | 1.00 s | item:stone-field-tool | 1 Metal Ore | 6 | 5400 s | 2 | #32 |

The content definition owns only static resource configuration. Current actions remaining, depletion, regeneration progress, world position, and revision are runtime world state and must not be authored into this pack.

### 5.4 Passive wildlife entity — 1

| ContentId | Static meaning | Source / boundary |
|---|---|---|
| entity:passive-wildlife | bounded passive/neutral wildlife role; no combat/drop/progression semantics implied | #35 requires passive wildlife presence; #38 deliberately uses a minimal role to avoid inventing unsupported species/ecology |

The current display name “Passive Wildlife” is a functional placeholder, not permission to invent species canon.

### 5.5 Structures — 6

| ContentId | Source kit | Player placeable | Phase 1 cap | Approved static profile | Source |
|---|---|---|---:|---|---|
| structure:landing-module | none | no | 1 | base-anchor, respawn-anchor | #34 |
| structure:storage-crate | item:storage-crate-kit | yes | 4 | shared storage; 100 kg / 120 volume; no nested containers | #32 + #34 |
| structure:workbench | item:workbench-kit | yes | 1 | crafting-station; Tier 1 craft/repair gate; no power required | #34 |
| structure:habitat-room | item:habitat-kit | yes | 1 | base-anchor, shelter; thermal target 50 | #34 + #33 |
| structure:compact-power-unit | item:power-unit-kit | yes | 1 | 10 PU; radius 8 footprints; always on; no portable fuel | #34 |
| structure:atmospheric-water-condenser | item:machine-kit | yes | 1 | machine-host for machine:atmospheric-water-condenser | #34 |

Placed position, orientation, connector state, ownership/revision, current power allocation, and other mutable structure state remain runtime authority and are not content-definition authoring fields.

### 5.6 Machine — 1

| ContentId | Approved static values | Source |
|---|---|---|
| machine:atmospheric-water-condenser | demand 5 PU; no portable item inputs; output item:clean-water ×1; 90 active powered seconds per cycle; output buffer 4; manual enable supported; no offline production; no periodic wear | #34 |

Current enabled state, power state, production progress, output quantity, world position, and revision are runtime state.

### 5.7 Hazard — 1

| ContentId | Approved static values | Source |
|---|---|---|
| hazard:cold-exposure | type cold-exposure; mitigation includes item:thermal-wrap; directHealthDamage = false | #33 + #38 |

The hazard definition relates static content. Player temperature, thresholds, drift, stamina modifiers, and damage cadence are runtime survival authority and are not stored here.

### 5.8 Weather — 1

| ContentId | Approved static values | Source |
|---|---|---|
| weather:cold-rain | references hazard:cold-exposure; start window 28–38 active minutes; duration 360 s; warning 60 s; day target 30; night target 20; does not erase persistent fog knowledge; direct health damage false | #35 + #33 |

The current event instance, start/end tick, forecast state, and active weather state are runtime world state.

### 5.9 Hostile — 1

| ContentId | Approved static values | Source |
|---|---|---|
| hostile:territorial-predator | max health 75; aggro radius 5; alert 0.4 s; leash radius 12; disengage outside 2.0 s; attack range 1.1; windup 0.55 s; damage 20; recovery 1.20 s; target policy nearest-valid-threatening-player; no required unique drop | #33 |

Current health, AI state, target, position, cooldown/windup progress, and alive/dead state are runtime state.

### 5.10 Ruin — 1

| ContentId | Approved gameplay values | Gameplay source | Narrative boundary |
|---|---|---|---|
| ruin:previous-civilization-ruin | locate radius 6; Inspect; immediate investigation; discovery shared with team; exactly one item:ancient-alloy-shard; reward stays claimable if inventory full | #35 | #65 |

Runtime UNKNOWN / LOCATED / INVESTIGATED state, reward-claimed state, world position, fog state, and personal XP acknowledgement are not content-definition state.

### 5.11 Progression — 1

ContentId: progression:phase1-early-progression  
Source: #36 / P1-DES-006.

Level thresholds:

| Level | Total XP |
|---:|---:|
| 1 | 0 |
| 2 | 100 |
| 3 | 225 |
| 4 | 400 |
| 5 | 650 |

Milestone rules:

| Rule group | Approved value |
|---|---|
| first gather: each of 6 resource sources | 8 XP each |
| first craft: each of 11 recipes | 8 XP each |
| first condition-increasing repair | 12 XP |
| first place Storage Crate | 15 XP |
| first place Workbench | 20 XP |
| first place Habitat Room | 30 XP |
| first place Compact Power Unit | 25 XP |
| first place Atmospheric Water Condenser | 35 XP |
| first collected Condenser Clean Water | 20 XP |
| first Expedition Band entry | 20 XP |
| first ruin locate | 30 XP |
| first personal ruin inspect | 100 XP |
| Territorial Predator resolution base | 20 XP |
| later/first kill top-up | 10 XP, 30 XP total maximum |
| first own Death Cache recovery | 15 XP |

Bounded repeat rules:

| Rule | XP per rewarded action | Max rewarded actions |
|---|---:|---:|
| gather | 2 | 20 |
| craft | 2 | 5 |
| repair | 4 | 3 |

Death XP loss:
- 5% of current-level progress
- minimum 1 if progress is positive
- may not reduce level

The content pack stores static progression rules. Current XP, level, milestone flags, counters, quest progress, skills, and profession unlocks remain runtime player state.

### 5.12 Skills — 2

| ContentId | Requirements | Phase 1 modifier | Source |
|---|---|---|---|
| skill:fieldcraft-basics | Level >= 2 + first personal Expedition Band entry | none | #36 |
| skill:maintenance-basics | Level >= 2 + first successful Workbench condition repair | none | #36 |

### 5.13 Professions — 2

| ContentId | Static contract | Source |
|---|---|---|
| profession:explorer-prototype | prototype only; non-exclusive; no exclusive critical-path capability | #36 |
| profession:engineer-prototype | prototype only; non-exclusive; no exclusive critical-path capability | #36 |

Neither profession creates a permanent class lock or exclusive Phase 1 critical-path privilege.

### 5.14 Profession quests — 2

| ContentId | Minimum level / skill | Ordered objectives | Reward | Source |
|---|---|---|---|---|
| profession-quest:chart-the-unknown | Level 3 / skill:fieldcraft-basics | locate ruin:previous-civilization-ruin → inspect it → return alive to structure:landing-module or structure:habitat-room | profession:explorer-prototype + 40 XP | #36 |
| profession-quest:bring-water-online | Level 3 / skill:maintenance-basics | shared structure:compact-power-unit + structure:atmospheric-water-condenser present → interact with powered machine:atmospheric-water-condenser → collect item:clean-water ×1 | profession:engineer-prototype + 40 XP | #36 |

Quest objective order is gameplay semantics where defined and is preserved by canonicalization rather than treated as an unordered set.

---

## 6. Ruin and Ancient Alloy Shard guardrails

This area has both gameplay and narrative authority and therefore requires explicit separation.

### CONFIRMED gameplay facts

From #35:
- the Phase 1 gameplay ID is ruin:previous-civilization-ruin;
- locating occurs at 6 footprint widths;
- Inspect is immediate;
- investigation creates shared persistent discovery knowledge;
- exactly one item:ancient-alloy-shard becomes claimable;
- full inventory does not delete the reward;
- discovery knowledge and the physical Shard are separate;
- death may affect the carried physical Shard through ordinary inventory/death-cache rules but does not erase the discovery record.

### CONFIRMED narrative facts

From #65:
- the ruin is not a current human landing/colony artifact;
- it predates the current human arrival;
- it is intentionally engineered evidence of an earlier technological presence;
- the builders are absent from the Phase 1 encounter;
- the purpose, builders' exact identity, relationship to humanity, and fate remain unresolved;
- Ancient Alloy Shard is a human-facing field designation for a physical sample associated with the ruin;
- the Shard does not, in Phase 1, canonically prove a specific composition, energy property, intelligence/data function, military purpose, faction, species, crafting unlock, research unlock, or explanation of the builders' fate.

### Terms that must not be silently upgraded to fact

Unless a later approved source authorizes them, do not encode or present as canonical facts:
- alien species
- precursor race
- extinct civilization
- lost human colony
- ancient empire
- invasion / war / plague / collapse / extermination
- hostile or benevolent civilization
- temple / weapon / portal / archive / terraformer / beacon / tomb

A content author may preserve the approved neutral gameplay/display labels. They may not use a label or presentation placeholder to settle an intentional narrative OPEN QUESTION.

---

## 7. Authoring conventions inside the existing schema

These conventions summarize #38 and the merged #47 implementation. They are guidance for using the approved schema, not a schema extension.

### 7.1 Start from authority, not from the data file

Before editing any content value:
1. identify the approved source that owns the requested change;
2. confirm that source actually contains the new value/meaning;
3. confirm the task lock authorizes editing the relevant content;
4. do not infer a value merely because a neighboring definition has a similar shape.

If the approved source does not support the value, classify it as OPEN QUESTION / DECISION NEEDED rather than inventing it.

### 7.2 Reuse stable ContentIds

ContentId format:
<kind>:<slug>

Current validation pattern:
^[a-z][a-z0-9-]*:[a-z0-9]+(?:-[a-z0-9]+)*$

Rules:
- lowercase ASCII, digits, internal hyphen;
- prefix must match kind;
- globally unique across the pack;
- do not repurpose a persisted/network-referenced ID to mean another concept;
- do not silently rename an ID;
- persisted-ID migration belongs to the approved compatibility/migration process, not ordinary content authoring.

### 7.3 Do not invent a new kind

The V1 union is closed to:
item, recipe, resource, entity, structure, machine, hazard, weather, hostile, ruin, progression, skill, profession, profession-quest.

A need that does not fit these approved definitions is not permission for a Technical Designer to add a generic property bag or new kind. Route schema need to Technical Lead.

### 7.4 Keep definitions JSON-compatible and static

Approved content data is:
- JSON-compatible;
- finite-number only;
- deeply immutable after validation;
- free of functions, classes, Maps/Sets, renderer objects, cycles, NaN, Infinity, undefined, or live callbacks.

Content definitions express static configuration, not commands or mutable authority.

### 7.5 Keep runtime state out of content

Do not author live:
- item quantities/current condition/owners/stack IDs/world positions;
- resource remaining actions/depleted/regen progress;
- hostile current health/state/target;
- ruin located/investigated/reward-claimed state;
- structure positions/orientations/current revisions;
- machine enabled/powered/progress/output state;
- player XP/levels/unlocks/quest progress;
- current weather event state/ticks.

Those belong to runtime systems and their owning engineering/technical contracts.

### 7.6 Keep renderer and UI state out of domain content

ContentId is not an asset key.

Do not add renderer handles, texture/sprite paths as domain authority, canvas coordinates, animations, camera state, UI panel state, or presentation-only collider data to the canonical content pack.

Presentation may separately map ContentId to client-only art/UI data. That mapping may not change gameplay meaning.

### 7.7 Treat displayName correctly

displayName is the Phase 1 player-facing semantic text carried by the domain content contract. It is not:
- the stable identity;
- a renderer object;
- a texture key;
- proof of narrative facts beyond approved canon;
- a complete localization architecture.

Changing a narrative-sensitive display label requires checking narrative authority. Changing a gameplay-facing name requires the relevant approved design source. A purely visual/icon treatment belongs to Art/UI and should remain in presentation mapping.

### 7.8 Validate references by existence and kind

Examples:
- recipe IO → item
- recipe station → structure
- resource tool/output → item
- structure source kit → construction-kit item
- structure machine reference → machine
- machine output → item
- hazard mitigation → item
- weather hazard → hazard
- ruin reward → approved discovery item
- progression gather/craft/structure/machine/ruin/hostile triggers → matching kinds
- profession quest required skill → skill
- profession quest reward → profession
- quest objectives → matching structure/machine/item/ruin kinds

Missing and wrong-kind references are fatal validation findings, not candidates for silent fallback.

### 7.9 Preserve deterministic canonical semantics

Author/source order is not authority.

Canonicalization rules from #38/#47 include:
- definitions sort by stable ContentId;
- recipe IO and set-like references canonicalize by stable ID;
- level thresholds canonicalize by level;
- progression milestone/repeat rules canonicalize by stable rule ID;
- profession quest objective order is preserved because objective order can be gameplay semantics.

Do not build gameplay meaning from “Nth loaded definition.”

### 7.10 Respect pack compatibility discipline

A changed authoritative pack value is not “just data.”

After the pack becomes a save/network compatibility dependency, an intentional authoritative change requires the #38 compatibility process:
- approved source change;
- packVersion revision;
- explicit save/network/content compatibility decision;
- updated fingerprint/golden evidence;
- appropriate implementation/review task.

The Technical Designer must not perform those authority steps implicitly.

---

## 8. Validation / review checklist for future approved content edits

Use this checklist only after a separately authorized task has approved a content modification inside the existing schema.

### A. Authority and traceability

- [ ] Source Task/Issue exists and is locked to the executing role/member.
- [ ] Every changed gameplay value has an approved Game Design source.
- [ ] Every changed narrative-sensitive fact/label has an approved narrative source and does not conflict with higher-precedence Game Design.
- [ ] No schema field/kind/meaning is being invented; otherwise stop and route to Technical Lead.
- [ ] Exact affected ContentIds are listed before implementation.
- [ ] Existing implementation is used as evidence, not substituted for missing requirement authority.

### B. Stable identity

- [ ] ContentId matches <kind>:<slug>.
- [ ] Prefix matches definition kind.
- [ ] ID is globally unique.
- [ ] Existing persisted/referenced ID is not repurposed.
- [ ] Any proposed ID rename is routed through explicit migration/compatibility authority.

### C. Structural data validity

- [ ] Definition contains only fields allowed by the approved V1 schema.
- [ ] displayName is non-empty semantic text.
- [ ] Enum values are from approved closed sets.
- [ ] Numeric values are finite.
- [ ] Counts/quantities/stacks that require integers are safe integers and valid ranges.
- [ ] Data is JSON-compatible and contains no runtime callback or renderer object.
- [ ] No unsupported/new definition kind is introduced.

### D. Cross-reference integrity

- [ ] Every referenced ContentId exists.
- [ ] Every reference points to the required kind.
- [ ] Recipe inputs/outputs have no duplicate item entries.
- [ ] Workbench recipes point to structure:workbench.
- [ ] Construction structures point to their exact approved kit item.
- [ ] Machine/hazard/weather/ruin/progression/profession-quest references remain coherent.

### E. Phase 1 semantic invariants

- [ ] Condition-bearing items are stack 1 and use approved condition max where applicable.
- [ ] Landing Module remains pre-existing/non-placeable.
- [ ] Potable Water Source remains unlimited and yields Clean Water unless Game Design explicitly changes it.
- [ ] Condenser contract remains source-approved: power/input/output/cycle/buffer/offline/wear.
- [ ] Cold Rain remains source-approved: schedule window, warning, targets, fog-memory and direct-damage boundary.
- [ ] Ruin reward remains exactly one approved Ancient Alloy Shard unless Game Design explicitly changes it.
- [ ] Profession prototypes remain non-exclusive unless approved Game Design changes the rule.
- [ ] Progression thresholds and references remain coherent and deterministic.
- [ ] All content required by the accepted critical path still exists.

### F. Determinism and compatibility

- [ ] Source-order changes do not change canonical identity when semantics are unchanged.
- [ ] Semantically ordered arrays, especially quest objectives, keep approved order.
- [ ] Exact canonical fingerprint evidence is updated only through the authorized compatibility process.
- [ ] packVersion/save/network compatibility requirements are handled by their owning authority when the authoritative pack changes.
- [ ] Stable ID-sorted lookup/listing behavior remains deterministic.

### G. Runtime and presentation boundary

- [ ] No mutable runtime state is embedded in content.
- [ ] No renderer/UI asset object becomes domain authority.
- [ ] Art/UI presentation mapping remains separate from gameplay definitions.
- [ ] A presentation placeholder is not treated as a gameplay or canon requirement.

### H. Narrative-sensitive ruin / Shard check

- [ ] Ruin remains prior/previous-civilization evidence without assigning an unapproved builder identity.
- [ ] Ancient Alloy Shard remains a physical sample/field designation without unapproved properties or research/crafting powers.
- [ ] Purpose, builders' exact identity, relationship to humanity, and fate remain unresolved unless a newer approved source explicitly resolves them.
- [ ] No placeholder wording upgrades an OPEN QUESTION into CONFIRMED canon.

### I. Evidence before handoff

- [ ] Validation tests cover the modified values and references.
- [ ] Negative tests exist where a new failure mode is relevant.
- [ ] Exact-pack/golden evidence reflects the authorized change.
- [ ] Source-object immutability and renderer-free compatibility identity remain intact.
- [ ] Full required CI/review passes on the exact candidate.
- [ ] Any discrepancy is recorded on GitHub and routed; it is not silently fixed under an unrelated task.
- [ ] Handoff identifies artifact/code location, source Issue, tests, open questions, and next owning role.

---

## 9. Routing a requested change

Use the owning authority rather than changing data first.

| Requested change | First authority / route |
|---|---|
| Change item weight, recipe cost, resource yield, combat stat, machine rate, weather timing, XP reward, profession rule | Game Designer / approved Game Design task |
| Change schema shape, definition kind, field meaning, validation architecture, compatibility architecture | Technical Lead |
| Change runtime transaction/state-machine/world/persistence/network behavior | Relevant Engineer / Technical contract |
| Resolve builder identity, ruin purpose, civilization fate, Shard canon meaning | Narrative & World Design Director, subject to higher-precedence approved product/gameplay constraints |
| Change icons, sprites, atlas mapping, visual hierarchy, UI layout/presentation | Art Director / UI-UX / Technical Art |
| Encode already-approved content values inside existing schema under an authorized content task | Technical Designer / Content Systems |
| Discover source-vs-implementation mismatch | Record finding; notify Coordinating PM and owning authority; do not silently correct implementation |

Direct specialist discussion may clarify facts, but it does not transfer official task ownership or authority.

---

## 10. Findings from P1-TD-001 audit

### CONFIRMED — current mapped pack is traceable

The current Phase 1 pack on main was audited against:
- P1-DES-002..006;
- ADR-P1-TECH-002;
- P1-NARR-001 where ruin narrative boundaries apply;
- the merged #47 implementation and content tests.

For the static definition data mapped in this reference, no source-to-implementation gameplay-value, stable-ID, family, or required cross-reference discrepancy was found.

### CONFIRMED — #47 remains implementation evidence

The current content pack and tests demonstrate the implemented state:
- 54 definitions;
- required IDs;
- exact approved values;
- validation/canonicalization;
- immutable finalized catalog;
- exact golden fingerprint.

This reference does not promote code above approved design/ADR/canon authority.

### CONSTRAINT — narrative labels do not settle open canon

“Previous-Civilization Ruin” is a gameplay/production descriptor, not the builders' canonical self-name.

“Ancient Alloy Shard” is an approved gameplay item name and, under #65, a human-facing field designation. Neither label authorizes claims about builder biology, faction identity, ruin function, or Shard technological purpose.

### BLOCKING DISCREPANCIES

NONE FOUND for the scope of #69.

If a later author discovers a discrepancy, classify it using project information classification, cite both conflicting sources, stop the affected change, and route it to the authority that owns the disputed fact.

---

## 11. Acceptance criteria self-check

- Every mapped existing Phase 1 ContentId is listed and tied to approved source family plus merged implementation evidence: PASS.
- Mapped static values used by the pack are traceable to P1-DES-002..006 / #38 / #47 as applicable: PASS.
- Authoring guidance does not alter #38 schema authority: PASS.
- #47 content pack is treated as implementation evidence, not silently redefined: PASS.
- Narrative/label guidance preserves #65 open questions and higher-precedence #35 constraints: PASS.
- Ruin / Ancient Alloy Shard gameplay and canon boundaries are explicit: PASS.
- Deterministic validation/review checklist is provided: PASS.
- Runtime mutable authority remains outside content definitions: PASS.
- Renderer/UI presentation authority remains separate: PASS.
- No src/content/** change was made by P1-TD-001: PASS.
- No new gameplay value, schema, content definition, architecture, or runtime behavior was introduced: PASS.
- Discrepancy handling is explicit: PASS.
- Blocking discrepancy found: NONE.
- Project Owner decision needed: NONE.

---

## 12. Artifact record

**Exact path:**  
docs/technical/phase-1-content-authoring-traceability.md

**Purpose:**  
Designer-facing reference for tracing the approved Phase 1 content pack from stable IDs and values to owning design/canon sources, approved schema, merged implementation evidence, and deterministic validation/review rules.

**Responsibilities / content boundary:**  
Technical Designer authoring/validation guidance inside the existing approved schema only. No architecture, gameplay, canon, visual, runtime, or lifecycle authority is transferred by this document.

**Dependencies:**  
#32, #33, #34, #35, #36, #38, #47, #65 and their approved artifacts/evidence.

**Integration / reference point:**  
Issue #69 / P1-TD-001. Future authorized content-authoring, tuning, QA traceability, art/world integration, and review tasks may use this reference to find the correct authority and current Phase 1 IDs without treating this document as a substitute for the underlying Source of Truth.

**Project Owner Action:** NONE
