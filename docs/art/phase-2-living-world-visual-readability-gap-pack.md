# P2-PIX-001 — Living-world visual readability gap pack

Task [#271](https://github.com/5erax/ProZ0/issues/271), consumers #242/#259. Source baseline `main@f3208d36e22bac46a816a32bd4915de4ace2e070`, reviewed 2026-10-05. Direct user-authorized documentation audit; no specialist identity, production approval or human acceptance is claimed. No replacement assets are produced. Unmerged PR #266 Industry art is outside this audit.

## Evidence and audit limits

Primary source: `src/client/presentation/LivingWorldArt.ts`, `LivingWorldOverlay.ts`, `LivingMotion.ts`, `WorldDepth.ts`, `Phase1ProductionAssets.ts`; current authority meanings are traced in the [state map](../technical/phase-2-living-world-state-readability-map.md).

A static contact sheet was rendered directly from baseline `LivingWorldArt.ts`, at viewports 640×360 and 1280×720 in EN/VI, with authored dimensions displayed at 2× for inspection. The four full-page sheets and `capture.json` are delivered in the companion output evidence pack. They show current source art, not a captured playable viewport, multiplayer scene, performance sample or a before/after production change. No original Owner screenshot is available in this task workspace; its historical hash is not a commit identity. Never label these sheets as supplied Owner evidence.

Visual inspection of the 1280 VI sheet confirms distinct adult species forms and differences among mature crops/minerals. It also confirms a shared three-sprout early crop form, flattened reused adult corpse art, and very similar early/mid herb appearance. These are bounded polish findings. Gameplay fog/depth/camera correctness cannot be accepted from a sheet; inspect existing regression sources and retain a gameplay/human gate.

## Dimensions, pivot, bounds and shadow

Living sprites use a **64×64 authored SVG viewBox**, with crisp edges, scaled to role-specific world-stage CSS boxes; these are code-native pixel shapes, not imported 64-pixel raster cells. Adult boxes: chicken 22×23, rabbit 24×25, goat 40×40, boar 42×30, fox 40×28, wolf 48×37. Juveniles round each dimension at .65×. Crop boxes generally 34×34; empty tilled plot 40×22; berry bush 42×38; clay 40×26; salt 34×29; transplanted tree 40×50; fiber/food transplant 32×32.

Overlay root/foot anchor: horizontal centre; vertical 50/64 of art height, including extra hit-area padding and current mountain-height adjustment. Hit box minimum 24×24; interaction distance comes from authority, not art. Shared diamond shadow is inside SVG (`opacity .45`), and full SVG bounds include transparent padding. Thus CSS box dimensions are not anatomical body dimensions: compare rendered figures, not width alone. Pioneer reference in source is 32×48. Do not change collision to make an enlarged asset fit.

## Audit matrix

| VISUAL TARGET | CURRENT SOURCE/ASSET | CURRENT STATE | REQUIRED SILHOUETTE/STATE | SCALE/PIVOT | ISSUE | SEVERITY | EXACT FOLLOW-UP ASSET IF ANY | IMPLEMENTATION CONSUMER | ACCEPTANCE VIEW |
|---|---|---|---|---|---|---|---|---|---|
| Chicken | LivingWorldArt animals.chicken | Adult/juvenile/corpse exist | Comb, beak, tail, small feet | 22×23; .65 juvenile; foot 50/64 | PASS source anatomy; corpse POLISH | P2 | Candidate corpse-chicken pose, only if activated | Existing livingArt animal branch | Adult beside pioneer; corpse remains identifiable |
| Rabbit | animals.rabbit | Three states | Long ears, hind leg, short tail | 24×25 | PASS anatomy; corpse POLISH | P2 | Candidate corpse-rabbit pose | Same branch | Small viewport with goat alongside |
| Goat | animals.goat | Three states | Horns, beard, hooves/four legs | 40×40 | PASS adult; HUMAN_REVIEW_REQUIRED scale | P2 | None established | Same branch | Adult/juvenile/pioneer contact and world view |
| Boar | animals.boar | Three states | Heavy low body, tusk, bristles | 42×30 | PASS adult; corpse POLISH | P2 | Candidate corpse-boar pose | Same branch | Distinct from goat without label |
| Fox | animals.fox | Three states | Pointed face, pale tail tip, slender body | 40×28 | PASS source distinction | P2 | None established | Same branch | Fox/wolf at equal scene zoom |
| Wolf | animals.wolf | Three states | Taller shoulder/body/legs than fox | 48×37 | PASS source distinction; human recognition pending | P2 | None established | Same branch | Predator pair and pioneer |
| Grain | plant grain/default branch | 0/.5/1 thresholds | Seedling/stems/heads | 34×34; shared root | POLISH early species recognition | P2 | Candidate grain-specific early sprout | Existing stage branch, no new state | Early grain vs flax without labels |
| Flax | plant flax/wild-flax | Mature blue flowers; thin branching stems | Distinct leaves/flowers | 34×34 | PASS mature; POLISH shared early | P2 | Candidate flax-specific early sprout | Existing branch | Mature/early crop strip |
| Root crop | plant root | Low leaves; mature exposed roots | Low rosette; visible roots | 34×34 | PASS mature; POLISH early | P2 | Candidate low root seedling | Existing branch | Compare root/herb at .5/1 |
| Herb | plant herb/wild-herbs | Leaves; flowers only mature | Branch/flower difference; growing state | 34×34 | POLISH early/mid distinction | P2 | Candidate growing herb density; no new growth stage | Existing .5 stage | .0/.5/1 labelled then label-hidden |
| Berry bush | berry-bush branch | Small root, mid scaled foliage, mature berries | Wood/leaf mass; berries absent on renewal | 42×38 | PASS implemented stages | P2 | None established | Forage growth caller | Harvest→renewal; no false ready fruit |
| Wild grass | grass(stage,variant) | Six stable variants; stage-dependent blades | Natural low grass, not crop heads | 34×34 | PASS source variation | P2 | None | Existing stable-ID variant | Dense forage plus animals; cue budget |
| Clay/salt | mineral branches | Clay layered mass; salt edged crystals | Deposited/available vs renewing distinction | 40×26 / 34×29 | PASS identity; IMPLEMENTATION_ONLY renewal needs inspection | P1 | None until depleted-view review | Overlay dead/readyTick caller | Actual depletion then active renewal |
| Dead crop | plant dead branch | Shared brown stalks | Clearly dead vs harvest-ready | 34×34 | POLISH species lost; no distinct wilt field | P2 | Candidate per-crop dead forms only if approved | Existing dead crop branch | Dead beside growing; use authority dead flag |
| Product-ready animal | Art has species/age/dead, no product argument | Panel exposes count; no dedicated world product pose | Optional subtle ready cue with exact product state | Same foot; no hit growth | IMPLEMENTATION_ONLY | P1 | No new species sprite required; cue icon candidate only | UI consumer after state-map review | Eggs/milk actual count, full bag, save |
| Buildings/facilities | Phase1ProductionAssets + existing expedition presentation | Existing atlas and facility forms | Recognizable installed role relative to actor | Per-atlas cell geometry; not LivingArt dimensions | HUMAN_REVIEW_REQUIRED current world composition | P1 | No exact missing approved asset identified | Existing building/expedition UI | Full-base scene at actual scale |
| Crafted items | itemIconSprite/production frame | Raster frames plus code-native 24×24 icons | Tool/material distinction; icon not world building | Existing frame geometry | HUMAN_REVIEW_REQUIRED cross-system style | P2 | No replacement backlog inferred | Inventory/craft/context | Equipped actor + inventory EN/VI |
| Camera/depth | Overlay canonical stage + WorldDepth | Common raster origin; foot depth; motion samples | No static drift, atomic camera transform | World foot coordinates | IMPLEMENTATION_ONLY verification, no missing art | P1 | None | Renderer/overlay owner | Four directions/diagonal/DPR1/2/resize |
| Fog/budget | Overlay worldPositionKnown, range16, max64 | Animal→plot→forage priority; unknown excluded | Visible wildlife, no fog leak | Culling margins -48..688/-48..408 | IMPLEMENTATION_ONLY verification | P1 | None | Overlay/QA | Dense grass + six animals + frontier |
| HUD/Farm VI/EN | World-first main UI + GameUiMessages | Current physical panels, crop/care cards | Readable buttons, units, focus, preserved scroll | Actual viewport, no screenshot scaling claims | HUMAN_REVIEW_REQUIRED compact stress | P1 | None | UI/localization | 640×360 and 1280×720 actual game panels |
| Solo/co-op | Solo overlay vs ColonyCoopRuntime legacy UI | Shared art catalogue not full living-state parity | Same supported species/state where wired | Compare equivalent supported state | IMPLEMENTATION_ONLY / UNVERIFIED parity | P1 | None | PM-A-selected hosted/UI owner | Two real clients; no solo-fixture substitution |

`P1/P2` severity denotes follow-up priority in this audit, not new issue ownership. PASS above means adequate source distinction, not final art approval. No `MISSING_ASSET` is asserted where a current form already exists; proposed corpse/seedling polish needs PM-B activation before production.

## Motion, fog and presentation findings

The earlier screen-space 50-ms anchoring problem is addressed in current source: marker container mounts to `.p1-product-world-stage`, uses its raster origin and common projection, and uses foot-based WorldDepth. Nodes persist by ID; art is cached. Animals interpolate independently through `LivingMotion`, reset on changed anchor, nonmoving state or displacement >2; visual samples are never saved to authority. Do not recreate that already-delivered runtime fix under this art task.

Current cap is 64 visible markers within 16 world units, prioritized animals before plots before forage. It reduces starvation but cannot guarantee every species is present in every seed/view. Fog leakage must be tested through actual exploration knowledge, not solved by showing more hidden animals. Static art sheets reveal neither drift nor depth ordering failures. Existing source tests: `tests/unit/living-motion.test.ts`, `tests/browser/living-art.browser.test.ts`, `tests/e2e/living-world-camera.spec.ts`, `tests/e2e/phase2-frame-pacing.spec.ts`. Their presence is source evidence, not a new execution verdict. Do not infer Windows/Internet/human results from Linux CI.

## Bounded follow-up and acceptance views

Candidate production pack A: species-specific corpse poses for chicken/rabbit/boar first, retaining present IDs, foot pivot, dimensions and loot semantics. Candidate pack B: four crop-specific early silhouettes, plus a clearer mid-stage herb. Both are **POLISH**, require separate activation/review, and must not add new species, stages or items. No asset is produced in this task.

Implementation pack C: actual product-ready/capacity/renewal cues from the state map, without art replacement. Runtime owner is assigned by PM-A after accepting the support split. Current building/crafted-item consistency gets a representative in-game review before any replacement is proposed.

Required acceptance captures: actual 640×360 and 1280×720 game; EN/VI Farm/inspection with long names; dense vegetation plus wildlife; juvenile/adult/corpse; all crop stages; dry/dead/renewal; four directions and diagonals, DPR1/2, resize/fullscreen; skin/equipment; fog-edge and cave/portal changes; equivalent supported hosted state. Record exact head, seed, scene setup, natural vs fixture and locale. Baseline→candidate screenshots are needed only when follow-up changes exist; this audit has no after implementation to claim.

Retain existing ≥50 FPS / P95≤34 ms gate on full scene with rain. The static sheet has no FPS claim. A-ART and human/Owner review remain required for actual recognizability/polish. #242/#187 remain open; #199 retains novice understanding evidence. PM-B reviews exact missing-versus-wiring findings before dispatching any asset production.
