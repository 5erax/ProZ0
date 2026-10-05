# P2-TD-002 — Living-world state-to-readability map

Task [#272](https://github.com/5erax/ProZ0/issues/272), supporting #259/#225/#242. Source baseline `main@f3208d36e22bac46a816a32bd4915de4ace2e070`, 2026-10-05. Documentation prepared under direct user authorization; no specialist identity, PM acceptance or new runtime contract is claimed. Industry from unmerged PR #266 is excluded.

## Source index and semantics

Paths below are repository-relative evidence at the pinned baseline:

- **C:** `src/content/livingworld/LivingWorldContent.ts`: CROPS, SPECIES, FORAGE, SOILS, SEASONS and facility/recipe definitions.
- **S:** `src/simulation/livingworld/LivingWorldState.ts`: validated `LivingWorldState` version 1, plot/animal/forage/station fields.
- **A:** `src/simulation/livingworld/LivingWorldAuthority.ts`: execute, step, plotStatus, forageStatus; real item exchange and rejection rules.
- **G:** `src/simulation/livingworld/PlantGrowth.ts`: derived growth/moisture view, legacy-forage fallback.
- **P:** `src/client/presentation/LivingWorldOverlay.ts`: Farm, world cues, right-click inspection, draft/state presentation.
- **L:** `src/client/localization/GameUiMessages.ts`, `UiMessages.ts`, `StatusMessages.ts`, `ContentText.ts`: current EN/VI text.
- **V:** `src/client/presentation/LivingWorldArt.ts`: visual stage/juvenile/corpse selection.
- **Save:** `src/integration/Phase1SaveV2Composer.ts`, `src/persistence/schema/v2/PortableSaveBundleV2.ts`, `src/persistence/portable/PortableSaveV2.ts`.

Classification is per row: VERIFIED_CURRENT, IMPLEMENTED_BUT_UNCLEAR, PRESENTATION_GAP, COPY/I18N_GAP, UNKNOWN/UNVERIFIED, OUT_OF_SCOPE. Code traceability is not a novice-understanding verdict.

World arrays are persisted world state; `owner` constrains actions, not a private visual copy. The inventory is player-specific; shared world ownership must not be confused with permission for anyone to harvest. Derived art/screen positions are not saved. Active authority ticks drive growth, care, breeding and regrowth; elapsed wall time while closed supplies no yield. Full solo living-world presentation is wired through `Phase1ProductReviewRuntime.ts`; hosted `ColonyCoopRuntime.ts` has the legacy farming/animal interfaces, not an evidenced copy of this complete living-world overlay. Every hosted parity row remains UNKNOWN/UNVERIFIED until tested against its actual aggregate/protocol.

## State map

All rows use the mandatory schema; source aliases resolve above. `world/owned` means shared world data with owner-gated mutation; `bag` means private inventory. “Saved” refers to authority state, not a countdown label.

| SYSTEM | AUTHORITY/CONTENT ID | CURRENT STATE FIELD | PLAYER MEANING | SHARED/PRIVATE | PERSISTENCE | ALLOWED UI COPY | ICON/STATE NEED | BLOCKED REASON | CURRENT CONSUMER | EVIDENCE | KNOWN LIMIT | NEXT OWNER |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Seed eligibility — VERIFIED_CURRENT | grain/root/flax/herb; respective C seed IDs | inventory stacks, plot.crop | Have seed; empty plot may accept it | bag + world/owned | Saved inventory/plot | `seed` count; `empty` | Stable crop/seed identity | UNKNOWN_CROP, CLEAR_PLOT_FIRST, missing input | Farm seed choices | C/A plant, P choices | Disabled count is not full command eligibility | #259 UI consumer |
| Tilling — VERIFIED_CURRENT | action:till; item:field-hoe | position, plots, actor | Prepare eligible ground | world/owned + bag | Saved plot | Soil tilled / Đã làm đất (candidate; retain current status key) | Empty tilled tile | FIELD_HOE_REQUIRED and authority placement/capacity reasons | Farm/actions | A till | Do not invent universal soil prohibition | #259 gameplay/UI consumer |
| Planting — VERIFIED_CURRENT | action:plant, crop ID | crop, progress=0, dead=false | Seed paid; crop begins | world/owned + bag | Saved | Planted / Đã gieo (candidate) | Early crop | NOT_OWNER, OUT_OF_RANGE, CLEAR_PLOT_FIRST | Farm | A plant, S | Existing UI choice can become stale before commit | UI/QA |
| Growth — IMPLEMENTED_BUT_UNCLEAR | crop.cycleTicks | progress, moisture, fertility | Fraction of active growth completed | world/owned | Saved inputs; derived status | `growing`; next stage estimate from plotStatus | Early/growing/mature | No water pauses growth; season/soil modify rate | Farm + inspection/world sprite | A plotStatus/step, G | ETA is conditional, not guaranteed real-time deadline | UI/copy |
| Plot water — VERIFIED_CURRENT | action:water | moisture 0..10000, dryTicks | Can water with can and clean water | world/owned + bag | Saved plot/soil | needs water / Cần nước; numeric moisture | Dry/normal/wet soil + water cue | WATERING_CAN_REQUIRED, missing clean water, SOIL_PATCH_CAPACITY | Farm/world/inspection | A water/step, G moistureState | UI dry <2500; irrigation trigger <3500: different purposes | UI/QA |
| Fertility — COPY/I18N_GAP | action:fertilize | fertility 0..3 | Compost level adds growth modifier | world/owned + bag | Saved | `soil` uses {fertility}/3 compost | Compost level, not invented yield boost | SOIL_ALREADY_FERTILE, missing compost | Farm soil line | A/C/P/L | Generic `fertility` key says percent; must not pass raw 0..3 as percent | #225 copy/UI |
| Mature harvest — VERIFIED_CURRENT | action:harvest | crop, dead, progress>=cycleTicks | Ready crop produces output and two seeds | world/owned + bag | Saved; atomic exchange | `ready` / Có thể thu hoạch | Mature distinct silhouette/check cue | NOT_READY, bag capacity, range/owner | Farm | A harvest; C yield/season | Crop harvest rejects immature crop despite derived early/growing yield view | UI/QA |
| Dry/dead plot — IMPLEMENTED_BUT_UNCLEAR | action:clear | dead, dryTicks | Dead crop must be cleared; water does not revive it | world/owned | Saved | Wilted / Héo (candidate); Clear / Dọn | Dead crop art separate from growth | NOT_READY for harvest; owner/range | Farm/world | A step dry death, clear; V dead | No separate wilt stage field; do not invent one | B-PIX proposal / UI |
| Forage renewal — VERIFIED_CURRENT | wild-*; berry-bush; transplanted roots | growth?, readyTick, cleared | Early yields none; growing may yield less; harvest resets roots | world + bag | Saved | G stage/harvestYield; Renewing / Đang tái sinh (candidate) | Regrowth stage; depleted resource distinction | RENEWING, FORAGE_MISSING, bag capacity | Farm/world | G, A forage | Legacy readyTick remains until next harvest; no past catch-up | UI/QA |
| Timber forage — VERIFIED_CURRENT | timber-tree; item:stone-field-tool | tool condition, growth | Paid harvest needs usable field tool and wears it | world + bag | Saved tool/forage | Tool required / Cần công cụ (candidate) | Tool requirement in context | TOOL_REQUIRED, RENEWING, capacity | Farm/context | A forage toolWear | Do not apply timber rule to every wild crop | UI/copy |
| Soil — VERIFIED_CURRENT | loam/sand/clay/peat/rocky | soilAt(seed,position), optional soil patches | Retention and growth differ by location | world/derived | Seed + saved moisture patches | Soil name; actual retention/growth from C | Soil colour/type + detail | Wet patch capacity where applicable | Farm/inspection | C soilAt; SoilMoisture.ts; P | SoilAt is seeded coarse field, not real-world chemistry | UI/art |
| Juvenile/adult — VERIFIED_CURRENT | SPECIES id | age vs matureSeconds*60 | Existing maturation threshold | world | Saved age | Juvenile / Con non; Adult / Trưởng thành (candidates) | Same species at .65 visual scale | Production/breeding prerequisites | Farm/inspection/world | C/S/A/V | Smaller sprite alone does not prove novice recognition | B-PIX/human review |
| Care — VERIFIED_CURRENT | action:feed | energy, thirst | One action consumes feed + clean water, replenishes both | world/owned + bag | Saved | `hungry`, `thirsty`, `care` | Food/water warning | NOT_OWNER, missing feed/water, ANIMAL_DEAD | Farm/world | A feed, P care | World warning <2500; breeding/product thresholds differ | UI/copy |
| Taming — VERIFIED_CURRENT | action:tame; tame species | pen, owner, pen capacity | Eligible animal joins owned nearby pen | world/owned + bag | Saved identity/anchor | Tame / Thuần hóa (candidate) | Wild vs owned/pen state | WILD_PREDATOR, ALREADY_TAME, BUILD_NEARBY_PEN | Farm/context | C tame, A tame | Fox/wolf not tameable; coop only chicken; no pet progression | UI/QA |
| Production — PRESENTATION_GAP | chicken egg, goat milk | sex, age, energy, thirst, productTicks, product | Product count available after authority conditions | world/owned + bag | Saved | Current product count; Collect / Thu sản phẩm (candidate) | Product-ready cue | NOT_READY, capacity/owner | Farm collect button | A step/produce, C | No general product-ready world cue or full reason breakdown verified | UI + B-PIX needs |
| Breeding — IMPLEMENTED_BUT_UNCLEAR | SPECIES breedSeconds | breedTick, sex, age, energy/thirst, nearby mate | Conditional active-time reproduction exists | world | Saved parent/child/cooldown | Candidate: breeding conditions not met / Chưa đủ điều kiện sinh sản | Optional detail only | Sex/maturity/care/mate/population caps | Authority; no full status UI found | A step mating/birth | No player-issued breed action; do not promise a baby countdown | UI/gameplay review |
| Shearing — IMPLEMENTED_BUT_UNCLEAR | action:shear, goat | age, shearTick | Mature goat can yield wool on cooldown | world/owned + bag | Saved cooldown | Shear / Xén lông (candidate) | Context readiness | NOT_READY, capacity/owner | Farm | A shear | NOT_READY conflates species/maturity/cooldown | UI/copy |
| Hunt/corpse/loot — VERIFIED_CURRENT | action:hunt/loot, species | health, huntCooldowns, corpse | Hunt is separate from tame; corpse loot paid atomically | world + bag | Saved corpse/cooldown | Corpse / Xác; Loot / Lấy vật phẩm (candidates) | Species corpse silhouette | STILL_ALIVE, COOLDOWN, HUNT_AUTHORITY_UNAVAILABLE, bag capacity | World/Farm/inspection | A hunt/loot; LivingHuntEquipment test | Meat per C; hide+bone; corpse stays if exchange fails | UI/QA |
| Irrigation/greenhouse — VERIFIED_CURRENT | irrigation-tank, greenhouse | station.water; facility proximity | Finite tank water; greenhouse affects evaporation/winter growth | world/owned | Saved stations/facilities | Reservoir count; protection detail | Reservoir/protection detail | TANK_FULL, TANK_REQUIRED, missing water | Farm/facilities | A step/fill, C | Not Phase-3 Industry greenhouse; no offline production | UI/QA |
| Hosted full parity — UNKNOWN/UNVERIFIED | complete LivingWorldState | not established in full hosted UI | Cannot certify all solo cues in co-op | Unknown subset | Existing hosted save, scope-specific | Label tested subset only | No invented remote animals/crops | Protocol/UI support not evidenced | ColonyCoopRuntime legacy interfaces | Runtime comparison | Do not claim solo sheet proves co-op art/state parity | PM-A runtime decision |
| Offline yield/new care rules — OUT_OF_SCOPE | none | none | No supported new rule | — | — | No offline timer/yield claim | None | Not implemented/authorized | None | Scope #272 | Do not turn copy guidance into balance | Separate task |

## Stable EN/VI copy identity

Current installed `GameUiMessages` keys: `seed`, `soil`, `empty`, `growing`, `ready`, `hungry`, `thirsty`, `fed`, `care`; their content parameters must resolve through existing crop/species/item IDs. Do not add duplicated free-form labels per screen. `soil` reports moisture percent and fertility **/3 compost**, whereas `fertility` is a generic percent string; derive the correct unit deliberately.

Candidate detail meanings above are review input, not newly registered localization IDs. Before adding a key, search current `UiMessages`/`StatusMessages`/`ContentText` for its semantic identity, then centralize all consumers. A `NOT_READY` message needs context-specific detail backed by the exact action, not fabricated cooldown or yield. Capacity errors should say store items and retry, with harvest/corpse preserved only where atomic rejection confirms it. Missing inputs should name the actual catalog item. A stale revision means refresh/retry, not consume another seed silently.

## QA handoff

QA-01: four crop seed choices, zero/one seed, empty/occupied plot, stale inventory: correct disabled/count/real rejection; no unpaid plant.

QA-02: planted→growing→mature; dry→paused→dead→clear. Compare P display to A state and G view. Save/reopen each boundary; no offline advance or invented deadline.

QA-03: immature plot harvest rejected despite a derived intermediate yield. Mature plot yields actual season-adjusted crop output plus two seeds; full bag keeps plot state and rewards unclaimed.

QA-04: growing forage lower yield versus mature forage; legacy readyTick and newly transplanted roots; depleted clay/salt presentation. Capacity failure preserves forage/tool.

QA-05: tame eligible species near owned pen; fox/wolf rejection; feed consumes both feed/water; product, breeding and shear conditions use their own thresholds. Save children/anchors/cooldowns without inventing a manual breeding action.

QA-06: hunt then loot with sufficient/full bag; death/corpse visibility, cooldown, item wear and exactly one committed loot.

QA-07: VI/EN key/units parity; keyboard Farm/inspection; no private inventory exposed to another player. Hosted claims need separate real hosted scenarios.

Existing coverage to consume: `tests/unit/living-world.test.ts`, `living-world-relocation.test.ts`, `tests/integration/living-world-save.test.ts`, `living-hunt-equipment.test.ts`, `tests/e2e/living-world.spec.ts`, `living-roots.spec.ts`, `living-hunt.spec.ts`. Their presence is source evidence, not a new execution verdict in this docs-only delivery. #199 retains real novice evidence, #187 Owner acceptance. PM-B reviews this map, then routes UI/copy/art needs through the actual consumer owners.
