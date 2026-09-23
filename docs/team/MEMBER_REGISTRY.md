# ProZ0 Member Registry

**Status:** APPROVED STAFFING MODEL  
**Version:** 2.0.0
**Total member slots:** 14  
**Unique role contracts:** 13

This registry defines persistent member identities for role-runtime bootstrapping. The role contract is authoritative for duties; this file binds a member slot to a role and home company.

## Company A

| MEMBER_ID | ROLE_ID | Instance | Identity binding |
|---|---|---|---|
| A-PM-01 | PROJECT_MANAGER | PM-A | Current Company A Project Manager / Producer |
| A-GD-01 | GAME_DESIGNER | Primary | Current Company A Game Designer |
| A-TL-01 | TECHNICAL_LEAD | Primary | Current Company A Technical Lead |
| A-GE-01 | GAMEPLAY_ENGINEER | Primary | Current Company A Gameplay Engineer |
| A-WNP-01 | WORLD_NETWORK_PERSISTENCE_ENGINEER | Primary | Current Company A World/Network/Persistence Engineer |
| A-ART-01 | ART_DIRECTOR | Primary | Current Company A Art Director / UI-UX / Technical Art |
| A-QA-01 | QA_PLAYTEST_LEAD | Primary | Current Company A QA / Playtest Lead |

## Company B

| MEMBER_ID | ROLE_ID | Instance | Identity binding |
|---|---|---|---|
| B-PM-01 | PROJECT_MANAGER | PM-B | `@trisnef2293` — confirmed repository collaborator, write permission |
| B-NWD-01 | NARRATIVE_WORLD_DIRECTOR | Primary | Partner staffing slot |
| B-WLD-01 | WORLD_LEVEL_DESIGNER | Primary | Partner staffing slot |
| B-TD-01 | TECHNICAL_DESIGNER | Primary | Partner staffing slot |
| B-PIX-01 | PIXEL_ARTIST_ANIMATOR | Primary | Partner staffing slot |
| B-AUD-01 | AUDIO_DESIGNER | Primary | Partner staffing slot |
| B-DEVOPS-01 | BUILD_TOOLS_DEVOPS | Primary | Partner staffing slot |

## Privacy and identity binding

The repository is public. Personal email addresses are not used as public member identifiers in this registry.

A member is bound to GitHub by confirmed GitHub username, not by guessed username, email local-part or display name.

The Project Owner designated the Company B representative. Repository access was verified for GitHub username `@trisnef2293` with write permission. Personal email is intentionally not published in this public registry.

## One-person-per-slot rule

Each row represents one accountable person or persistent role chat. A person may not silently occupy two rows.

Temporary coverage requires both PMs to record the exception on the relevant Issue. Permanent staffing changes update this registry through an approved repository change.


## Runtime and capability binding

The staffing table defines accountable slots, not proof of human identity, expertise, tool access or active execution. Preserve the existing confirmed account binding; no other GitHub usernames or runtime endpoints are invented by this release.

For each active session PM records MEMBER_ID, HUMAN/AI runtime type, verified GitHub principal if applicable, dispatch endpoint (or explicit user-driven chat dispatch), availability window, acknowledgement and backup in an appropriate task/private operational record. Public records need only non-sensitive routing identifiers. Shared GitHub accounts do not collapse role identities; record which bound role produced each verdict.

Existing authorized work may continue with an explicit member-bound session even when native GitHub assignment is unavailable. Report dispatch/tool limits honestly. New autonomous dispatch must not be claimed until a usable endpoint and trigger exist. A role-pack instruction cannot wake another chat.

## Individual activation prompts

- [A-PM-01](activation/A-PM-01.md) — PROJECT_MANAGER / COMPANY_A
- [B-PM-01](activation/B-PM-01.md) — PROJECT_MANAGER / COMPANY_B
- [A-GD-01](activation/A-GD-01.md) — GAME_DESIGNER / COMPANY_A
- [A-TL-01](activation/A-TL-01.md) — TECHNICAL_LEAD / COMPANY_A
- [A-GE-01](activation/A-GE-01.md) — GAMEPLAY_ENGINEER / COMPANY_A
- [A-WNP-01](activation/A-WNP-01.md) — WORLD_NETWORK_PERSISTENCE_ENGINEER / COMPANY_A
- [A-ART-01](activation/A-ART-01.md) — ART_DIRECTOR / COMPANY_A
- [A-QA-01](activation/A-QA-01.md) — QA_PLAYTEST_LEAD / COMPANY_A
- [B-NWD-01](activation/B-NWD-01.md) — NARRATIVE_WORLD_DIRECTOR / COMPANY_B
- [B-WLD-01](activation/B-WLD-01.md) — WORLD_LEVEL_DESIGNER / COMPANY_B
- [B-TD-01](activation/B-TD-01.md) — TECHNICAL_DESIGNER / COMPANY_B
- [B-PIX-01](activation/B-PIX-01.md) — PIXEL_ARTIST_ANIMATOR / COMPANY_B
- [B-AUD-01](activation/B-AUD-01.md) — AUDIO_DESIGNER / COMPANY_B
- [B-DEVOPS-01](activation/B-DEVOPS-01.md) — BUILD_TOOLS_DEVOPS / COMPANY_B
