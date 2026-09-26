# P1-UXSUP-001 — Phase 1 Player-Facing Clarity Support Matrix

**Task:** P1-UXSUP-001 / Issue #104  
**Owner:** B-TD-01 / TECHNICAL_DESIGNER / COMPANY_B  
**Coordinating PM:** PM-B / B-PM-01  
**Lock:** PMB-P1-UXSUP-001-R1  
**Activation baseline:** `7a566d29b631f24b608f6661267be2ed786f265f`  
**Artifact:** `docs/uiux/phase-1-player-facing-clarity-support.md`  
**Status:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING  
**Authority boundary:** support/proposal documentation only. No runtime implementation, gameplay approval, UX acceptance, or Company A ownership change.

---

## 1. Purpose

This document converts accepted Phase 1 gameplay/UI contracts and current review evidence into an implementation-ready **player-facing clarity support matrix**.

It does **not** change any gameplay rule. It separates:

1. current baseline internal state/reason;
2. **PROPOSAL** player-facing copy/presentation;
3. the exact verb and exact target the player is acting on;
4. an actionable remedy when the action cannot proceed;
5. required A-GD gameplay-semantics review;
6. required A-ART UX/presentation review.

### PROPOSAL convention

Every player-facing copy, layout behavior, onboarding cue, target-visibility change, success acknowledgement, and remediation phrase in this document is **PROPOSAL** until reviewed through the #104 route.

Rows labeled with current internal reasons are baseline facts from the activation candidate; the player-facing wording is not self-approved.

---

## 2. Source traceability

### Task / review sources

- #104 / P1-UXSUP-001 — claimed documentation scope.
- PM-B activation comment `5846246779`.
- #59 / P1-QA-002 review evidence and PM-B triage comment `5845837858`.
- #29 / P1-DES-001 — accepted master gameplay/interaction priority.
- #37 / P1-ART-002 — accepted Phase 1 UI/art production contract.

### Detailed accepted gameplay sources used for wording boundaries

- `docs/design/phase-1-inventory-gathering-crafting-repair.md`
- `docs/design/phase-1-survival-combat-death-recovery.md`
- `docs/design/phase-1-habitat-building-power-machine.md`
- `docs/design/phase-1-exploration-fog-weather-ruin.md`
- `docs/design/phase-1-early-progression-profession.md`

### Activation-baseline runtime evidence

Read at `7a566d29b631f24b608f6661267be2ed786f265f`:

- `src/client/runtime/Phase1ProductReviewRuntime.ts`
- `src/client/runtime/Phase1PresentationBinding.ts`
- `src/client/presentation/Phase1HudOverlay.ts`
- `src/client/runtime/Phase1ProductReviewControls.ts`

These runtime files are evidence of current behavior only. This task does not authorize modification of `src/**`.

---

## 3. Mandatory guardrails

### 3.1 Survival numbers — no rebalance proposal

Confirmed Phase 1 design values:

- new-session Water = **80**;
- Water drain = **1.0/min**;
- new-session Food = **70**;
- Food drain = **0.6/min**.

Therefore after one simulated minute under ordinary drain:

- Water = **79**;
- Food = **69.4**.

This task makes **no survival rebalance proposal** from earlier incorrect drain assumptions.

### 3.2 Combat — clarity only

Phase 1 combat already defines and implements range/facing/arc/miss behavior. The accepted design includes:

- unarmed range/arc;
- Basic Spear range/arc;
- valid target resolution;
- whiff/miss behavior;
- stamina/cooldown consequences.

**PROPOSAL scope here is only target/action/failure clarity.** No dodge, block, aim mode, targeting system, range rewrite, or combat mechanic is proposed.

### 3.3 Building — preserve existing placement preview

The accepted build flow already has a placement preview with VALID/INVALID state and blocking reasons. Baseline Product Review also renders a build preview.

This document only proposes clearer labels/reasons/remedies **inside the existing preview flow**. It does not replace the building system.

### 3.4 Ruin canon guard

Never state or imply that the ruin builders are “not human,” “alien,” or otherwise identity-resolved.

Approved boundary:

- the site predates the current colony/landing;
- it is engineered evidence of an earlier technological presence;
- the builders' exact identity, relationship to humanity, purpose, and fate remain unresolved.

Any final lore wording remains subject to Narrative canon authority in addition to the #104 A-GD/A-ART route.

---

