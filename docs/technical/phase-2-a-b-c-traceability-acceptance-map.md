# Phase 2 A+B+C — AS-BUILT Traceability & Acceptance Map

**Current checkpoint, 2026-10-04:** the historical baseline/dispatch below is superseded for current implementation by main `f3208d3` (PR #265) and the [Company B completion handoff](../company-b-phase2-phase3-handoff.vi.md). It records current solo world/growth/equipment/caves/UI, the storage-safe profession correction, hosted validation and the separate Phase 3 candidate. Historical specialist review/lock records remain historical; this direct Owner-authorized update does not impersonate B-TD, PM-B, QA or final acceptance.

**Task / Source Issue:** #165 / P2-TD-001  
**Authoring member:** B-TD-01 / TECHNICAL_DESIGNER / COMPANY_B  
**Coordinating PM / lock:** B-PM-01 / PM-B / `PMB-P2-TD-001-R3`  
**Status:** IMPLEMENTATION_COMPLETE / PM-B REVIEW PENDING  
**Current-main anchor:** `05491d17a088f0bd74fbb43e7260924b3e92801f`  
**Scope:** documentation-only AS-BUILT reconciliation. No `src/**`, schema, save, network, gameplay or lifecycle mutation.

## 1. Purpose

This artifact is the current-main index for Owner-selected Phase 2 A+B+C. It does not recreate the obsolete pre-implementation Wave-0 design sequence. It records:

`scope -> source authority -> implementation actually present on current main -> evidence -> save/persistence -> hosted/private/shared semantics -> presentation -> known limits -> QA status -> Owner decision status -> next action`.

Historical Issue completion is preserved as lineage/evidence. Later merged rework and release behavior wins where it changed player-facing truth.

Technical integration, automated QA, browser smoke and production release evidence are not Project Owner acceptance. #199 and #187 remain independent open truth gates.

## 2. Current-main identity and evidence sources

Fresh-read baseline:

- `main == 05491d17a088f0bd74fbb43e7260924b3e92801f`.
- #165: `IN_PROGRESS — AS-BUILT TRACEABILITY RECONCILIATION`, lock `PMB-P2-TD-001-R3`.
- PM-B Source Pack R1: #165 comment `5930249121`.
- PM-B dispatch: #165 comment `5930880003`.
- #67: current cross-company release/coordination evidence.
- #199: OPEN / IN_PROGRESS; genuine 3–5 novice evidence absent and Windows performance concern retained.
- #187: OPEN / `PUBLISHED REWORK — ACTUAL OWNER DECISION PENDING`.

Current source documents at the current-main anchor:

| Source | Current blob | Role in this map |
|---|---|---|
| `docs/phase-2-colony-depth-plan.md` | `301ba558323e71b6e0aa20e6261f3fca2331f81b` | Owner-authorized Phase 2 product outcome and original #168–#187 execution lineage. |
| `docs/phase-2-feedback-and-upgrades.md` | `8f04eb281b1c07b6ea3929a9da8d57ae3d7f0c75` | Owner REQUEST CHANGES rework truth after first published candidate. |
| `docs/phase-2-priority-upgrades.md` | `7fa92c242608c1c770bb2c0a08dfa26ff2bb3ecd` | Current exploration/visual/private-co-op implementation and explicit pilot limits. |
| `docs/player-lobby-and-accounts.md` | `24050bac9a1422ad6873a6906016ef304f842412` | Current public account/lobby/named-room behavior and storage/security boundaries. |
| `docs/phase-2-player-guide.md` | `d6fe144c7c5baab26342dc3ec7036962d8f221bf` | Current player-facing colony semantics and compatibility boundaries. |

Implementation/release lineage used:

- PR #188 / main `c13642d...`: initial A+B+C technical integration; historical hosted-eight validation.
- PR #193 / main `afb68c7...`: Owner-feedback rework — settings/HUD, generation-v4 resource ecosystem, storage discoverability, marsh/tree presentation.
- PR #200 / main `0968d0a...`: priority upgrades — natural landmarks, coherent atlas, shallow channels, storage UX, private co-op pilot.
- PR #203 / current main `05491d17...`: lobby, accounts, named private rooms, stable account-bound colonist identity, current production release.

Current implementation paths sampled directly on current main include:

- `src/content/phase2/ColonyDepthContent.ts`
- `src/simulation/colony/ColonyDepthAuthority.ts`
- `src/world/phase2/ColonyRegions.ts`
- `src/persistence/migrations/ColonyEcosystemUpgrade.ts`
- `src/integration/Phase1SaveV2Composer.ts`
- `src/integration/Phase1HostedAuthorityComposition.ts`
- `src/server/pilot/RedisColonyPilot.ts`
- `src/server/pilot/LobbyAccounts.ts`
- `src/server/pilot/LobbyRooms.ts`
- `src/client/presentation/ColonyDepthOverlay.ts`

## 3. Scope lineage and acceptance interpretation

#120 selected the combined program:

- **P2-A — Colony Depth Foundation**
- **P2-B — World + Ecology Expansion**
- **P2-C — Co-op Scale + Shared Colony**

#168–#186 were subsequently implemented through Owner-authorized direct execution and recorded as `INTEGRATION_ACCEPTED`. Their DONE state is historical technical evidence, not an automatic current Owner verdict.

The current product truth also includes later Owner rework and priority upgrades. Therefore:

- #170 is world lineage; current world truth also consumes #190/#195/#197 and current implementation.
- #179 is visual lineage; current visual truth also consumes #191/#196/#201/#203.
- #175 is storage lineage; current storage UX also consumes #190/#198.
- #182 is hosted-eight **technical validation lineage**, not current production room-size policy.
- #185/#186 are historical integrated release/QA evidence; current release identity is PR #203/current main, with #199 retaining remaining QA.
- #187 remains the only actual Phase 2 Project Owner product-decision gate.

## 4. AS-BUILT A+B+C matrix

| SCOPE ITEM | SOURCE AUTHORITY | CURRENT MAIN IMPLEMENTATION | EVIDENCE | SAVE/PERSISTENCE | HOSTED/PRIVATE/SHARED | PRESENTATION | KNOWN LIMIT | QA STATUS | OWNER DECISION STATUS | NEXT ACTION |
|---|---|---|---|---|---|---|---|---|---|---|
| **A — professions / specialization** | #120; #173; player guide | Explorer, Engineer and Cultivator are authoritative profession IDs in `ColonyDepthContent`; authority validates prerequisites and one selected profession keyed by player ID. Explorer changes survey radius, Engineer storage capacity, Cultivator active crop advancement as documented. | #173 DONE; PR #188; current `ColonyDepthContent.ts` / `ColonyDepthAuthority.ts`. | Profession ownership is in ColonyDepth state and composed into Save V2 colony extension. | Profession assignment is player-keyed state inside shared colony-depth authority. Hosted replication exposes colony-depth shared aggregate, but production pilot docs do **not** claim remote profession UI parity complete. | Colony Professions panel on current client; current docs describe the three effects. | Permanent selection in current implementation; no broad profession tree. Remote professions are explicitly not claimed complete in private pilot parity. | Technical integration evidence exists. Current production remote-profession parity is LIMITED/NOT CLAIMED. | #187 OPEN — no Owner ACCEPT. | No new task. #199 validates real user understanding where relevant; #187 decides product. |
| **A — shared research** | #120; #174; player guide | Shared research IDs/costs/prerequisites are defined and authority-owned; real inventory costs and duplicate/prerequisite rejection are enforced. | #174 DONE; PR #188; current content/authority. | Research IDs persist in ColonyDepth extension and reopen with save. | `colony-depth` aggregate is shared; current production remote command interface includes research. Player inventory funding remains private inventory authority. | Research panel shows costs/status; current player guide documents Field Survey, Water Stewardship, Expanded Storage, Cultivation. | Bounded first research set only; no full tech tree. | Technical/integration and hosted command evidence exists. | #187 OPEN. | No implementation reopen. Remaining human comprehension belongs #199. |
| **A — renewable ecology / overharvest pressure** | #120; #171; player guide | Deterministic ecology pressure and renewal timing are authority state. Renewal rates differ by current biome/resource; Water Stewardship modifies recovery. | #171 DONE; PR #188; current `ColonyDepthAuthority.ts` and content. | Ecology pressure/revision/timing persist in ColonyDepth state. | Shared colony/world state; not private per-player supply state. | Ecology indicator/current region presentation in Colony Depth UI. | Active-world recovery only; no offline yield. Resource clusters remain bounded, not infinite loot. | Technical integration evidence exists. Novice balance/tuning evidence remains open. | #187 OPEN. | #199: use genuine sessions before tuning scarcity/renewal. |
| **A — storage/logistics** | #120; #175 lineage; #190/#198 current UX; player guide | Researched storage capacity uses authoritative transaction capacity; Engineer further increases effective storage. Current UI adds crate capacity pressure, consistent sorting, compatible stack action, transfer/build guidance. | #175 DONE; #190/#198 DONE; PR #188/#193/#200; current ItemCapacity/ledger/runtime/UI. | Container contents, revisions and structures are Save V2 state; save/reopen evidence exists. | Player inventories are private in hosted replication; shared crate/container aggregates remain shared authority. Production remote interface supports nearby crate transfer. | Current capacity indicator, Inventory guidance, Build storage entry, sort/stack and transfer guidance. | No conveyors, reservations or automation network. Current priority doc recommends deeper explicit selection/split/range UI later; that is proposal only. | Technical + browser/public journey evidence exists; concurrent authority protections retained. | #187 OPEN. | No new task from docs. #199 may surface usability findings. |
| **A — cultivation / husbandry depth** | #120; #176; player guide | Existing bed/pen production is affected by shared research/profession/weather/ecology in active simulation. | #176 DONE; PR #188; hosted composition exposes colony-sustenance/growth shared aggregates. | Sustenance state is persisted/reopened with world state. | Shared colony production state. Production pilot supports colony sustenance commands but does not claim every solo management screen. | Colony state/readiness presentation exists. | Existing bed/pen only; no offline growth, breeding, arbitrary placement, greenhouse or deep genetics. | Technical integration evidence exists. Human balance/ease-of-use not independently proven. | #187 OPEN. | #199 only if novice evidence touches this loop; otherwise no task. |
| **B — outer regions / generation-v4 ecosystem** | #120; #170 lineage; #190 current upgrade; player guide | Mist Marsh and Ochre Badlands remain deterministic outer regions. Explicit generation-v4 ecosystem reconstruction adds resource groves while preserving legacy identities/deltas. | #170 DONE; #190 DONE; PR #188/#193; current `ColonyRegions.ts`, `ColonyEcosystemUpgrade.ts`. | v3→v4 upgrade reconstructs and validates prior fingerprints; retains existing resource states and initializes only new nodes. First successful save commits upgraded generation. | Shared world generation/state in hosted rooms; no client-side generation authority. | Current region palettes/resources/HUD guidance. | **Generation-v2 migration remains unsupported.** V3 worlds in Phase 1 retain v3 until entering Colony mode. | Determinism/migration/browser evidence exists. | #187 OPEN. | Preserve generation-v2 as disclosed limitation; do not infer migration guarantee. |
| **B — natural landmarks / observed journal** | #178 lineage; #195 current expansion; priority upgrades | Current survey-site set includes Marsh Relay, Weathered Array, Windfall Grove, Clear Spring and Exposed Seam. Inspection records only discovered/observed information. | #178 DONE; #195 DONE; PR #188/#200; current `ColonyRegions.ts` / journal presentation. | Inspected/discovered observation state persists in colony extension. | Shared discovery/colony knowledge; no hidden site coordinates are granted. | Journal lists discovered sites and observed/unresolved text. | No hidden-world reveal, truth inference, GPS route or quest rail. | Technical/browser evidence exists. | #187 OPEN. | No task unless #199/Owner identifies a concrete discovery/readability defect. |
| **B — regional weather / exposure** | #172; player guide | Recurring `mist-rain` / `dry-wind` region weather changes exposure and colony effects through authority time. | #172 DONE; PR #188; current region/weather functions. | Environment/authority tick state participates in coherent save/reopen boundary; no offline simulation claim. | Shared world/environment state. | Weather/region bar and warnings; regional ambience after gesture. | No universal weather schedule reveal; no new physical water simulation from weather visuals. | Technical + full-scene weather evidence exists. | #187 OPEN. | #199 retains only current human/performance disposition, not weather design reopening. |
| **B — shallow wetland channels / physical landscape** | #197; priority upgrades | Deterministic shallow channels are traversable at 70% speed; new construction requires dry ground. Existing foundations remain accessible. | #197 DONE; PR #200; current world/collision/region implementation. | Content version migration retains generation-v4 terrain/entity identities and world deltas. | Shared world collision/build authority. | Authored wetland/terrain visuals. | No digging, terraforming, deep-water swimming. Legacy Phase 1 water collision unchanged. | Technical/browser/determinism evidence exists. | #187 OPEN. | No new task. |
| **B — current pixel/world presentation** | #179 lineage; #191/#196 rework; #201/#203 current launcher/skin presentation | Current presentation includes revised marsh/tree silhouettes, coherent region/resource/landmark atlas, facility presentation, three colonist palette variants, lobby and arrival flow. | #179/#191/#196/#201 DONE; PR #188/#193/#200/#203. | World visuals derive from persisted world/content state. Skin choice persists remotely for account multiplayer and locally for solo device preference. | Cosmetic skin replicated in co-op; no gameplay authority transfer. | Current lobby, arrival, region silhouettes, facilities and palette variants. | Palette variants are cosmetics, not marketplace/content expansion. Full art acceptance is not inferred from technical merge. | Screenshot/browser evidence exists; Windows perf remains environment-limited. | #187 OPEN. | #199/per-Owner feedback only; do not reopen historical art Issues for documentation mismatch. |
| **B — audio consumer** | #180; player guide; `assets/phase2/audio/README.md` | Regional ambience + research/inspect/landing cues use browser gesture activation, mute and volume controls. | #180 DONE; PR #188 and current settings path. | Preference-level behavior; no new offline simulation/save gameplay semantic. | Client presentation, not shared authority. | Settings + regional ambience/action cue. | Automated playback is **not** independent human listening approval; autoplay is not bypassed. | Technical/browser activation evidence; human listening remains UNVERIFIED. | #187 OPEN. | No audio task unless concrete defect/review evidence appears. |
| **C — hosted-eight technical capacity (historical)** | #182; original colony-depth plan | Generic hosted composition supports configured 2–8 players; #182 validated eight authoritative clients, shared research, identity, stale/duplicate handling, reconnect and checkpoint reconstruction. | #182 DONE; PR #188 hosted/e2e evidence. | Hosted save/reopen/reconnect were validated technically for the test composition. | This is **technical validation only**. It is **not** current production room-size policy. | Test/evidence path; Pages at that point was solo. | Do not label production as eight-player. | Historical technical PASS. | #187 still OPEN. | Keep as lineage/capacity evidence only. |
| **C — production private room / three persistent seats** | Owner revised 2–3-player scope; #194/#202; #203 current release; player-lobby docs | Production creates named/password rooms with `maxPlayers: 3`. Account-bound stable colonist keys retain the same seat/identity across reconnect. | #194/#202 DONE; PR #203; current Redis pilot/LobbyRooms/LobbyAccounts; #67 release comments. | Redis durable room record stores Save V2 checkpoint, bindings, client identities/skins. Automatic checkpoint ~5 s; explicit owner save waits for acknowledgement. | Three persistent character seats per room. Room access is password-protected. Owner manages save/export/delete/name/password; guests cannot manage owner state. | Start-screen Single Player / Multiplayer / Login, room list/host/join, reconnect feedback, skins and arrival. | Free non-HA Redis; Vercel WebSockets beta/finite functions; possible reconnect. Crash can lose recent movement since last checkpoint. | Current release smoke + rotation evidence PASS for lobby/account/reconnect scope; see UNVERIFIED exact-main expedition note below. | #187 OPEN. | #199 handles remaining validation; Owner decides #187. |
| **C — shared vs private runtime state** | Hosted composition + #194/#202 docs | Current replication filters `colony-scene`, `equipment`, and player `inventory:<id>` to that player; other shared aggregates include colony-depth, colony-sustenance/growth, shared containers/world state. | Current `Phase1HostedAuthorityComposition.ts`; #194/#202 tests. | Private inventories/equipment and shared colony/world/container state are checkpointed coherently. | **Private:** character inventory/equipment/scene identity. **Shared:** research/ecology/sustenance/world/shared containers. Account/room ownership is private authorization metadata. | Client receives only allowed views; room/account UI hides password/owner tokens from guests. | This is current implementation behavior, not a new general permissions architecture. | Authority/integration/Redis tests exist. | #187 OPEN. | No schema/task invention; route any defect to existing current owner through PM. |
| **C — reconnect / lease / failover / save** | #194; #202; priority upgrades | Redis queues bridge gateways; fenced room lease elects one simulation/save authority. Resume bindings and account-bound keys recover character identity. Owner save/export/delete is gated. | Redis multi-gateway tests; production rotation journey; current Redis pilot. | Room checkpoints validate Save V2 compatibility for generation 3/4. Lease/checkpoint record increments; new-room checkpoint limit 2 MiB, legacy limit 4 MiB. | Shared-room authority with account-private identity. | Reconnect/room feedback in lobby/client. | Lease may take ~10 s to expire; free store non-HA; uncertain command is queried after reconnect and not automatically replayed. | Redis two-gateway/three-client and Vercel rotation evidence exists. | #187 OPEN. | #199 retains final acceptance evidence limits. |
| **C — production lobby/accounts** | #201/#202; player-lobby docs | Real username/password accounts, one-time recovery code, HttpOnly session, named rooms, room-password grants, three skins. | #201/#202 DONE; PR #203; current LobbyAccounts/LobbyRooms. | Account/session/profile data in Redis. Solo saves remain browser/origin-local and are not cross-device synced. Named-room metadata is separate from room world checkpoints. | Signed-in players can see room names; passwords and owner credentials are not exposed. Owner permissions are enforced server-side. | Current lobby and Settings return-to-lobby flow. | No email/social recovery; account cap 500; production shared-world cap 8; capacity errors possible. | Current account/Redis/browser tests and production smoke PASS. | #187 OPEN. | No new account feature task from this map. |
| **Cross-cutting — save/content compatibility** | #181 + #190/#197 + current docs | Save V2 composes players/inventory/world deltas plus optional colony extension. Colony content is versioned; content v1→v2 migration retains progression/inspected sites; generation v3→v4 ecosystem migration is explicit. | #181/#190/#197; PR #188/#193/#200; current composer/migration/validator. | Coherent save/reopen; malformed/future/unsupported state rejected. | Same authoritative data feeds solo and hosted checkpoint composition. | Player-facing Continue/Colony upgrade and Save action. | **Generation-v2 migration remains known limitation.** No unsupported silent rewrite. | Technical migration/reopen tests PASS. | #187 OPEN. | Keep limitation explicit until a separately authorized migration exists. |
| **Cross-cutting — performance** | #183 historical; #199 current disposition; #203 release | CI Linux full-scene gates remain `>=50 FPS`, frame P95 `<=34 ms`. Current production smoke sampled ~60 FPS. A local Windows headless movement run fell to 36.98 FPS / P95 66.6 ms. | #183; #194/#203 completion; #67 final-main verification; #199. | N/A except checkpoint/load behavior under hosted evidence. | Both solo scene and production co-op evidence exist, but environments differ. | Full scene/lobby/skins/current presentation. | No universal 60 FPS guarantee. Windows concern is **not resolved** by Linux PASS. | **ENVIRONMENT-LIMITED / OPEN in #199.** | #187 OPEN. | #199 owns remaining performance disposition/evidence. |
| **Cross-cutting — genuine novice evidence** | #199 | Optional ten-minute recording tooling exists; automated/browser sessions exist. There is no evidenced cohort of 3–5 genuine novice humans. | #199 body/comments; priority-upgrade doc. | N/A | N/A | Session metrics/export tooling only; recordings do not upload automatically. | Automated browsers are not novice participants. | **UNVERIFIED / OPEN.** | #187 OPEN. | #199: gather or explicitly disposition genuine human evidence; do not fabricate. |
| **Cross-cutting — current release identity** | #203; #67 | Current main and production lobby/account release are deployed. Pages and Vercel identities recorded against current main. | PR #203 merged at `05491d17...`; final-main CI `36809489858` PASS; CodeQL `36809489824` PASS; Pages `36809525044` PASS; Vercel deployment `dpl_CpkyVt9daywGPaTDtbfgfBcp7YFK` READY. | Published production uses current room/save/account behavior above. | Pages is solo + remote launcher; production multiplayer origin is Vercel. | Public launcher/lobby and Colony game. | A supplementary final-branch three-player gather journey timed out and is **not** counted as PASS. Production lobby smoke deliberately does not certify a natural expedition. | Release identity PASS; exact-current-main full production expedition remains UNVERIFIED as a PASS. | #187 OPEN. | #199 reconciles remaining current-product QA; then #187 Owner review. |
| **Cross-cutting — Project Owner gate** | #187 | Published current product exists; earlier candidate received REQUEST CHANGES, later rework/upgrades/release are technical delivery evidence only. | #187 current state + release handoffs. | N/A | N/A | Owner can play published current product. | No model/PM/QA may infer acceptance. | Technical evidence available; product decision pending. | **OPEN — ACTUAL OWNER DECISION PENDING.** | After #199 disposition/readiness, Owner records ACCEPT / REQUEST CHANGES / BLOCK on #187. |

## 5. Current player-facing semantics

The current-main player-facing shape supported by sources is:

### Colony depth

- Two distinct outer regions: Mist Marsh and Ochre Badlands.
- Shared colony research: Field Survey, Water Stewardship, Expanded Storage, Cultivation.
- One permanent profession choice among Explorer / Engineer / Cultivator under current implementation.
- Active-world ecology pressure/recovery; no offline yield.
- Existing cultivation bed/pen depth only; no breeding or arbitrary farming expansion.
- Better storage/capacity presentation, sort/stack action and transfer/build guidance.
- Journal records inspected observations and unresolved questions without hidden coordinates or alien-history answers.
- Current landmark families include Windfall Grove, Clear Spring and Exposed Seam in addition to earlier bounded survey sites.
- Shallow wetland channels affect movement/building; no digging/terraforming/deep-water feature is implied.

### Production multiplayer

- Single Player remains account-free.
- Multiplayer uses the Vercel origin with real accounts.
- Named/password private rooms.
- Three persistent character seats per room.
- Stable account-bound room character identity.
- Owner-only management/save/export/delete.
- Guests cannot manage owner state.
- Player inventory/equipment remain private; shared colony/world/shared-container state remains authoritative and shared.
- Production policy is **three players**, irrespective of historical #182 eight-client technical validation.

## 6. Save / persistence matrix

| State | Current persistence | Evidence/current implementation | Limit |
|---|---|---|---|
| World generation / chunks | Save V2 stores generation version, chunk fingerprints and deltas. v3→v4 ecosystem upgrade is explicit and idempotent. | #181/#190; `ColonyEcosystemUpgrade.ts`; current composer. | generation-v2 migration unsupported. |
| Colony research/professions/ecology/observations | ColonyDepth extension, versioned and validated. | #169/#171/#173/#174/#178; current authority/content. | Future/malformed/invalid prerequisite state rejects. |
| Inventory/equipment/containers | Canonical Save V2 records + revisions/ownership. | Existing Phase 1 authority + #175/#198/current composer. | No hidden transfer/duplication semantics added. |
| Sustenance bed/pen/growth | Shared colony sustenance state persists/reopens. | #176; hosted aggregate + save integration. | Active-world only; no offline growth/breeding. |
| Landscape overlay / content v1→v2 | Content migration retains progression and inspected sites without rewriting generation-v4 identities. | #197 / priority-upgrade docs. | Does not imply generation-v2 migration. |
| Solo browser world | IndexedDB/browser origin. Continue uses committed save. | player-lobby docs. | Solo saves not automatically copied to Vercel or cross-device. |
| Production private room | Redis room record contains checkpointed Save V2, resume bindings/client data. Auto checkpoint + owner explicit save. | #194/#202 current Redis pilot. | Free non-HA storage; rollback of recent movement possible after crash. |
| Account/profile/skin | Redis account/session/profile data. | #202/current LobbyAccounts. | Recovery-code only; no email/social recovery. |

## 7. Hosted / shared / private authority map

| State / capability | Shared | Private / owner-scoped | Current production interpretation |
|---|---|---|---|
| World/chunks/weather/ecology | YES | No client authority | One room authority simulates canonical world. |
| Colony research | YES | Costs originate from authorized player inventory | Shared unlocks. |
| Profession assignment | Shared authoritative map keyed by player | Choice belongs to a player ID | Current remote profession UI parity not claimed complete. |
| Colony sustenance/growth | YES | — | Shared base production state. |
| Shared crate/container | YES where non-player container | — | Authoritative shared logistics. |
| Player inventory | NO to other players | YES | Hosted baseline filter exposes only `inventory:<self>`. |
| Player equipment | NO to other players as private aggregate | YES | Player-owned equipment state. |
| Colony scene/private player presentation aggregate | NO | YES | Per-player aggregate filtering. |
| Room name/list | Visible to signed-in players | — | Does not expose password/owner token. |
| Room password | — | Protected server-side | Host/join credential, never listed. |
| Save/export/delete | — | OWNER ONLY | Guests cannot manage shared world. |
| Persistent character seat | Shared room slot occupancy | Account-bound identity | Three seats in production. |
| Hosted-eight | Technical test capacity only | — | Historical evidence, not production policy. |

## 8. Presentation / UX / audio consumers

- `ColonyDepthOverlay` consumes authoritative biome/weather/ecology/research/profession/journal state.
- Current normal-play UI incorporates Owner-feedback quiet-HUD/settings changes.
- Current world presentation uses reworked/expanded biome/resources/landmarks and current palette variants.
- Inventory/storage presentation consumes existing authoritative container transactions; #198 adds capacity/guidance rather than new logistics authority.
- Lobby/arrival/skins are current public entry/presentation layers.
- Audio remains gesture-gated and client-side; technical playback is not independent human listening approval.

Presentation does not authorize hidden-world data, new lore truth, new resource authority or client-side multiplayer outcomes.

## 9. Historical vs current supersession

| Historical lineage | Preserve as evidence | Current truth to use |
|---|---|---|
| #170 initial Marsh/Badlands world | Initial integrated region capability | Add #190 generation-v4/resource usability, #195 landmarks, #197 physical shallow-channel rules, current region source. |
| #179 initial pixel presentation | Initial Phase 2 visual integration | Add #191 marsh/tree correction, #196 coherent atlas, #201/#203 skins/lobby/current product presentation. |
| #175 initial storage | Authoritative researched-capacity and transfer foundation | Add #190 discoverability/build recipe path and #198 visible capacity/sort/stack/guidance. |
| #182 hosted-eight | Historical eight-client authority/reconnect technical validation | Production policy is #194/#202/#203: private named room, three persistent seats. |
| #185 release / #186 QA | Historical PR #188 release and integrated automated QA | Current acceptance identity is PR #203/current main; #199 remains open. |
| PR #188 product candidate | Initial technical Phase 2 release | Owner issued REQUEST CHANGES; later PR #193/#200/#203 supersede player-facing release truth. |
| PR #193 rework candidate | Valid rework evidence | Priority upgrades and current lobby/account release further advance product truth. |

No DONE implementation Issue is reopened merely because #166/#167 expected contract docs were not produced. PM-A owns any lifecycle reconciliation of those stale task records.

## 10. Known limits and UNKNOWN / UNVERIFIED list

### Known limits

1. **Generation-v2 migration:** unsupported; must remain disclosed.
2. Cultivation/husbandry: no offline growth, breeding, arbitrary farm placement or greenhouse.
3. No conveyor/industry network, vehicles, NPC colonists, PvP, multi-planet, endgame civilization, deep genetics, quest rail, GPS/radar/hidden-world reveal.
4. Production private co-op is a bounded three-player pilot, not parity with every solo interaction.
5. Current remote pilot does not claim complete remote professions, connector placement, machine operation, combat/death recovery or every ruin interaction.
6. Vercel WebSockets are beta; function lifetime/reconnect behavior exists.
7. Free Redis is non-HA; current production caps are eight shared worlds and 500 accounts; new checkpoints are bounded to 2 MiB, legacy records retain 4 MiB.
8. Solo browser saves are origin-local and not cross-device/account-synced.
9. No email/social password recovery; one-time recovery code only.
10. Performance evidence is environment-dependent; no universal 60-FPS claim.

### UNKNOWN / UNVERIFIED

| Item | Status | Existing owner / route |
|---|---|---|
| 3–5 genuine novice-human ten-minute balance/usability sessions | **UNVERIFIED / MISSING** | #199. Automated agents/browsers cannot satisfy it. |
| Windows headless movement performance concern | **UNRESOLVED / ENVIRONMENT-LIMITED** | #199. Linux/current production samples do not erase the recorded failing Windows sample. |
| Exact-current-main full natural three-player production expedition | **UNVERIFIED AS PASS** | #199. Current PR #203 lobby smoke passed; a supplementary final-branch gather journey timed out and is not a PASS. Earlier production/rotation evidence remains valid for its exact revisions but does not justify fabricating a final-head PASS. |
| Independent human audio listening/readability assessment | **UNVERIFIED** | Existing #180 is technically complete. No new task from this documentation mismatch; route only if #199/Owner records a concrete problem. |
| Long-term durability/SLA of free non-HA production store | **UNVERIFIED / NOT GUARANTEED** | Hosting limitation; no SLA claim in current scope. |
| Final Phase 2 product acceptance | **PENDING** | #187 / Project Owner only. |

## 11. QA readiness

| Evidence class | Current status |
|---|---|
| Unit / integration / determinism | Current release handoff reports 374 tests PASS with four environment-specific skips on final branch. |
| Exact-current-main CI | PASS — run `36809489858`. |
| Exact-current-main CodeQL | PASS — run `36809489824`. |
| Pages release | PASS — run `36809525044`; public Pages bytes/release identity verified. |
| Production Vercel deployment | READY — `dpl_CpkyVt9daywGPaTDtbfgfBcp7YFK`, Git metadata matches current main. |
| Production lobby/account/room smoke | PASS for registration/skins/named host-join/reload identity/owner save/rename-password/responsive UI. |
| Reconnect/rotation | PASS on recorded production backend journey; bounded to evidence revision noted in release handoff. |
| Historical hosted-eight | PASS as technical validation only (#182). |
| Exact-current-main full natural three-player expedition | **NOT PASS-CLAIMED**; supplementary journey timed out after join. |
| Full-scene Linux performance | PASS under recorded CI environment. |
| Windows headless performance | **OPEN CONCERN** in #199. |
| Genuine novice-human usability/balance | **MISSING / OPEN** in #199. |
| Project Owner product verdict | **PENDING** in #187. |

## 12. Owner-decision readiness

Current technical/release evidence is sufficient to give #187 a concise current-product index, but this artifact does **not** claim the Owner gate is ready to close automatically.

Current truth:

- #187 is OPEN.
- Previous published Phase 2 candidate received Owner REQUEST CHANGES.
- Later rework/priority/lobby releases are technically delivered.
- #199 still owns genuine novice-human evidence and the environment-specific performance concern.
- Only the Project Owner may record Phase 2 ACCEPT / REQUEST CHANGES / BLOCK.

## 13. Stop-condition map

Do not promote into this Phase 2 as-built map as missing work:

- conveyors / processing chains / logistics networks;
- vehicles;
- NPC colonists;
- endgame civilization choices;
- deep genetics/breeding;
- PvP;
- multi-planet;
- quest rail;
- GPS/pathfinding/radar/hidden-world reveal;
- arbitrary farming/greenhouse expansion;
- full solo/remote UI parity claims not currently sourced.

A documentation mismatch alone is not an implementation-task trigger.

## 14. Next-owner/action map

| Next owner | Existing record | Action |
|---|---|---|
| **B-PM-01 / PM-B** | #165 | Review this exact artifact for source fidelity, current-main alignment, stale-task duplication and acceptance truthfulness. Control #165 lifecycle. |
| **Existing #199 execution owner** | #199 OPEN | Complete/disposition genuine novice-human evidence and Windows performance concern using truthful evidence. Do not use automated browsers as novice humans. |
| **Project Owner** | #187 OPEN | After reviewing the actual published current product/evidence, record ACCEPT / REQUEST CHANGES / BLOCK. |
| **A-PM-01 / PM-A** | #166/#167 lifecycle, per PM-B coordination note | Reconcile stale pre-implementation contract task records separately if needed. This artifact does not mutate them. |
| **B-TD-01** | #165 | Stop after PM-B handoff. No downstream implementation activation under this lock. |

## 15. Validation

### Source-to-row traceability — PASS

Rows are grounded to the current five source documents, live Issue state, current-main implementation interfaces and release evidence. Current behavior supersedes stale planned assumptions where later merged work exists.

### Current-main verification — PASS

Fresh compare showed:

`05491d17a088f0bd74fbb43e7260924b3e92801f == main`

at the authoring checkpoint.

### Historical/current separation — PASS

- hosted-eight is labeled historical technical validation;
- current production is three-seat private rooms;
- #170/#179/#175 remain lineage and are reconciled to later rework;
- #185/#186 do not substitute for current #199/#187 gates.

### Save/persistence/shared-private reconciliation — PASS

Current code/docs were inspected for ColonyDepth versioning, generation-v4 upgrade, Save V2 composition, hosted aggregate visibility, Redis checkpoint/resume, account-bound room identity and owner-scoped management.

### Duplicate/collision check — PASS

Before branch creation:

- no open PR matching P2-TD-001;
- no existing P2-TD-001 branch;
- documentation path was assigned to #165;
- no runtime path is edited.

### Authority check — PASS

No new gameplay semantics, architecture/schema design, save/network policy, QA verdict or Owner decision is created. Existing unresolved evidence remains unresolved.

### No invented acceptance — PASS

- #199 remains OPEN;
- novice-human evidence is not fabricated;
- Windows concern is not erased;
- #187 remains OPEN;
- no Owner ACCEPT is claimed.

## 16. Handoff

**Artifact consumer:** B-PM-01 / PM-B.  
**Review target:** exact branch/head produced from current main under `PMB-P2-TD-001-R3`.  
**Downstream:** #199 and #187 may consume this map as an index; no task is activated by this document.  
**Project Owner action for #165:** NONE. Owner action remains separately on #187.
