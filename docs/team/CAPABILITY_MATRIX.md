# Capability, authority and collaboration map

**Version:** 2.0.0. All roles require shared game-development literacy; specialist authority remains distinct.

| Role / member | Owns and must be strong at | Primary collaborators and their authority | Concrete evidence of competence |
|---|---|---|---|
| PM / A-PM-01, B-PM-01 | Flow, dependencies, scope routing, capacity, risk and playable milestone delivery | PO decides product/governance; domain leads decide craft; peer PM coordinates shared resources | Reconstructible task graph, bounded queue, delivered playable slice |
| GAME_DESIGNER / A-GD-01 | Mechanics, systems, pacing, balance intent, player choices and failure/recovery | NWD canon; ART presentation; TL architecture; TD data authoring; QA observations | Implementable rules and measured playtest iteration |
| TECHNICAL_LEAD / A-TL-01 | Architecture, interfaces, ownership, determinism, save/network evolution, performance budgets | GD behavior; GE/WNP implementation; TD authoring; DEVOPS delivery; QA validation | ADR with alternatives, executable contracts and useful review |
| GAMEPLAY_ENGINEER / A-GE-01 | Responsive authoritative gameplay implementation and integration | GD rules; TL interfaces; WNP world/save/network; ART UI; TD content; QA defects | Tested state transitions and playable behavior |
| WORLD_NETWORK_PERSISTENCE_ENGINEER / A-WNP-01 | Deterministic worlds, streaming, authoritative sessions and durable state | WLD spatial intent; GE transactions; TL protocols; TD data; QA adverse scenarios | Replay, round-trip, corruption and multi-client evidence |
| ART_DIRECTOR / A-ART-01 | Pixel visual language, game UX, readability, technical art and acceptance | GD meaning; NWD fiction; PIX production; AUD cues; TL renderer; GE UI code | State-driven visual/UX spec and gameplay-scale review |
| QA_PLAYTEST_LEAD / A-QA-01 | Risk-based validation, test design, evidence and player observation | Every spec owner; implementers fix; DEVOPS candidate identity; PM routing | Reproducible findings and truthful coverage ledger |
| NARRATIVE_WORLD_DIRECTOR / B-NWD-01 | Canon, nonlinear environmental narrative, mystery and world causality | GD mechanics; WLD space; ART expression; TD evidence records; AUD sound | Traceable canon and discoverable, non-forced evidence |
| WORLD_LEVEL_DESIGNER / B-WLD-01 | Expedition pacing, POI composition, route/risk/reward and procedural spatial grammar | GD rules; NWD canon; WNP generator; ART landmarks; QA paths | Playable route/blockout or implementable spatial data |
| TECHNICAL_DESIGNER / B-TD-01 | Content/config authoring, validation, tuning experiments and designer tools | GD balance intent; TL schema; GE/WNP runtime; NWD canon; QA data cases | Validated data used by an actual consumer |
| PIXEL_ARTIST_ANIMATOR / B-PIX-01 | Pixel craft, animation states, silhouettes, export and runtime readability | ART standards/acceptance; GD state semantics; NWD motif; GE integration | Complete inspectable asset pack at gameplay scale |
| AUDIO_DESIGNER / B-AUD-01 | Game audio, composition, interactive layers, cue hierarchy and asset delivery | GD timing; NWD tone; ART audiovisual alignment; TL/GE runtime; QA listening | Auditioned mapped cues and tested in-game behavior |
| BUILD_TOOLS_DEVOPS / B-DEVOPS-01 | Reproducible builds, CI, preview/release automation and tooling | TL architecture/security; QA gates; GE/WNP build needs; PM scheduling | Clean-checkout and exact-artifact deployment evidence |

## Decision routing

Gameplay semantics → A-GD-01. Architecture/schema boundaries → A-TL-01. Narrative facts → B-NWD-01. Visual/UX acceptance → A-ART-01. Validation verdict → A-QA-01. Task priority/owner/lock → Coordinating PM. Product direction, major milestone/governance changes → PO. Audio craft → B-AUD-01 within approved event semantics. Spatial composition → B-WLD-01 within approved systems and canon. Build implementation → B-DEVOPS-01 inside technical policy.

One accountable owner does not mean only one contributor. Contributors work in separately bounded tasks/patches with recorded authorization; the accountable owner integrates. Never silently occupy a second slot. Supporting work within a role's competence does not grant authority to approve another domain's decisions.

## Autonomy levels

- **Execute:** make compatible craft/implementation decisions within the member's active task and approved sources; self-check and persist work.
- **Propose:** identify problems, alternatives and experiments; explicitly label unapproved ideas.
- **Experiment:** use an activated or conditionally preauthorized bounded experiment; record hypothesis, time budget, sandbox/output, success signal and stop condition. No automatic production/canon/schema change.
- **Escalate:** unresolved material source conflict, authority boundary, scope/priority/ownership change or missing high-impact requirement. Continue unaffected authorized work.

No role can approve its own cross-domain changes by invoking expertise. Conversely, not every implementation detail needs a new ADR or PM approval.

## Capability development

At meaningful task reviews record demonstrated strengths, a concrete skill gap, evidence and one next practice opportunity. Use paired review, a small fixture, authoring exercise or test—not a generic claim that the member is now expert. A PM may propose expanded execution scope after evidence; domain authority/slot changes follow governance approval. Maintain private personal information outside the public repo.

Measure waiting and rework alongside output quality. For AI roles record unavailable tools, context retrieval failures and missed dispatch separately from reasoning errors. Do not grade people by document length, issue count or number of comments.
