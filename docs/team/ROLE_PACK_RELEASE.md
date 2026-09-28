# ProZ0 Role Pack 2.1.0

**State:** CANDIDATE — prepared under the Project Owner's contract-upgrade request; activation requires explicit adoption of the reviewed revision.
**Prepared:** 2026-09-28. **Effective date:** pending adoption record.
**Supersedes on adoption:** Role Pack 2.0.0 at `a8aec0b8d377aa9c7e568573e8ba6a3a87e02cb6` for named sessions.

## Actual baseline

Product main at audit was `e74e417162df0084254ddbd0a8e4767398f65bb0`, whose role files were still v1. The [PR #88 closing record](https://github.com/5erax/ProZ0/pull/88#issuecomment-5847230587) explicitly retained the approved 2.0.0 pin. [PM coordination](https://github.com/5erax/ProZ0/issues/67#issuecomment-5847251113) confirms closure did not revoke it. Do not downgrade active roles to v1 or treat PR closure as supersession.

This release ports only governance/role-pack files, specialist playbooks, activation prompts and their validator from that pin onto current product main. It does not merge the obsolete product branch. No role/member/company is added or moved.

## Changes

- All 13 contracts explicitly inherit one execution procedure and include specific ready inputs, outputs, self-checks and failure-return behavior.
- Typed dependency edges separate usable artifacts from Issue closure and integrated acceptance.
- Session discovery, retained-owner rework, downstream checks, bounded Issue repair/creation and strict PO escalation filtering.
- PM queue/board health, capability disclosure, conditional activation and direct authorized review routing; existing lock, WIP, reviewer and acceptance safeguards retained.
- Duplicated generic role prose reduced; specialist methods and domain authority preserved.
- Dated audit, full role inventory, interface map, migration matrix and scenario walkthroughs.

## Adoption and active work

1. Record explicit PO adoption on the release PR/source Issue naming the revision and affected sessions; approved-main merge is the normal delivery path after approval. Branch presence or CI is not adoption. The request to prepare upgrades authorizes this work, not fabricated final approval.
2. Until superseded, active sessions retain their effective 2.0.0 pin. After adoption, each resolves 2.1.0 at one commit, reads applicable shared/role/skill/playbook files, verifies identity and emits the runtime load receipt. Discover owned work without requiring a Task ID. Resolve the effective adoption before defaulting to main.
3. PMs reconcile affected live fields before using changed delegation/readiness rules. Preserve IDs, scope, owners, locks, PRs, criteria, company boundaries and explicit restrictive sequencing. No bulk status changes occur merely from this release.
4. Use [CONTRACT_UPGRADE_AUDIT](CONTRACT_UPGRADE_AUDIT.md) for evidence and task transitions; refresh live state at adoption. #60 remains REQUEST CHANGES and Phase 2 inactive unless PO separately changes that product decision.
5. Existing reviewer, correction and conditional grants permit only named actions. No new merge rights, deployed automation, cross-chat messages or human evidence are implied. Report actual POSTED/DELIVERED/ACKNOWLEDGED state.

## Validation and rollback

Run `python scripts/validate_role_pack.py --refresh` only as maintainer after intended edits, inspect hashes, then run without refresh. It checks identities, versions, references, skill frontmatter and LF-normalized integrity. [CONTRACT_UPGRADE_VALIDATION](CONTRACT_UPGRADE_VALIDATION.md) gives repository-grounded walkthroughs; [ROLE_PACK_EVALUATION](ROLE_PACK_EVALUATION.md) retains specialist exercises. Static checks do not prove live adoption or autonomous dispatch.

Rollback: PO names the prior approved pin and affected sessions; PM records impacts and preserves active work; roles reload with receipts. Never delete artifacts, erase decisions, invalidate ownership or restore obsolete product requirements as a contract rollback side effect.