# 4. Generic interaction state matrix

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| `UNAVAILABLE`; no current context target; baseline can show `NO TARGET IN RANGE` / “Move near an interactable” | **PROPOSAL —** “No interactable in range.” | INTERACT | NONE | Move closer to a visible/focused resource, structure, Death Cache, or ruin. | YES | YES |
| `OUT_OF_RANGE` / `TOO FAR` | **PROPOSAL —** “Too far — move closer to {target}.” | current verb | Current resolved target | Move into ordinary interaction range; do not retarget to another object silently. | YES | YES |
| `TOOL_REQUIRED` | **PROPOSAL —** “{target} requires {required tool}.” | current verb | Current resolved target | Carry a usable required tool, then retry the same target. | YES | YES |
| `TOOL_BROKEN` / `ITEM BROKEN` | **PROPOSAL —** “{tool} is broken — repair it at a Workbench.” | current verb | Current resolved target | Repair the tool or use another valid usable tool if accepted behavior permits. | YES | YES |
| `TARGET_CAPACITY_WEIGHT` | **PROPOSAL —** “Too heavy — free inventory weight.” | current verb | Current resolved target/output | Drop/store/consume/transfer items until the transaction fits. | YES | YES |
| `TARGET_CAPACITY_VOLUME` | **PROPOSAL —** “Not enough inventory space.” | current verb | Current resolved target/output | Free inventory volume, then retry. | YES | YES |
| `STACK_LIMIT` | **PROPOSAL —** “Stack full — free a slot or move items.” | current verb | Current resolved target/output | Make valid inventory capacity available. | YES | YES |
| `QUANTITY_UNAVAILABLE` / `INSUFFICIENT MATERIAL` | **PROPOSAL —** “Missing required material: {item} {have}/{need}.” | current verb | Current recipe/repair target | Acquire the missing quantity; preserve all other inputs on failure. | YES | YES |
| `STALE_REVISION` / `WORLD_STATE_CHANGED` / `POSITION_TAKEN` / `TARGET_ALREADY_TAKEN` | **PROPOSAL —** “World state changed — target refreshed. Try again.” | current verb | Original target, then refreshed current target | Refresh presentation from authority; require a new commit if the original target is no longer valid. | YES | YES |
| authoritative command `committed` | **PROPOSAL —** short success acknowledgement specific to the action, e.g. “Gathered {output}” / “Crafted {item}” / “Built {structure}.” | committed verb | Committed target | No remedy; refresh target/state immediately from authority. | YES | YES |

**PROPOSAL presentation invariant:** internal diagnostic identifiers such as `SOURCE_MISSING`, `STALE_REVISION`, or `TARGET_CAPACITY_WEIGHT` should not be displayed raw when a player-facing remediation can be derived.

---

# 5. Gather clarity matrix

Baseline behavior:

- E uses a focused/in-range resource target;
- nearest in-range resource is deterministically selected after higher-priority E targets;
- gather can channel;
- hard resources require the Stone Field Tool;
- capacity, tool, stamina, depletion, range, and authority state can block;
- canceled gather does not consume yield/tool condition.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| resource target in range and eligible | **PROPOSAL —** “[E] GATHER · {resource display name}” | GATHER | The currently focused resource entity; focus contour must identify the exact entity | Press E to begin the existing gather action. | YES | YES |
| gather `CHANNELING` | **PROPOSAL —** “Gathering {resource}…” + existing progress strip | GATHER | Same committed resource entity | Stay in valid interaction state until completion; E/movement cancellation uses current rules. | YES | YES |
| `TOOL_REQUIRED` | **PROPOSAL —** “Need Stone Field Tool · {resource}.” | GATHER | Focused hard-resource node | Carry a usable Stone Field Tool, then retry. | YES | YES |
| `TOOL_BROKEN` | **PROPOSAL —** “Stone Field Tool broken — repair at Workbench.” | GATHER | Focused hard-resource node | Repair the tool; do not imply the resource itself is unavailable. | YES | YES |
| `INSUFFICIENT_STAMINA` / `EXHAUSTED` | **PROPOSAL —** “Too exhausted to gather — recover Stamina.” | GATHER | Focused resource node | Wait/recover according to accepted survival rules. | YES | YES |
| inventory weight/volume/stack block | **PROPOSAL —** “Cannot gather {output}: inventory {weight/space/stack} limit.” | GATHER | Focused resource node | Free the specifically blocked capacity, then gather again. | YES | YES |
| `RESOURCE_DEPLETED` | **PROPOSAL —** “{resource} depleted.” | GATHER | Focused depleted resource | Find another source; do not show false success. | YES | YES |
| channel canceled by leaving valid state / target loss | **PROPOSAL —** “Gather canceled — return to {resource}.” | GATHER | Previously committed resource | Re-enter valid range/focus and start again. | YES | YES |
| gather committed | **PROPOSAL —** “Gathered {quantity}× {output}.” | GATHER | Committed resource node | Refresh inventory/capacity and resource state. | YES | YES |

---

# 6. Crafting requirement clarity matrix

Accepted requirement: every known recipe displays inputs, quantities, output, station requirement, and why it cannot craft. Baseline runtime currently renders the full requirement list but the row-level block reason may report only the **first** missing input.

**PROPOSAL correction:** preserve the current recipe validation, but show **Have/Need for every input** and Workbench state separately.

Example presentation pattern:

`Timber 1/2 · Stone 2/2 · Cordage 0/1 · Workbench: NOT REQUIRED`

or

