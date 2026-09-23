# ProZ0 Role Registry

**Version:** 2.0.0. Thirteen contracts, fourteen member slots.

| ROLE_ID | Member slots | Authority | Specialist skill |
|---|---|---|---|
| PROJECT_MANAGER | A-PM-01, B-PM-01 | [Contract](roles/project-manager.md) | [proz0-producer](../../.agents/skills/proz0-producer/SKILL.md) |
| GAME_DESIGNER | A-GD-01 | [Contract](roles/game-designer.md) | [proz0-game-design](../../.agents/skills/proz0-game-design/SKILL.md) |
| TECHNICAL_LEAD | A-TL-01 | [Contract](roles/technical-lead.md) | [proz0-game-architecture](../../.agents/skills/proz0-game-architecture/SKILL.md) |
| GAMEPLAY_ENGINEER | A-GE-01 | [Contract](roles/gameplay-engineer.md) | [proz0-gameplay-engineering](../../.agents/skills/proz0-gameplay-engineering/SKILL.md) |
| WORLD_NETWORK_PERSISTENCE_ENGINEER | A-WNP-01 | [Contract](roles/world-network-persistence-engineer.md) | [proz0-world-network-persistence](../../.agents/skills/proz0-world-network-persistence/SKILL.md) |
| ART_DIRECTOR | A-ART-01 | [Contract](roles/art-director-uiux-technical-art.md) | [proz0-art-direction-ux](../../.agents/skills/proz0-art-direction-ux/SKILL.md) |
| QA_PLAYTEST_LEAD | A-QA-01 | [Contract](roles/qa-playtest-lead.md) | [proz0-game-qa-playtest](../../.agents/skills/proz0-game-qa-playtest/SKILL.md) |
| NARRATIVE_WORLD_DIRECTOR | B-NWD-01 | [Contract](roles/narrative-world-design-director.md) | [proz0-narrative-worldbuilding](../../.agents/skills/proz0-narrative-worldbuilding/SKILL.md) |
| WORLD_LEVEL_DESIGNER | B-WLD-01 | [Contract](roles/world-level-gameplay-designer.md) | [proz0-world-level-design](../../.agents/skills/proz0-world-level-design/SKILL.md) |
| TECHNICAL_DESIGNER | B-TD-01 | [Contract](roles/technical-designer-content-systems.md) | [proz0-technical-content-design](../../.agents/skills/proz0-technical-content-design/SKILL.md) |
| PIXEL_ARTIST_ANIMATOR | B-PIX-01 | [Contract](roles/pixel-artist-animator.md) | [proz0-pixel-art-animation](../../.agents/skills/proz0-pixel-art-animation/SKILL.md) |
| AUDIO_DESIGNER | B-AUD-01 | [Contract](roles/audio-designer-composer.md) | [proz0-game-audio](../../.agents/skills/proz0-game-audio/SKILL.md) |
| BUILD_TOOLS_DEVOPS | B-DEVOPS-01 | [Contract](roles/build-tools-devops-engineer.md) | [proz0-game-build-release](../../.agents/skills/proz0-game-build-release/SKILL.md) |

Resolve roles from explicit MEMBER_ID binding, not task appearance. PM-A and PM-B instantiate one contract with separate identities. Role authority remains domain-scoped; see CAPABILITY_MATRIX and ROLE_PACK_RELEASE.
