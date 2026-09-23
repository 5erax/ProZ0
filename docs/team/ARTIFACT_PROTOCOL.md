# ProZ0 Artifact Protocol

**Version:** 1.0

Permanent project knowledge must be discoverable from GitHub without requiring chat history.

## Preferred locations

- Product/game design: `docs/design/`
- Narrative/world canon: `docs/narrative/`
- Technical design: `docs/technical/`
- ADRs: `docs/adr/`
- Art/visual/UX direction: `docs/art/`
- World/level design: `docs/world-design/`
- QA/test artifacts: `docs/qa/`
- Team operating contracts: `docs/team/`
- Code changes: Pull Requests and repository source.
- Build/release evidence: Issue/PR comments or approved artifact path linked from the task.

## Artifact rules

Every task artifact must identify its source Task ID or Issue and status when practical.

Important conclusions from chat must be persisted before handoff.

Do not create competing canonical documents for the same decision without explicitly superseding the previous artifact.

## Change control

Changes to role authority, PM authority, task-lock rules, Source of Truth or Project Owner escalation boundaries require an explicit Project Owner approval before becoming effective.

Ordinary clarifications that do not change authority may be maintained by the two PMs through normal repository review.

## New files

Role instances creating a new project file must record:

- exact path;
- purpose;
- responsibilities/content boundary;
- dependencies;
- integration/reference point.

Engineering CREATE/MODIFY/DELETE/REFACTOR rules from existing technical workflow remain applicable.
