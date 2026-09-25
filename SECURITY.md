# Security Policy

## Supported code

ProZ0 is pre-release. Security fixes target the current `main` branch and active release/review candidates. Historical development snapshots are not separately supported.

## Reporting a vulnerability

Do **not** publish exploit details, credentials, tokens, private endpoints, or reproduction steps that create immediate abuse risk in a public Issue.

Preferred reporting path:

1. Use GitHub's private vulnerability reporting / Security Advisory flow if it is enabled for this repository.
2. If that option is unavailable, contact the repository owner through GitHub without posting sensitive technical details publicly, then move the report to a private channel.

A useful report includes:

- affected commit/build;
- affected component;
- impact;
- minimal safe reproduction;
- required privileges/preconditions;
- suggested mitigation if known.

## Secrets

Never commit:

- API tokens;
- cloud credentials;
- webhook secrets;
- private keys;
- production credentials;
- session secrets.

Use GitHub Actions secrets/environments for deployment credentials when a deployment provider is introduced.

## Dependency and code scanning

The repository uses Dependabot configuration, dependency review and CodeQL workflows. A clean automated scan does not replace manual review of trust boundaries, persistence, hosted authority, or external integrations.