`Plant Fiber 2/2 · Metal Ore 1/1 · Workbench: IN RANGE`

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| recipe available; all inputs sufficient; no station required | **PROPOSAL —** “READY · {recipe}. Have/Need: {all inputs}.” | CRAFT | Exact selected recipe | Press the existing recipe slot key to craft. | YES | YES |
| recipe available; Workbench recipe; functional Workbench accessible | **PROPOSAL —** “READY · {recipe} · Workbench in range.” | CRAFT | Exact selected Tier 1 recipe | Craft normally. | YES | YES |
| one or more recipe inputs missing | **PROPOSAL —** “MISSING MATERIALS · {input A have/need} · {input B have/need} …” | CRAFT | Exact selected recipe | Gather/craft the listed deficits. Show every deficit, not only the first missing component. | YES | YES |
| `STATION_REQUIRED` / `WORKBENCH REQUIRED` | **PROPOSAL —** “Workbench required — move within range of a functional Workbench.” | CRAFT | Exact selected Tier 1 recipe | Place/access a functional Workbench, then retry the same recipe. | YES | YES |
| craft output blocked by weight | **PROPOSAL —** “Craft output too heavy for inventory.” | CRAFT | Exact selected recipe/output | Free inventory weight; inputs must remain unchanged on failure. | YES | YES |
| craft output blocked by volume/stack | **PROPOSAL —** “No room for craft output.” | CRAFT | Exact selected recipe/output | Free volume/stack capacity; retry. | YES | YES |
| craft committed | **PROPOSAL —** “Crafted {quantity}× {output}.” | CRAFT | Exact recipe and output | Refresh Have/Need counts immediately. | YES | YES |

**PROPOSAL:** do not present a craft queue/timer. Accepted Phase 1 crafting is transaction-immediate after confirmation.

---

# 7. Workbench requirement / Workbench E behavior

Accepted behavior:

- Tier 1 craft and repair require a functional accessible Workbench;
- Workbench uses the player's inventory for inputs;
- baseline E context uses Workbench after Death Cache → ruin → machine priority;
- if a damaged condition-bearing item exists, baseline E auto-targets the first eligible damaged stack for repair;
- if no repair target exists, E opens the craft surface.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| accessible Workbench; damaged repairable item auto-resolved | **PROPOSAL —** “[E] REPAIR · {item name} · {current}/{max} condition” | REPAIR | Exact auto-selected damaged stack | Press E only if this is the item the player intends to repair; target is visible before commitment. | YES | YES |
| accessible Workbench; no damaged repairable item | **PROPOSAL —** “[E] CRAFT · Workbench” | CRAFT | Exact Workbench instance | Press E to open Workbench crafting. | YES | YES |
| Tier 1 recipe requested but no accessible Workbench | **PROPOSAL —** “Workbench required — place one or move closer.” | CRAFT | Selected Tier 1 recipe | Access a functional Workbench. | YES | YES |
| repair request but Workbench not accessible | **PROPOSAL —** “Repair requires a functional Workbench.” | REPAIR | Intended repair item | Move within accepted Workbench interaction range. | YES | YES |

---

# 8. Equip / unequip clarity matrix

Current Product Review controls:

- Q toggles Basic Spear;
- T toggles Thermal Wrap;
- bottom-left HUD exposes active-equipment state;
- #59 partial review reported a possible contradiction where “UNEQUIP Basic Spear” appeared while HUD showed “NO ACTIVE EQUIPMENT”; this requires corrected-candidate QA reproduction, but #104 may provide a presentation proposal.

**PROPOSAL invariant:** action prompt and active-equipment HUD must describe the same authoritative equipment snapshot. Do not show “UNEQUIP” when the corresponding item is not actually equipped.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| no weapon equipped; usable Basic Spear exists | **PROPOSAL —** “[Q] EQUIP · Basic Spear” | EQUIP | Exact usable Basic Spear stack selected by current equipment behavior | Press Q to equip. | YES | YES |
| Basic Spear currently equipped | **PROPOSAL —** “[Q] UNEQUIP · Basic Spear” | UNEQUIP | Currently equipped Basic Spear stack | Press Q to unequip. | YES | YES |
| no weapon equipped; no usable Basic Spear available | **PROPOSAL —** “[Q] EQUIP · Basic Spear” / secondary: “Unavailable — acquire or repair a usable spear.” | EQUIP | Basic Spear capability; no valid stack | Acquire/repair a Basic Spear. Do not display a false UNEQUIP action. | YES | YES |
| no Thermal Wrap equipped; usable Thermal Wrap exists | **PROPOSAL —** “[T] EQUIP · Thermal Wrap” | EQUIP | Exact usable Thermal Wrap stack | Press T to equip. | YES | YES |
| Thermal Wrap currently equipped | **PROPOSAL —** “[T] UNEQUIP · Thermal Wrap” | UNEQUIP | Currently equipped Thermal Wrap stack | Press T to unequip. | YES | YES |
| requested equipment is broken/unusable | **PROPOSAL —** “{item} is broken — repair before equipping.” | EQUIP | Exact broken stack | Repair at Workbench. | YES | YES |
| equip/unequip committed | **PROPOSAL —** “Equipped {item}.” / “Unequipped {item}.” | EQUIP / UNEQUIP | Exact committed stack | Active-equipment HUD refreshes from the same authority result. | YES | YES |

---

# 9. Consume clarity and auto-target visibility

Accepted consume semantics:

