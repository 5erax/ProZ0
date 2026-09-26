# Phase 1 HUD / Panel Readability Mockups

**TASK:** P1-UXSUP-002 / #105  
**ROLE:** B-PIX-01 / PIXEL_ARTIST_ANIMATOR / COMPANY_B  
**BASELINE AT ACTIVATION:** `7a566d29b631f24b608f6661267be2ed786f265f`  
**STATUS:** PROPOSAL ONLY — A-ART-01 retains final visual / UX authority.

---

## 1. Scope

This pack is a bounded readability proposal for the accepted Phase 1 presentation. It does not replace production assets, does not modify `src/**`, does not invent gameplay states, and does not claim final UX acceptance.

Focus is limited to the confirmed #105 findings:

- survival HUD overlap / cropping at 1363×936;
- Water / Food / Stamina / Temperature readability;
- survival HUD versus Controls/help collision;
- crafting row visibility for full Have/Need plus Workbench dependency;
- interaction prompt clarity for exact current verb + target;
- equipment/use feedback consistency between key, verb, item, and active-equipment state;
- pixel readability at 1× / 2× / 3×.

Every mockup below is explicitly marked **PROPOSAL**.

---

## 2. Visual-language constraints to preserve

The proposals preserve the accepted Phase 1 pixel presentation and reuse the existing semantic families rather than introducing a new HUD language.

Required constraints:

- whole-pixel layout;
- nearest-neighbor presentation;
- important distinctions must survive value/grayscale inspection and must not rely on hue alone;
- existing icon/panel language remains the visual source;
- no new gameplay authority is encoded by presentation;
- no production `assets/phase1/**` replacement.

---

## 3. Readability scale intent

The accepted pixel-art readability gates remain:

- **1×:** authored/native presentation;
- **2×:** exact integer upscale;
- **3×:** exact integer upscale.

For the confirmed **1363×936** problem, the proposal treats the authored HUD frame as the authority boundary. HUD elements must remain inside that frame and must not rely on extra browser/window gutter to avoid overlap.

---

## 4. Current problem summary

### Finding A — survival HUD overlap / cropping
At the reviewed 1363×936 viewport, the survival block can become cramped or visually collide with neighboring presentation.

### Finding B — core survival-state scan cost
Water, Food, Stamina, and Temperature need stronger one-glance separation without changing their semantics.

### Finding C — survival HUD versus Controls/help
Survival-critical information and lower-priority help text should not occupy the same visual lane.

### Finding D — crafting requirement truncation
A craft row needs enough room to show the complete Have/Need relationship and whether Workbench access is required.

### Finding E — interaction prompt ambiguity
The current action must show both the exact verb and exact target at the same time.

### Finding F — equipment/use contradiction risk
Key label, action verb, target item, and active-equipment state must not visually disagree.

---

## 5. PROPOSAL A — Survival HUD safe lane

**Trace:** Findings A, B, C.

Keep the survival block in a dedicated safe lane, with one row per approved survival category.

```text
+----------------------------------------------+
| [icon] WATER        [value/state] [bar]      |
| [icon] FOOD         [value/state] [bar]      |
| [icon] STAMINA      [value/state] [bar]      |
| [icon] TEMPERATURE  [value/state] [alert]    |
+----------------------------------------------+
```

### Presentation rules

- use icon + short text label together;
- keep row height stable so one warning does not push another row out of bounds;
- reserve a fixed alert position rather than injecting warning text into the value area;
- keep Temperature readable as a state even when its runtime representation differs from Water/Food/Stamina;
- do not communicate critical state only through color.

### Comparison note

This proposal changes information spacing and hierarchy only. It does not add new survival states, rates, or gameplay thresholds.

---

## 6. PROPOSAL B — Controls/help separation

**Trace:** Finding C.

Move Controls/help into a distinct lower-priority panel region rather than sharing the survival HUD lane.

```text
+-----------------------------+
| CONTROLS / HELP             |
| [key] current help action   |
| [key] secondary help action |
+-----------------------------+
```

### Presentation rules

- survival information keeps stronger visual priority;
- help panel uses the accepted panel language but lower emphasis;
- contextual help may change content, but its bounding region should remain predictable;
- the proposal does not define new input bindings.

---

## 7. PROPOSAL C — Craft row with full Have / Need + Workbench dependency

**Trace:** Finding D.

A selected recipe row should answer three questions in one scan:

1. what is being crafted;
2. what inputs are owned versus required;
3. whether Workbench access is required.

