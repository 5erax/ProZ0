# Common execution contract

**Version:** 2.1.0. Effective only through [release adoption](ROLE_PACK_RELEASE.md).

All thirteen roles inherit this procedure. It complements the domain-specific contracts; it grants no new staffing identity, product scope, merge permission or background runtime.

## Inheritance and authority

Read [source precedence](SOURCE_OF_TRUTH.md), [Team Operating System](TEAM_OPERATING_SYSTEM.md), [runtime/recovery](ROLE_RUNTIME_PROTOCOL.md), [task locks](TASK_LOCK_PROTOCOL.md), [dependencies](DEPENDENCY_PROTOCOL.md), [cross-company rules](CROSS_COMPANY_PROTOCOL.md), [artifacts](ARTIFACT_PROTOCOL.md), [DoD and handoff](DEFINITION_OF_DONE.md), [handoff/rework](HANDOFF_REWORK_PROTOCOL.md), [communication](COMMUNICATION_PROTOCOL.md), and [role interfaces](ROLE_INTERFACE_MAP.md). These links are the shared inheritance list for every role contract. Product vision, MVP and current approved phase decisions remain separate product sources; there is no new competing constitution.

Decide and proceed when a decision is routine, reversible, within the role's professional authority, consistent with approved baselines and inside the authorized task. Naming, compatible refactoring, craft execution, test selection and factual documentation repair do not need PO approval. PM coordinates flow; PM does not replace specialist judgment.

## Session bootstrap and next work

1. Resolve verified identity and the effective pack commit using ROLE_RUNTIME_PROTOCOL. An explicit still-effective PO pin wins over a newer but unadopted main/branch.
2. Read current phase decisions, owned Issues (including closed ones with unresolved evidence), latest material comments, relevant PRs/reviews, dependencies and artifacts from both companies. Search by explicit member/role fields as well as assignee: one GitHub account can post for several distinct recorded roles.
3. Reconstruct current lock/revision, branch/head, work done, pending criterion, required reviewer, downstream consumer and last authorized next action. Compare prior session artifacts with current repository reality before editing.
4. Resume valid owned IN_PROGRESS work. Within that queue, process in-scope failed QA/requested changes before unrelated new implementation. Then finish pending handoff steps and named review requests. Next consider READY work explicitly assigned or conditionally preauthorized for this member, then bounded blocker support. Use PM-recorded priority, critical-path impact, then oldest ready request as tie-breakers; do not rewrite priorities.
5. Apply Definition of Ready below and TASK_LOCK_PROTOCOL before every new activation. Unowned READY work without named authorization is a claim request to its PM, not permission to edit. Preserve existing RESERVED sequences. Do not occupy another member slot.
6. Execute, self-review, persist, hand off, inspect downstream readiness, and select the next authorized action without an Owner continuation prompt. If none exists, persist one useful checkpoint with next actor/trigger; do not manufacture tasks or repeat no-change comments.

This is a procedure for each running session, not a scheduler. Posted requests do not wake chats. PM follows pending requests on its next execution window or through a separately configured authorized dispatcher.

## Definition of Ready

All must be true for the portion being executed: approved phase/scope; explicit role/member and valid authorization; no competing lock/PR on the affected system, paths or canonical data; hard input artifacts available at the required version and acceptance stage; understandable acceptance criteria; feasible tools; named output/consumer; task branch and review route; correction capacity. Soft inputs may use an approved baseline with a recorded reversible assumption and reconciliation trigger. Record failed conditions and continue only unaffected authorized portions.

## Claim and GitHub responsibilities

Use the existing lock states and PM-owned activation or exact conditional grant in TASK_LOCK_PROTOCOL. Fresh-read the source Issue/revision and overlapping PRs immediately before a claim, persist the named ownership and revised lock, then read it back before editing. Any race or conflicting owner pauses the affected mutation. A checklist is not an atomic lock.

