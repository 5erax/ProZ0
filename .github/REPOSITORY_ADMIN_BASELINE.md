# ProZ0 Repository Administration Baseline

**Purpose:** canonical target for GitHub repository-level settings that cannot be fully represented as normal source files.

**Audit date:** 2026-09-26  
**Repository:** `5erax/ProZ0`

## Observed repository state at audit

Observed through available GitHub repository APIs:

- Visibility: **public**
- Default branch: `main`
- Repository admin permission for connected owner: **yes**
- Issues: enabled
- Projects: enabled
- Wiki: enabled
- Pages: **disabled**
- Discussions: **disabled**
- Repository rulesets: **none**
- `main` branch: **not protected**
- Auto-merge: disabled
- Auto-delete head branches: disabled
- "Update branch" support: disabled
- Merge commit, squash merge and rebase merge: all enabled
- Repository description: empty
- Topics: empty
- Open-source license: not declared
- Existing CI workflow: present

The connected GitHub integration can manage repository files/Issues/PRs but does not expose authenticated writes for repository rulesets, branch-protection administration, Actions policy screens, repository webhooks, environments, Pages enablement, or Discussions enablement. Those controls must be applied from GitHub Settings (or an admin-capable automation outside this connector).

## Target: General

Recommended repository settings:

- Description:
  `Web-first 2D pixel survival/exploration sandbox about rebuilding humanity and uncovering a prior civilization.`
- Website: set to the GitHub Pages URL after first successful Pages deployment.
- Topics:
  - `game-development`
  - `typescript`
  - `pixijs`
  - `vite`
  - `pixel-art`
  - `survival-game`
  - `procedural-generation`
  - `multiplayer`
- Issues: ON
- Projects: ON
- Wiki: OFF — canonical knowledge belongs in versioned repository docs.
- Discussions: ON
- Allow squash merging: ON
- Allow merge commits: OFF after current active PRs are reconciled
- Allow rebase merging: OFF for the standard project path
- Auto-merge: ON
- Automatically delete head branches: ON
- Always suggest updating pull-request branches: ON

Do not change merge strategy in the middle of an active critical PR review if doing so would disrupt the current gate; apply at the next safe repository-admin window.

## Target: Ruleset for `main`

Create a repository **branch ruleset** named:

`main-protection`

Enforcement: **Active**

Target: default branch / `main`

Rules:

- Restrict deletions
- Block force pushes
- Require a pull request before merging
- Required approvals: **1**
- Dismiss stale approvals when new commits are pushed
- Require review from Code Owners for matching paths
- Require conversation resolution before merging
- Require status checks before merging
- Require branch to be up to date before merging
- Require linear history once merge-commit merging is disabled

Required status checks after the workflows have completed successfully at least once:

- `quality`
- `dependency-review`
- `analyze`

Do not require signed commits yet; introduce it only after all human/automation contributors have a verified signing path.

Bypass should be emergency-only. Routine PM work must use the same PR/review gates as everyone else.

## Target: Actions — General

Repository workflows are designed for least privilege.

Recommended Actions policy:

- Allow GitHub-owned actions and reusable workflows used by this repository.
- Do not broadly allow arbitrary third-party actions without review.
- Default workflow token permission: **Read repository contents and packages**
- Do not grant global write permission to `GITHUB_TOKEN`.
- Allow elevated permissions only per workflow/job where needed.
- Pages workflow is the intentional exception and requests:
  - `pages: write`
  - `id-token: write`

Fork / external-contributor workflows should require approval for first-time contributors before privileged or expensive workflows run.

Artifact/log retention baseline: **30 days** unless a longer QA evidence requirement is explicitly approved.

## Target: Actions — Runners

Current baseline:

- GitHub-hosted `ubuntu-latest`
- No self-hosted runner required

Do not add self-hosted runners until there is a concrete performance, platform or cost reason plus a patching/isolation owner.

## Target: Actions — Policies / Policy insights

This repository is owned by a **personal GitHub account**, not an organization. Organization/enterprise-wide Actions policy and policy-insight surfaces may therefore be unavailable or not applicable.

If ProZ0 is later transferred to a GitHub Organization, move action allowlists, runner groups and policy monitoring to the organization level.

## Target: OIDC

No custom external-cloud OIDC subject is required yet.

The GitHub Pages workflow uses GitHub's Pages OIDC token through `id-token: write`. Do not configure a custom repository OIDC subject until a real cloud/deployment provider and trust policy are selected.

Never add long-lived cloud credentials merely to make the OIDC page look configured.

## Target: Webhooks

No generic webhook should be created without:

- a real HTTPS receiver endpoint;
- an owning system/team;
- a webhook secret;
- an event allowlist;
- retry/rotation/incident ownership.

Prefer GitHub Actions for repository-local automation.

When an external integration is approved, use a signed webhook and subscribe only to required events. Do not create a placeholder webhook.

## Target: Environments

Create environments only for real deployment gates.

### `github-pages`

Used by `.github/workflows/pages.yml`.

- Deployment branch: `main` / protected branch
- Environment URL: supplied by deployment
- Add reviewer protection if release policy requires explicit PO/QA promotion

### `production`

Reserve for a future non-Pages production host.

Do not store unused secrets in an empty environment.

## Target: GitHub Pages

Repository workflow is prepared at:

`.github/workflows/pages.yml`

Settings → Pages:

- Source: **GitHub Actions**
- Custom domain: none initially
- Enforce HTTPS: ON

First deployment is manual through the `pages` workflow. This intentionally avoids deploying every `main` push as a product/release build.

## Target: Discussions

Enable GitHub Discussions and use categories such as:

- Announcements
- General
- Ideas
- Q&A
- Show and tell

Issues remain the place for actionable bugs, approved/proposed work and project records. Discussions are for conversation that is not yet a task.

## Community standards

Repository-resident standards include:

- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `GOVERNANCE.md`
- Issue forms
- Pull-request template
- CODEOWNERS

### License

An open-source license is intentionally **not auto-selected**. Licensing is a legal/product-owner decision, especially because two companies contribute code/assets. Choose a license only after ownership and redistribution rights are confirmed.

## Security baseline

Repository files now provide:

- CodeQL workflow
- dependency-review workflow
- Dependabot update configuration

Repository-admin settings should also enable, where available:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Private vulnerability reporting

Do not weaken these controls merely to make a PR pass; route false positives through review and documented exceptions.

## Verification after admin settings are applied

Confirm:

1. `main` shows an active ruleset/protection.
2. A direct non-bypass push to `main` is rejected.
3. A PR cannot merge before `quality`, `dependency-review`, and `analyze` pass.
4. A matching governance/workflow path requests CODEOWNER review.
5. New PRs can update from `main`.
6. Merged branches are deleted automatically.
7. Discussions tab is visible.
8. Pages source is GitHub Actions.
9. Manual `pages` workflow produces an HTTPS site.
10. Security tab shows dependency/code-scanning results.
