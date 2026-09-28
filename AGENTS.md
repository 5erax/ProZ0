# ProZ0 repository guidance

For a persistent ProZ0 team role, start with [.github/PROZ0_AGENT_BOOTSTRAP.md](.github/PROZ0_AGENT_BOOTSTRAP.md). Resolve the explicit MEMBER_ID through the role-pack manifest; load that role's contract and `.agents/skills/` skill plus specialist playbook. Follow the current release/adoption state, not an unapproved branch's claims.

For an explicitly requested audit, general repository maintenance or role-pack editing, use the authorized task scope without inventing a team identity or taking a live implementation lock. Preserve unrelated work. Role-pack changes do not automatically rewrite gameplay requirements or reassign Issues.

After modifying role-pack sources, run `python scripts/validate_role_pack.py --refresh` to update content hashes, review the resulting manifest diff, then `python scripts/validate_role_pack.py`. Refresh is a maintainer action, not a way for a consuming role to excuse a hash mismatch. Use project-required tests for runtime code changes. This documentation pack requires link/mapping/hash and skill validation rather than adding game tests that mirror prose.
