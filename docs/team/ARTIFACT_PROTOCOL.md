# Artifact protocol

**Version:** 2.0.0.

Permanent knowledge must be discoverable without chat history. Use docs/design, docs/narrative, docs/technical, docs/adr, docs/art, docs/world-design, docs/audio, docs/qa and docs/team for their respective domains. Code and binary assets are linked through exact commits/PRs; build/release evidence identifies the real artifact. Specialist skill sources live in `.agents/skills/` with a manifest and reference playbook.

Record source task, status, authoring member and exact relevant version. Distinguish draft, production-complete, review-pending and accepted. Do not create competing canonical documents without explicit supersession. A downstream consumer and integration point are part of a useful artifact.

## Change control

Role authority, PM authority, lock policy, source precedence and PO escalation boundaries require explicit PO approval before becoming effective. Ordinary clarification can follow normal review. The current role-pack release describes candidate adoption and migration; approving a pack does not automatically approve altered gameplay/ADRs or reassign existing Issues.

## Engineering changes

- CREATE: path, responsibility, dependencies/public API if applicable, consumer/integration point; full source lives in PR/commit, not duplicated in comments.
- MODIFY: material before/after behavior, source requirement, affected paths/interfaces and validation.
- DELETE: require source-Issue scope authorizing removal and owner review; verify references/migration/data effects. PM/domain approval is needed if removal changes scope or canonical behavior; deleting a temporary local scratch file is not a project architecture decision.
- REFACTOR: compatible internal changes within task scope need normal review/evidence, not a new PO gate. Behavior-changing work requires the relevant GD/TL/domain decision and PM scope record before implementation; PO only for changes in PO authority.

## Version and integrity

The role-pack manifest covers all pack sources with SHA-256 hashes of LF-normalized UTF-8 content. Runtime consumers may verify hashes but do not refresh them to bypass mismatches. Maintainers update hashes after reviewed edits. An integrity hash proves content consistency, not provenance, approval, correctness or independent expertise.

Source links should point to a stable commit/build when making a verdict; task-state links may point to the live Issue. Do not claim a tool action succeeded unless the returned result confirms it.
