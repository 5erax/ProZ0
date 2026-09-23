# ProZ0 Role Pack 2.0.0

**State:** release candidate until merged into approved `main`, or explicitly adopted at a pinned commit by the Project Owner for named role sessions.
**Prepared:** 2026-09-23. **Scope:** operating contracts, specialist game-development skills, identity, collaboration and chat reload.

This release implements the requested detailed role system. It does not claim that writing a persona trains a model, proves expertise, grants tool permissions, wakes other chats, or changes staffing. Demonstrated competence comes from artifacts, review and observed player/build outcomes.

## Changes

- Thirteen specialist skills and contracts; fourteen member activation prompts, with distinct PM-A/PM-B identities.
- Shared game-design literacy without assigning gameplay-design authority to every role.
- Versioned identity/context loading, peer map, role-specific craft playbooks and completion replies.
- Bounded autonomy, prepared review routing, review queue capacity, response deadlines, fallback coordination and lock revisions.
- Separate subsystem readiness from integration acceptance; experiment lanes and evidence-based capability growth.

## Activation and existing work

1. PO adoption is recorded by an explicit decision on the release PR/Issue or an explicit adoption message naming the commit and affected sessions. Merge into approved main is the normal release path; branch presence alone is not adoption.
2. Existing product specs, ADRs, acceptance criteria, owners, PRs and locks remain valid. This pack does not automatically reassign #55/#57, unblock #76, relax #50/#51 save acceptance, or merge code.
3. PM reconciles affected live Issues before using changed WIP, acceptance-stage or routing policies. Preserve the original criterion in the dependency mapping when moving its validation stage.
4. Each member applies the pack using `activation/<MEMBER_ID>.md`, emits a load receipt, and continues only work already authorized for that member. No mass messaging is implied by creating this pack.
5. A chat without tools that can read the pack reports NOT_LOADED and names the missing access; it never claims to have loaded unseen files.
6. New gameplay or technical rules still require their existing domain approval. Example numbers in playbooks are illustrative, not ProZ0 balance or performance budgets.

## Validation and rollback

`python scripts/validate_role_pack.py` checks manifest hashes, role/member mappings, mandatory files, local reference links and version consistency. Skill syntax is also checked with the Codex skill validator when available. Behavioral exercises are in `ROLE_PACK_EVALUATION.md`; passing a syntax check is not proof of expert behavior.

To roll back, PO identifies the previously approved commit and affected sessions; PM records live-task impacts; members reload that commit with a receipt. Do not delete active work or silently downgrade source requirements. Release history is Git history, not duplicated chat prompts.
