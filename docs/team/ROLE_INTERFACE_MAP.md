# Role interface map

**Version:** 2.1.0. Identity and company bindings come from MEMBER_REGISTRY. Feedback lives on the source Issue/PR with PM visibility; independent-review and source-task gates still apply.

Minimum readiness permits only the named consumption, not acceptance, merge or new activation. Producer supplies exact artifact/version and stage; consumer verifies it through DEPENDENCY_PROTOCOL. Return failures directly to the producer or implementation owner, not through PO.

| Upstream role/member | Output artifact | Minimum readiness | Downstream role/member and consumption | Feedback / failure return |
|---|---|---|---|---|
| PROJECT_MANAGER / A-PM-01 or B-PM-01 | Task, lock, priority, review route, conditional grant | Approved scope, one owner, safe preflight, current revision | Named specialist executes authorized scope; other PM sees cross-company effects | Source Issue to Coordinating PM; cross-owned change needs PM agreement |
| GAME_DESIGNER / A-GD-01 | Rules, states, units, failure/recovery, criteria | Required behavior approved within GD authority; product choices resolved | A-GE/A-WNP implement; B-TD authors; B-WLD translates spatially; A-ART presents; A-QA derives cases | Ambiguous rule to A-GD; implementation mismatch to original engineer |
| TECHNICAL_LEAD / A-TL-01 | ADR, public interface, data ownership, invariants | Versioned seam with error/authority semantics | A-GE/A-WNP implement; B-TD respects schema; B-DEVOPS builds tools; QA tests invariants | Architecture gap to A-TL; conformance defect to implementer |
| NARRATIVE_WORLD_DIRECTOR / B-NWD-01 | Canon ledger, evidence/reveal brief | Approved facts distinct from hypothesis; usable hooks | B-WLD composes sites; B-TD maps content; A-ART/B-AUD express tone; QA checks canon | Canon gap to B-NWD; craft defect to producer |
| WORLD_LEVEL_DESIGNER / B-WLD-01 | Spatial grammar, route brief, traversal criteria | Gameplay/canon valid; affected GD/ART decisions cleared | A-WNP/A-GE implement; B-TD authors permitted data; QA tests traversal | Spatial gap to B-WLD; reveal rules to A-GD; runtime defect to engineer |
| ART_DIRECTOR / A-ART-01 | Presentation states, asset brief, formats, visual verdict | Approved meaning, renderer limits, required scales/accessibility | B-PIX produces; B-AUD aligns; A-GE implements; QA tests readability | Visual gap to A-ART; gameplay meaning to A-GD |
| TECHNICAL_DESIGNER / B-TD-01 | Content/config, traceability, support spec | Valid schema/IDs; proposals separate from approved semantics | A-GE/A-WNP consume data; A-GD/A-ART review support; QA tests examples | Data/copy defect to B-TD; schema to TL; balance to GD |
| PIXEL_ARTIST_ANIMATOR / B-PIX-01 | Source/export assets, frame/anchor manifest, previews | Files decode; states present; A-ART gate at required stage | A-GE integrates; A-ART reviews; QA checks gameplay-scale result | Asset defect to B-PIX; renderer/integration defect to engineer |
| AUDIO_DESIGNER / B-AUD-01 | Audio pack, event manifest, audition identity | Technical checks; disclosed listening state; actual audition for perceptual approval | A-QA consumes listening; named engineer integrates; PM-B accepts task | Sound defect to B-AUD; absent playback to PM/capable reviewer; runtime to engineer |
| GAMEPLAY_ENGINEER / A-GE-01 | PR, playable path, tests, impact summary | Self-check complete; exact head; required domain gates identified | TL/GD/ART review their domains; QA validates authorized candidate; PM sequences merge | Bounded failure to A-GE; new scope to PM/domain owner |
| WORLD_NETWORK_PERSISTENCE_ENGINEER / A-WNP-01 | World/network/save PR, failure evidence | Exact seam/head; deterministic/retry/reopen evidence; TL gate | A-GE integrates; A-TL reviews; A-QA tests multi-client/save journeys | Lifecycle defect to A-WNP; policy to GD; interface to TL |
| BUILD_TOOLS_DEVOPS / B-DEVOPS-01 | Reproducible tool/build, run/deployment identity | Approved environment; real run/smoke; usable retained evidence | Engineers reproduce; QA tests candidate; PM controls release | Tool defect to B-DEVOPS; code defect to original engineer |
| QA_PLAYTEST_LEAD / A-QA-01 | Criterion verdict, repro, severity, evidence | Independent exact-candidate test; gaps/human gates explicit | Original owner repairs; PM consumes QA; PO reviews eligible product candidate | Bad evidence to QA; defect to original owner; new requirement to domain owner |
| PM-A ↔ PM-B | Readiness/coverage/ownership decision | Same source and evidence; agreement for lifecycle changes | Receiving PM reconciles its tasks and activates next member | Scheduling to PM pair; unresolved authority/product to PO |

## Handoff recipe

Use the shared DoD manifest: completed result; exact path/PR/commit/build; criterion and acceptance stage; limits; downstream member; next action; hard blockers; actual dispatch state. Link the canonical artifact instead of copying its full specification. Consumers return failed interface/criterion and minimum correction on the same source record.

Cross-company review is required only at a real domain boundary. Company independence never bypasses that domain authority.