- Clean Water, Edible Plant, and Field Dressing use a deliberate 1.0 s channel;
- successful completion consumes the item and applies the result;
- cancel/damage does not consume it;
- baseline V auto-target chooses **Clean Water first**, then the first other consumable by the current deterministic inventory ordering;
- baseline currently does not show that auto-selected target before the player presses V.

**PROPOSAL:** expose the exact current auto-target before commitment. Do **not** add manual consumable selection in #104.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| current auto-target resolves Clean Water | **PROPOSAL —** “[V] CONSUME · Clean Water” | CONSUME | Exact Clean Water stack currently selected by baseline priority | Press V to begin existing consume channel. | YES | YES |
| no Clean Water; another consumable auto-resolves | **PROPOSAL —** “[V] CONSUME · {resolved consumable}” | CONSUME | Exact current auto-selected consumable stack | Press V to begin existing consume channel. | YES | YES |
| no consumable stack; baseline can surface `SOURCE_MISSING · Consumable` | **PROPOSAL —** “No consumable available.” | CONSUME | NONE | Gather/carry Clean Water, Edible Plant, or Field Dressing as applicable. Do not expose `SOURCE_MISSING` to the player. | YES | YES |
| consume channel active | **PROPOSAL —** “Using {item}…” + existing progress strip | CONSUME | Same committed consumable stack | Complete the 1.0 s channel or cancel under existing rules. | YES | YES |
| channel canceled / damaged / invalidated | **PROPOSAL —** “Use canceled — {item} was not consumed.” | CONSUME | Same attempted consumable | Retry when safe/valid. | YES | YES |
| consume committed | **PROPOSAL —** “Used {item}.” + relevant meter pulse only if A-ART approves | CONSUME | Exact consumed item | Refresh Food/Water/Health from authoritative result. | YES | YES |

---

# 10. Repair clarity and auto-target visibility

Accepted repair rule:

- functional Workbench required;
- target must be repairable and below 100 condition;
- **1 Repair Patch** per repair;
- restores **+25 condition**, capped at 100;
- failure consumes nothing;
- baseline Workbench E auto-selects the first damaged condition-bearing stack in current inventory order.

**PROPOSAL:** show the auto-selected repair target, current condition, and Repair Patch requirement **before E is pressed**. Do not add manual repair selection in #104.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| repairable item auto-resolved; patch available | **PROPOSAL —** “[E] REPAIR · {item} {current}/{max} · 1 Repair Patch → +25” | REPAIR | Exact auto-selected damaged stack | Press E to repair the shown item. | YES | YES |
| repair target exists; no Repair Patch / `QUANTITY_UNAVAILABLE` | **PROPOSAL —** “Need 1 Repair Patch to repair {item}.” | REPAIR | Exact auto-selected damaged stack | Craft/acquire a Repair Patch at the Workbench. | YES | YES |
| `ITEM_FULL_CONDITION` | **PROPOSAL —** “{item} is already at full condition.” | REPAIR | Exact selected item | No repair needed; choose/use another damaged item through approved interaction flow. | YES | YES |
| `INVALID_REPAIR_TARGET` | **PROPOSAL —** “{item} cannot be repaired.” | REPAIR | Exact attempted item | Use a valid condition-bearing repairable item. | YES | YES |
| `STATION_REQUIRED` | **PROPOSAL —** “Repair requires a functional Workbench.” | REPAIR | Exact intended item | Move to/access Workbench. | YES | YES |
| repair committed | **PROPOSAL —** “Repaired {item}: {before} → {after} condition.” | REPAIR | Exact repaired stack | Refresh condition and Repair Patch count. | YES | YES |

---

# 11. Building placement feedback

The current/accepted system already has:

- build mode;
- selected structure;
- source Construction Kit;
- placement preview;
- VALID / INVALID preview state;
- connector handling for Habitat;
- authoritative confirm validation;
- immediate placement on success.

