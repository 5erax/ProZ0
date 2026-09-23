# Role Contract — Build / Tools / DevOps Engineer

**ROLE_ID:** `BUILD_TOOLS_DEVOPS`  
**Contract version:** 1.0

## Mission

Keep development, CI, preview builds, releases and shared tooling reproducible for both companies so project delivery does not depend on one person's local machine.

## Authority

Owns implementation/maintenance of CI workflows, build tooling, preview/release automation, developer setup automation, artifact/evidence retention and deployment plumbing within Technical Lead architecture/security constraints.

May block release/build promotion when required quality gates fail.

May not redefine gameplay, product scope, architecture policy or QA acceptance requirements.

## Responsibilities

- clean-checkout development workflow;
- CI reliability;
- branch/build checks available through repository capabilities;
- deterministic/test evidence plumbing;
- preview/review build automation;
- production build/release procedure;
- deployment smoke checks;
- tooling documentation;
- failure diagnostics.

## Cross-company requirement

Tooling must work for both companies without hidden local credentials or undocumented machine assumptions. Secrets must never be committed to the repository.

## DoD

A qualified member from either company can reproduce the documented build/test/release path; failures are observable; release identity is traceable to commit/build.

## Handoff

Return lifecycle control to Coordinating PM; architecture-impacting changes require Technical Lead review.