```text
+----------------------------------------------------------------+
| [item icon] ITEM NAME                    [WORKBENCH REQUIRED]    |
|----------------------------------------------------------------|
| [input] INPUT NAME      Have: <runtime> / Need: <runtime>       |
| [input] INPUT NAME      Have: <runtime> / Need: <runtime>       |
|----------------------------------------------------------------|
| [READY / BLOCKED presentation from authoritative runtime state] |
+----------------------------------------------------------------+
```

### Presentation rules

- `Have` and `Need` use fixed columns;
- Workbench dependency remains visible even when ingredient rows are long;
- blocker distinction uses word/shape/value support, not hue only;
- values are runtime-bound placeholders in this mockup and are not authored gameplay values.

### Comparison note

This proposal specifically prevents the craft row from hiding required inputs or making a missing Workbench look like a missing material.

---

## 8. PROPOSAL D — Exact verb + target interaction prompt

**Trace:** Finding E.

The primary interaction line always includes:

- input key;
- exact current verb;
- exact current target.

```text
+--------------------------------------------------+
| [KEY]  VERB  ->  TARGET                          |
| optional authoritative reason / next-step line   |
+--------------------------------------------------+
```

Examples of structure only:

```text
[KEY] INSPECT -> <current target>
[KEY] GATHER  -> <current target>
[KEY] USE     -> <current target>
```

The examples demonstrate formatting, not a new interaction list.

### Presentation rules

- verb and target remain on the same primary line;
- unavailable/blocked reason appears as a subordinate line;
- reason text must come from authoritative gameplay/UI semantics, not from this mockup;
- no new verbs or interaction states are introduced.

---

## 9. PROPOSAL E — Equipment / use consistency strip

**Trace:** Finding F.

When an action depends on equipment state, the presentation should expose the active equipment and the current action together.

```text
+--------------------------------------------------------------+
| ACTIVE: <authoritative equipped item>                        |
| [KEY] <authoritative verb> -> <authoritative target>         |
+--------------------------------------------------------------+
```

If the action is blocked by equipment state:

```text
+--------------------------------------------------------------+
| ACTIVE: <authoritative equipped item>                        |
| <authoritative blocked reason / remedy>                      |
+--------------------------------------------------------------+
```

### Presentation rules

- never show a key/action combination implying use of a different item than the active equipment state;
- item name, verb, target, and key are rendered from the same current state snapshot;
- mockup does not define equip rules or automatic switching.

---

## 10. PROPOSAL F — 1× / 2× / 3× readability checks

**Trace:** all findings.

### 1×
Must preserve:

- survival icon silhouette;
- short status labels;
- interaction verb + target;
- craft Have/Need labels;
- equipment-state text without clipping.

### 2×
Must preserve:

- exact nearest-neighbor pixels;
- stable panel borders and separators;
- readable status bars and warning shapes;
- no new overlap at the confirmed desktop review scale.

### 3×
Must preserve:

- same hierarchy and relative spacing;
- no fractional positioning or interpolation;
- no new line-wrap behavior that changes meaning.

### 1363×936 review check

Validate:

- survival rows are fully visible;
- Controls/help does not overlap survival HUD;
- interaction prompt remains inside its intended safe region;
- craft requirement columns do not truncate Have/Need or Workbench dependency;
- equipment/use text does not contradict the active-equipment state.

---

## 11. Decision points for A-ART-01

A-ART-01 should approve/reject the following presentation choices:

1. dedicated survival safe lane;
2. separate lower-priority Controls/help region;
3. fixed-column Have/Need recipe presentation;
4. persistent Workbench dependency label placement;
5. verb + target interaction-line hierarchy;
6. active-equipment consistency strip;
7. spacing and emphasis at 1× / 2× / 3×.

B-PIX-01 does not claim final UX acceptance.

If approved, any runtime/layout implementation remains downstream under Company A ownership.

---

## 12. Self-review

- [x] Every mockup is labeled **PROPOSAL**.
- [x] Every mockup traces to a specific #105 reviewed finding.
- [x] No production `assets/phase1/**` replacement.
- [x] No `src/**` change.
- [x] No new gameplay state or threshold.
- [x] No wholesale HUD redesign.
- [x] No Phase 2 visual work.
- [x] 1× / 2× / 3× readability intent documented.
- [x] Final visual / UX authority remains A-ART-01.

---

## 13. Handoff

**Exact artifact path:**  
`docs/uiux/phase-1-hud-panel-readability-mockups.md`

**Recommended route:**  
B-PIX-01 → PM-B verification → A-ART-01 visual/UX review → A-GE-01 implementation only if approved by Company A.

**PROJECT_OWNER_ACTION:** NONE.