**No replacement building system is proposed.**

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| preview `VALID`; free placement | **PROPOSAL —** “VALID · [ENTER] PLACE · {structure}” | PLACE | Current selected structure at current preview anchor/orientation | Confirm with Enter. | YES | YES |
| preview connector mode valid | **PROPOSAL —** “CONNECTOR READY · [ENTER] PLACE · {structure}” | PLACE | Current selected structure + highlighted exact connector | Confirm with Enter; connector highlight remains visible. | YES | YES |
| baseline panel `KIT UNAVAILABLE` | **PROPOSAL —** “Need {source kit} to place {structure}.” | PLACE | Current selected structure | Craft/acquire the required Construction Kit. | YES | YES |
| baseline `NO LANDING CONNECTOR` / `CONNECTOR_REQUIRED` | **PROPOSAL —** “Habitat requires an available Landing Module connector.” | PLACE | Habitat Room + expected connector | Select a valid available Landing connector. | YES | YES |
| `INVALID_CONNECTOR` | **PROPOSAL —** “Connector unavailable — choose another connector.” | PLACE | Current structure + attempted connector | Cycle to a valid connector. | YES | YES |
| `UNEXPLORED_AREA` | **PROPOSAL —** “Explore this area before building here.” | PLACE | Current structure preview | Reveal the footprint area, then place. | YES | YES |
| `INVALID_TERRAIN` | **PROPOSAL —** “Invalid ground for {structure}.” | PLACE | Current structure preview | Move preview to approved stable ground. | YES | YES |
| `NON_BUILDABLE_SURFACE` | **PROPOSAL —** “Cannot build on water / non-buildable surface.” | PLACE | Current structure preview | Move preview to buildable ground. | YES | YES |
| `OBSTRUCTED` / `STRUCTURE_OVERLAP` | **PROPOSAL —** “Placement blocked — move clear of the obstruction.” | PLACE | Current structure preview | Move/rotate preview until clear. | YES | YES |
| `BLOCKS_SPAWN` | **PROPOSAL —** “Keep the Landing Module respawn area clear.” | PLACE | Current structure preview | Move preview outside protected spawn clearance. | YES | YES |
| `BLOCKS_REQUIRED_ACCESS` | **PROPOSAL —** “Keep required door / connector access clear.” | PLACE | Current structure preview | Move/rotate structure to preserve access. | YES | YES |
| `OUTSIDE_BASE_BUILD_ZONE` | **PROPOSAL —** “Outside Phase 1 foothold build zone.” | PLACE | Current structure preview | Move closer to Landing Module / connected Habitat within accepted build-zone rule. | YES | YES |
| `BUILD_LIMIT_REACHED` | **PROPOSAL —** “Phase 1 build limit reached for {structure}.” | PLACE | Current structure type | Use existing placed structure; do not consume kit. | YES | YES |
| authority `POSITION_TAKEN` / world changed on confirm | **PROPOSAL —** “Placement changed — preview refreshed.” | PLACE | Original preview location | Re-evaluate refreshed preview and confirm again. | YES | YES |
| build committed | **PROPOSAL —** “Built {structure}.” | BUILD | Exact placed structure instance | Exit/continue build mode according to existing UI; update kit count and capability state. | YES | YES |

---

# 12. Machine interaction clarity

Accepted Atmospheric Water Condenser behavior:

- DISABLED — off, no demand;
- UNPOWERED — enabled but no/insufficient eligible power;
- RUNNING — enabled/powered/output not full;
- OUTPUT FULL — 4 Clean Water, production paused;
- 1 Clean Water per 90 s active powered production;
- no offline production;
- baseline E collects output if any; otherwise E toggles enabled state.

**PROPOSAL:** the pre-action prompt should show the exact action that E will perform, not the generic “USE MACHINE” when a more exact verb is already known.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| DISABLED, no output | **PROPOSAL —** “[E] ENABLE · Atmospheric Water Condenser” | ENABLE | Exact in-range Condenser instance | Press E to enable. | YES | YES |
| UNPOWERED, enabled, no output | **PROPOSAL —** “[E] DISABLE · Atmospheric Water Condenser” / secondary: “UNPOWERED · needs eligible power.” | DISABLE | Exact in-range Condenser instance | Provide eligible Compact Power Unit capacity/radius; E currently toggles the enabled state, so show that exact action. | YES | YES |
| RUNNING, output 0 | **PROPOSAL —** “[E] DISABLE · Atmospheric Water Condenser” / secondary: “RUNNING · next water in progress.” | DISABLE | Exact in-range Condenser | Leave running for production, or press E to disable under existing behavior. | YES | YES |
| output 1–3 | **PROPOSAL —** “[E] COLLECT · Clean Water {count}/4 · Atmospheric Water Condenser” | COLLECT | Exact Condenser output container / current Clean Water output | Press E to collect current output. | YES | YES |
| OUTPUT FULL | **PROPOSAL —** “[E] COLLECT · Clean Water 4/4 · OUTPUT FULL” | COLLECT | Exact Condenser output | Collect water to free output capacity. | YES | YES |
| `INSUFFICIENT_POWER` feedback | **PROPOSAL —** “Condenser unpowered — provide eligible power.” | machine current verb | Exact Condenser | Place/use the existing Compact Power Unit within accepted power eligibility rules. | YES | YES |
| output transfer blocked by player inventory capacity | **PROPOSAL —** “Cannot collect Clean Water — free inventory {weight/space}.” | COLLECT | Condenser Clean Water output | Free the named capacity; output remains in machine. | YES | YES |
| enable/disable committed | **PROPOSAL —** “Condenser enabled.” / “Condenser disabled.” | ENABLE / DISABLE | Exact Condenser instance | Refresh state/power/output immediately. | YES | YES |
| collect committed | **PROPOSAL —** “Collected {count}× Clean Water.” | COLLECT | Exact machine output | Refresh machine buffer and player inventory. | YES | YES |

---

# 13. Ruin inspect / claim clarity

Accepted Phase 1 sequence:

- UNKNOWN;
- LOCATED → shared marker “Uninvestigated Ruin”;
- within interaction range, player uses Inspect;
- INVESTIGATED creates shared discovery and makes one Ancient Alloy Shard claimable;
- if inventory cannot accept the Shard, it remains claimable at the ruin;
- once claimed, no duplicate Shard is created.

