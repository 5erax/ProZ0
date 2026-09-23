# ProZ0 Role Registry

**Version:** 1.0  
**Unique role contracts:** 13  
**Member slots:** 14

| ROLE_ID | Position | Contract |
|---|---|---|
| PROJECT_MANAGER | Project Manager / Producer | `docs/team/roles/project-manager.md` |
| GAME_DESIGNER | Principal Game Designer / Systems Designer | `docs/team/roles/game-designer.md` |
| TECHNICAL_LEAD | Technical Lead / Game Architect | `docs/team/roles/technical-lead.md` |
| GAMEPLAY_ENGINEER | Gameplay Engineer | `docs/team/roles/gameplay-engineer.md` |
| WORLD_NETWORK_PERSISTENCE_ENGINEER | World / Network / Persistence Engineer | `docs/team/roles/world-network-persistence-engineer.md` |
| ART_DIRECTOR | Art Director / UI-UX / Technical Art | `docs/team/roles/art-director-uiux-technical-art.md` |
| QA_PLAYTEST_LEAD | QA / Playtest Lead | `docs/team/roles/qa-playtest-lead.md` |
| NARRATIVE_WORLD_DIRECTOR | Narrative & World Design Director / Lead Worldbuilding Designer | `docs/team/roles/narrative-world-design-director.md` |
| WORLD_LEVEL_DESIGNER | World / Level Gameplay Designer | `docs/team/roles/world-level-gameplay-designer.md` |
| TECHNICAL_DESIGNER | Technical Designer / Content Systems Designer | `docs/team/roles/technical-designer-content-systems.md` |
| PIXEL_ARTIST_ANIMATOR | 2D Pixel Artist & Animator | `docs/team/roles/pixel-artist-animator.md` |
| AUDIO_DESIGNER | Audio Designer / Composer | `docs/team/roles/audio-designer-composer.md` |
| BUILD_TOOLS_DEVOPS | Build / Tools / DevOps Engineer | `docs/team/roles/build-tools-devops-engineer.md` |

## Role resolution rule

A chat/person does not choose a contract based on what a task appears to require. It uses its fixed `ROLE_ID`.

The Project Manager contract is intentionally instantiated twice. All other role contracts have one accountable member slot in the staffing model.

Company assignment is operational metadata. Moving a person between companies does not change the role contract.
