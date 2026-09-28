"""Validate the versioned role pack without third-party dependencies.

Use --refresh only as a maintainer after intended source edits. Consumers verify.
Hashes normalize CRLF/CR to LF so checkouts on Windows and Linux agree.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
from urllib.parse import unquote


def digest(path):
    return hashlib.sha256(path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')).hexdigest()


def source_paths(root):
    paths = list((root / 'docs/team').rglob('*.md'))
    paths += list((root / '.agents/skills').rglob('*.md'))
    paths += [root / '.github/PROZ0_AGENT_BOOTSTRAP.md', root / '.github/ISSUE_TEMPLATE/proz0-task.md',
              root / 'AGENTS.md', root / 'scripts/validate_role_pack.py']
    return sorted(p.relative_to(root).as_posix() for p in paths if p.is_file())


def validate(root, refresh=False):
    root = Path(root).resolve()
    manifest_path = root / 'docs/team/ROLE_PACK_MANIFEST.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    errors = []
    version = manifest.get('version')
    if not re.fullmatch(r'\d+\.\d+\.\d+', str(version)):
        errors.append('Manifest has invalid semantic version')
    roles, members = manifest.get('roles', []), manifest.get('members', [])
    if len(roles) != 13 or len({r['role_id'] for r in roles}) != 13:
        errors.append('Expected 13 unique roles')
    if len(members) != 14 or len({m['member_id'] for m in members}) != 14:
        errors.append('Expected 14 unique members')
    role_ids = {r['role_id'] for r in roles}
    required = set(manifest.get('shared_required', []) + manifest.get('product_context', []))
    skills = set()
    for role in roles:
        required.update([role['contract'], role['skill'], role['playbook']])
        required.update(role.get('context', []))
        contract = root / role['contract']
        if contract.is_file():
            content = contract.read_text(encoding='utf-8')
            if f'`{role["role_id"]}`' not in content or f'**Contract version:** {version}' not in content:
                errors.append(f'Contract identity/version mismatch: {role["contract"]}')
        skill = root / role['skill']
        if skill.is_file():
            content = skill.read_text(encoding='utf-8')
            front = re.match(r'\A---\n(.*?)\n---\n', content, re.S)
            if not front:
                errors.append(f'Missing frontmatter: {role["skill"]}')
                continue
            names = re.findall(r'^name: (.+)$', front[1], re.M)
            descriptions = re.findall(r'^description: (.+)$', front[1], re.M)
            if len(names) != 1 or not re.fullmatch(r'[a-z0-9-]{1,63}', names[0]) or names[0] != skill.parent.name:
                errors.append(f'Invalid name/folder: {role["skill"]}')
            elif names[0] in skills:
                errors.append(f'Duplicate skill name: {names[0]}')
            else:
                skills.add(names[0])
            if len(descriptions) != 1:
                errors.append(f'Missing/duplicate description: {role["skill"]}')
            if f'**Role pack:** {version}' not in content or f'`{role["role_id"]}`' not in content:
                errors.append(f'Skill identity/version mismatch: {role["skill"]}')
        playbook = root / role['playbook']
        if playbook.is_file() and f'**Role pack:** {version}' not in playbook.read_text(encoding='utf-8'):
            errors.append(f'Playbook version mismatch: {role["playbook"]}')
        assigned = [m for m in members if m['role_id'] == role['role_id']]
        if len(assigned) != (2 if role['role_id'] == 'PROJECT_MANAGER' else 1):
            errors.append(f'Unexpected member count for {role["role_id"]}')
    for member in members:
        required.add(member['activation'])
        if member['role_id'] not in role_ids:
            errors.append(f'Unknown member role: {member["member_id"]}')
        expected_company = {'A': 'COMPANY_A', 'B': 'COMPANY_B'}.get(member['member_id'].split('-')[0])
        if expected_company != member['home_company']:
            errors.append(f'Member company mismatch: {member["member_id"]}')
        activation = root / member['activation']
        if activation.is_file():
            content = activation.read_text(encoding='utf-8')
            for key in ['member_id','role_id','home_company']:
                if f'{key.upper()}: {member[key]}' not in content:
                    errors.append(f'Activation identity mismatch: {member["activation"]} / {key}')
    for relative in required:
        target = (root / relative).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            errors.append(f'Missing/outside required file: {relative}')
    paths = source_paths(root)
    for relative in paths:
        path = root / relative
        if path.suffix != '.md':
            continue
        content = path.read_text(encoding='utf-8')
        for link in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)', content):
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', link) or link.startswith('#'):
                continue
            link_path = unquote(link.split('#')[0].split(' "')[0].strip('<>'))
            target = (path.parent / link_path).resolve()
            if not target.is_relative_to(root) or not target.exists():
                errors.append(f'Broken/outside local link in {relative}: {link}')
    hashes = {p: digest(root / p) for p in paths}
    recorded = manifest.get('files', {})
    if refresh and not errors:
        manifest['files'] = hashes
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    else:
        for path in sorted(set(hashes) | set(recorded)):
            if hashes.get(path) != recorded.get(path):
                errors.append(f'Integrity mismatch/missing file: {path}')
    return errors, len(paths)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        errors, count = validate(args.root, args.refresh)
    except (OSError, KeyError, ValueError) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        return 1
    if errors:
        print('\n'.join('FAIL: ' + error for error in errors), file=sys.stderr)
        return 1
    print(f'PASS: 13 roles, 14 members, {count} source files; links, identity, versions and integrity valid' + ('; manifest refreshed' if args.refresh else ''))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