Canon wording must preserve unresolved builder identity and relationship to humanity.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| ruin LOCATED / not investigated / in interaction range | **PROPOSAL —** “[E] INSPECT · Previous-Civilization Ruin” | INSPECT | Exact ruin investigation point | Press E to commit accepted immediate Inspect. | YES | YES |
| Inspect committed | **PROPOSAL —** “Discovery recorded: this engineered site predates the current colony. Its builders and purpose remain unresolved.” | INSPECT | Previous-Civilization Ruin | Update shared discovery/map; do not resolve builder identity. | YES | YES |
| ruin investigated; physical reward claimable | **PROPOSAL —** “[E] CLAIM · Ancient Alloy Shard” | CLAIM | The one claimable Shard at this ruin | Press E to claim if inventory can accept it. | YES | YES |
| Shard claim blocked by weight/volume/stack | **PROPOSAL —** “Ancient Alloy Shard remains here — free inventory capacity to claim it.” | CLAIM | Ancient Alloy Shard at the ruin | Free the named inventory capacity and return/retry. | YES | YES |
| Shard claim committed | **PROPOSAL —** “Ancient Alloy Shard claimed.” | CLAIM | The one Phase 1 Shard reward | Refresh inventory and ruin reward state; no duplicate reward. | YES | YES |
| investigated + reward already claimed | **PROPOSAL —** map/status copy: “Investigated Ruin · Shard claimed” | NONE | Previous-Civilization Ruin | No claim action remains; sandbox/exploration continues. | YES | YES |

**Canon guard:** do not use “alien,” “non-human,” or equivalent identity claims in any inspect/claim copy.

---

# 14. First-action onboarding proposal

Accepted master-design philosophy requires contextual guidance, not a long modal tutorial or forced quest rail.

### PROPOSAL — one immediate first-action cue

At a fresh Phase 1 spawn, show one compact cue only:

> **PROPOSAL:** “FIRST STEP · Move near a resource. When a target is focused: [E] GATHER · {exact resource target}.”

Rules for this cue:

- it disappears after the first successful gather;
- it does not block movement or other sandbox actions;
- it does not require a fixed resource ID if a different valid nearby resource is focused;
- the normal interaction prompt remains the source of the exact verb/target.

### PROPOSAL — one visible immediate capability condition

Expose one early dependency in the crafting/base UI, not as a mandatory quest:

> **PROPOSAL:** “WORKBENCH · unlocks Tier 1 crafting + repair. Craft a Workbench Kit, then place the Workbench.”

This is a readability statement for an already accepted dependency. It does not lock task order.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| fresh world; no first successful gather yet | **PROPOSAL —** “FIRST STEP · Move near a resource. [E] GATHER · {focused target}.” | GATHER | Current exact focused resource when available; NONE until one is focused | Move/orient and gather one reachable resource. | YES | YES |
| early player viewing craft/base capability; Workbench absent | **PROPOSAL —** “WORKBENCH · unlocks Tier 1 crafting + repair.” | CRAFT / BUILD | Workbench Kit → Workbench | Craft Workbench Kit, then place Workbench; no fixed quest chain. | YES | YES |
| first gather succeeds | **PROPOSAL —** “First gather complete.” then remove the first-action cue | GATHER | Committed resource | Continue sandbox play; normal contextual prompts take over. | YES | YES |

---

# 15. Progression unlock clarity

Current progression panel shows current Level/XP plus unlocked skills/professions and quest progress. Accepted design also defines exact eligibility conditions.

**PROPOSAL:** display locked eligibility conditions as readable “Requires …” lines so a player understands the next actionable condition without inventing a new skill tree.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| Fieldcraft Basics locked; Level < 2 | **PROPOSAL —** “Fieldcraft Basics · Requires Level 2 + enter the Expedition Band.” | PROGRESS | Fieldcraft Basics | Gain XP through accepted meaningful activities; then personally enter Expedition Band. | YES | YES |
| Level >=2; Fieldcraft Basics still missing Expedition Band condition | **PROPOSAL —** “Fieldcraft Basics · Level 2 ✓ · Enter Expedition Band ☐” | PROGRESS | Fieldcraft Basics | Personally enter Expedition Band. | YES | YES |
| Maintenance Basics locked; Level < 2 or no successful Workbench repair | **PROPOSAL —** “Maintenance Basics · Requires Level 2 + successful Workbench repair.” | PROGRESS | Maintenance Basics | Reach Level 2 and complete a condition-increasing Workbench repair. | YES | YES |
| Level >=2; Maintenance repair condition missing | **PROPOSAL —** “Maintenance Basics · Level 2 ✓ · Repair damaged equipment at Workbench ☐” | REPAIR | Maintenance Basics prerequisite via exact repair target | Perform one successful Workbench repair that increases condition. | YES | YES |
| Explorer quest locked | **PROPOSAL —** “Chart the Unknown · Requires Level 3 + Fieldcraft Basics.” | PROGRESS | Explorer — Prototype eligibility | Satisfy the accepted two eligibility conditions. | YES | YES |
| Explorer quest active | **PROPOSAL —** “Chart the Unknown · Locate Ruin → Inspect → Return to base.” | INSPECT / RETURN | Personal Explorer quest state | Complete remaining accepted personal objective(s). | YES | YES |
| Engineer quest locked | **PROPOSAL —** “Bring Water Online · Requires Level 3 + Maintenance Basics.” | PROGRESS | Engineer — Prototype eligibility | Satisfy the accepted two eligibility conditions. | YES | YES |
| Engineer quest active | **PROPOSAL —** “Bring Water Online · powered Condenser context → interact/enable → collect 1 Clean Water.” | USE MACHINE / COLLECT | Personal Engineer quest state + exact Condenser | Complete remaining accepted personal objective(s). | YES | YES |
| skill/profession unlock committed | **PROPOSAL —** existing non-blocking toast lane: “Unlocked · {skill/profession}” | UNLOCK | Exact unlocked record | Continue sandbox play; no permanent class lock is implied. | YES | YES |