Use task-oriented branches and the repository PR template; link the source Issue and exact role/member/lock. Open or update the PR as soon as its deliverable is reviewable; mark incomplete work as draft. Record actual self-checks, criterion-level evidence and pending external gates. Do not use auto-closing Issue keywords when merge precedes the Issue's final acceptance. Merge and closure remain with authorized lifecycle owners after required reviews/checks; author self-checks are never independent approval.

## Missing inputs and escalation

Classify the uncertainty before stopping:

| Kind | Action |
|---|---|
| Professional decision | Decide inside your domain, document material rationale and proceed. |
| Reversible assumption | Record baseline, assumption, affected scope, validation/expiry trigger and rollback; proceed only where no unapproved rule or public contract is created. |
| Critical unknown | Pause dependent portion; ask the owning specialist on the source Issue with exact question and required artifact. Continue unrelated authorized work. |
| Product/authority decision | Use the filter below; route a concrete decision record with options and trade-offs. |

Consult the sources, then related specialist, then Coordinating PM for routing/capacity, then responsible technical/design authority if still unresolved. Skip already-resolved rungs; this is not a serial approval committee. Notify PM when critical-path readiness, ownership, acceptance, capacity or cross-company scheduling changes.

Escalate to PO only for fundamental product vision/player experience, significant approved scope changes, major gameplay rules, high-cost architecture/platform/migration decisions, company responsibility/authority changes, irreversible high-impact removal/replacement, or explicitly Owner-gated acceptance/governance. First test whether existing sources, a competent specialist or a reversible in-scope action resolves it. Routine PM disagreement is reconciled by the PMs; only unresolved authority/product conflicts go to PO.

Human-only evidence is not a new product decision: PM first routes to an available qualified reviewer. If only PO can supply the explicitly required human gate or capability, record a concrete evidence/capability request (such as #80 listening), never waive the gate or invent a verdict.

## Follow-up Issues and repair

Search open AND closed Issues, PRs, accepted artifacts, current phase and both companies for the same problem/purpose before creating work. Prefer the existing source for a correction, clarification or missing handoff. Create a follow-up only for genuinely distinct required in-scope work; record problem/evidence, scope, non-goals, deliverable/path, proposed owner role/PM, typed dependencies, acceptance criteria and handoff. Creation does not activate it. Phase 2 candidates stay in #120 until #60 permits promotion; do not multiply speculative backlog items.

Members may fix factual links, artifact paths, implementation notes and evidence on their own tasks, logging before/after and basis. Clarifying acceptance wording must preserve observable requirements; substantive criterion changes require PM plus domain-owner decision, and PO where its filter applies. Status/lock/ownership/closure mutations need the recorded lifecycle delegation. On another PM's task, post a correction request instead of overwriting its record.

## Recovery when records disagree

| Observation | Required recovery |
|---|---|
| BLOCKED but input seems ready | Verify artifact/version/approval; recompute readiness; authorized PM/member reconciles the snapshot before activation. |
| Code exists or PR merged but Issue says missing | Compare code/head against criteria; link evidence, resume missing validation/handoff, do not reimplement or infer acceptance. |
| Closed Issue has absent/invalid output | Mark dependent readiness blocked; ask lifecycle owner to repair/reopen or link a distinct correction; closure alone is no proof. |
| Missing owner/expired reservation | Preserve branch/artifact; notify PM/recorded backup; no silent takeover. |
| Spec moved/replaced or conflicting docs | Follow verified supersession to the canonical source, compare changed requirements, revalidate affected consumers; route unresolved authority conflict. |
| New PR head or changed candidate | Recheck the actual diff and affected evidence; invalidate affected verdicts, never carry approval merely by PR number. |

Persist a checkpoint before interruption: Issue, effective pack, lock revision, branch/head, changed artifacts, checks, unfinished criteria, next action/actor, blockers and next check time. The next session reconstructs from GitHub and confirms freshness. If access is missing, report the exact missing capability and PERSISTENCE_REQUIRED with usable content; do not claim recovery or writes succeeded.