---

# 16. Exact E interaction target clarity

Baseline Product Review E priority is currently:

1. **Death Cache**
2. **Ruin**
3. **Atmospheric Water Condenser**
4. **Workbench**
5. **Resource**

This matches the current `refreshContextInteraction()` and `beginContextInteraction()` ordering at the activation baseline.

**PROPOSAL:** the visible E prompt must be generated from the same priority resolution as the next E commit. The world focus contour + prompt together identify the exact target.

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| Death Cache is valid highest-priority target | **PROPOSAL —** “[E] RECOVER · Death Cache” | RECOVER | Exact in-range non-empty Death Cache selected by current priority | E commits recovery against this cache. | YES | YES |
| no valid Death Cache; ruin valid | **PROPOSAL —** “[E] INSPECT · Previous-Civilization Ruin” or “[E] CLAIM · Ancient Alloy Shard” based on current ruin state | INSPECT / CLAIM | Exact ruin / reward state currently selected | E commits the displayed ruin action. | YES | YES |
| no higher priority; Condenser valid | **PROPOSAL —** exact machine verb from Section 12 | ENABLE / DISABLE / COLLECT | Exact in-range Condenser | E commits the displayed machine action. | YES | YES |
| no higher priority; Workbench valid; repair target exists | **PROPOSAL —** “[E] REPAIR · {exact auto-target item}” | REPAIR | Exact damaged item stack selected through Workbench context | E repairs the displayed item if transaction validates. | YES | YES |
| no higher priority; Workbench valid; no repair target | **PROPOSAL —** “[E] CRAFT · Workbench” | CRAFT | Exact Workbench | E opens Workbench crafting. | YES | YES |
| no higher priority; resource valid | **PROPOSAL —** “[E] GATHER · {resource name}” | GATHER | Exact focused/selected resource entity | E begins gather on this target. | YES | YES |
| no valid context target | **PROPOSAL —** hide normal target prompt; optional compact help: “Move near an interactable.” | INTERACT | NONE | Move toward an interactable. | YES | YES |
| authority changes target after prompt but before commit | **PROPOSAL —** “World state changed — target refreshed.” | prior verb canceled/rejected | Original exact target, then newly resolved target | Do not silently execute on a different object; require refreshed player commitment. | YES | YES |

This preserves the accepted rule: UI must not silently retarget another world object at commitment.

---

# 17. Repair / consume auto-target visibility summary

The task explicitly asks to make current auto-target behavior visible **before any manual selection is considered**.

### PROPOSAL — Repair target preview

When Workbench E would repair:

`[E] REPAIR · Basic Spear · 62/100 · Need 1 Repair Patch`

Use the exact baseline auto-selected damaged stack.

If no damaged repair target exists, display:

`[E] CRAFT · Workbench`

### PROPOSAL — Consume target preview

Before V is pressed, expose the same target baseline V will choose:

`[V] CONSUME · Clean Water`

or, if another consumable currently resolves:

`[V] CONSUME · Edible Plant`

If no consumable exists:

`[V] CONSUME · No consumable available`

This task does not introduce a manual item picker or change auto-target priority.

---

# 18. Combat feedback guardrail

No combat mechanic change is proposed.

For clarity only, if the existing attack action is surfaced:

| CURRENT INTERNAL STATE/REASON | PLAYER-FACING COPY | VERB | EXACT TARGET | NEXT ACTION/REMEDY | A-GD REVIEW? | A-ART REVIEW? |
|---|---|---|---|---|---|---|
| no hostile target available | **PROPOSAL —** “No hostile target in attack context.” | ATTACK | NONE | Reposition only if the player intends to engage; no target lock system is added. | YES | YES |
| facing not established; baseline reason `MOVE TO SET FACING` | **PROPOSAL —** “Move to set facing before attacking.” | ATTACK | Territorial Predator if present | Move/reorient using existing locomotion/facing behavior. | YES | YES |
| existing combat command resolves miss/whiff | **PROPOSAL —** “Miss · Territorial Predator” | ATTACK | Current hostile target/resolution | Reposition/retry under existing range/arc/stamina/cooldown rules. | YES | YES |
| existing combat command hits | **PROPOSAL —** “Hit · Territorial Predator” | ATTACK | Resolved hostile target | Continue current combat flow. | YES | YES |

This section does not change range, arc, damage, target resolution, stamina cost, cooldown, or miss rules.

---

# 19. Copy hierarchy / implementation notes

All items below are **PROPOSAL** and require A-ART review.

### Primary line

Use the accepted interaction structure:

`[INPUT] VERB · EXACT TARGET`

Examples:

- `[E] GATHER · Stone Outcrop`
- `[E] REPAIR · Basic Spear`
- `[E] COLLECT · Clean Water`
- `[V] CONSUME · Clean Water`

### Secondary line

Use only for:

- blocked reason;
- prerequisite;
- concrete remedy;
- channel progress;
- machine/build state.

Do not place raw internal identifiers on the player-facing line when a plain-language equivalent exists.

### Success

Use short non-blocking confirmation. Success copy must never imply an action occurred before authoritative commit.

### Exact target disambiguation

When multiple world objects share the same display name, the exact target is identified by:

1. current world focus contour/highlight;
2. current verb + display name in prompt;
3. same target resolver used by the commit.

Do not expose internal entity IDs unless a QA/debug surface explicitly requires them.

---

# 20. Review decisions required

## A-GD-01 gameplay-semantics review

A-GD should verify that the proposal copy does not:

- imply new requirements;
- change current E priority;
- change consume priority;
- change repair auto-target behavior;
- change craft/repair/build/machine preconditions;
- imply new progression gates;
- reinterpret combat;
- create a fixed onboarding quest chain.

Particular A-GD attention:

1. machine prompt verb accurately describing current toggle behavior;
2. unavailable equip wording when no valid stack exists;
3. success/remedy phrases that might be read as guaranteed mechanics;
4. onboarding “Workbench unlocks Tier 1 crafting + repair” phrasing;
5. progression prerequisite wording.

## A-ART-01 UX/presentation review

A-ART should decide:

- exact copy length;
- primary/secondary line hierarchy;
- whether success uses interaction line, toast, or component pulse;
- how auto-target preview coexists with bottom-center interaction prompt;
- how Have/Need fits the craft row without clipping;
- target focus treatment;
- responsive behavior at 1363×936 and accepted desktop viewports;
- pixel-scale readability at the approved presentation scales.

This artifact does not declare UX acceptance.

---

# 21. Non-goals

This task does not:

- modify `src/**`;
- rebalance Water/Food or other survival values;
- redesign combat;
- replace build placement preview;
- add manual consume selection;
- add manual repair selection;
- change E interaction priority;
- add a quest chain;
- change progression requirements;
- change machine production/power behavior;
- change ruin discovery/reward semantics;
- resolve ruin-builder identity or humanity relationship;
- approve gameplay semantics;
- approve final UX;
- reassign Company A work.

---

# 22. #104 acceptance self-review

| #104 acceptance criterion | Self-review |
|---|---|
| Every proposal traces to current accepted behavior or observed review evidence | **PASS** — sources are listed; baseline runtime reasons/priority/auto-targets are separated from PROPOSAL copy. |
| No new gameplay system introduced | **PASS** — no new mechanics, selection mode, quest chain, combat system, build system, or progression gate. |
| Copy distinguishes remediation from internal diagnostic identifiers | **PASS** — raw internal reason codes are mapped to player-facing remedy wording. |
| Ambiguous design choices marked PROPOSAL / needs A-GD or A-ART review | **PASS** — all new copy/presentation proposals explicitly marked PROPOSAL; every UI-state row routes to both reviews. |
| Implementation-ready support document, not self-approved UX authority | **PASS** — exact current reasons/verbs/targets/remedies provided; final authority remains A-GD/A-ART and PM routing. |
| Interaction unavailable / blocked / success | **PASS** |
| Gather | **PASS** |
| Craft requirement clarity | **PASS** — all-input Have/Need proposal included. |
| Workbench requirement | **PASS** |
| Equip / unequip | **PASS** |
| Consume | **PASS** — auto-target visibility included before manual selection. |
| Repair | **PASS** — auto-target visibility included before manual selection. |
| Building placement feedback | **PASS** — existing preview preserved. |
| Machine interaction | **PASS** |
| Ruin inspect / claim | **PASS** — canon guard preserved. |
| First-action onboarding proposal | **PASS** — one immediate cue + one visible capability condition; no fixed quest rail. |
| Progression unlock clarity | **PASS** |
| Exact E interaction target clarity | **PASS** — baseline priority recorded and unchanged. |
| Water/Food correction | **PASS** — 80→79 Water; 70→69.4 Food after one simulated minute; no rebalance proposal. |
| Combat correction | **PASS** — only feedback clarity; range/arc/miss untouched. |
| Building correction | **PASS** — no replacement system. |
| Ruin identity correction | **PASS** — no non-human/alien claim. |
| `src/**` modified | **NO** |

**B-TD-01 result:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING.  
**Next lifecycle owner:** PM-B / B-PM-01.  
**Required specialist reviews after PM-B verification:** A-GD-01 + A-ART-01.  
**Project Owner action:** NONE.
