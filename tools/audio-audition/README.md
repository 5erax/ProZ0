# ProZ0 Local Audio Audition Harness

Task: \`#119 / P1-DEVOPS-003\`  
Owner: \`B-DEVOPS-01 / BUILD_TOOLS_DEVOPS / COMPANY_B\`  
Review route: \`B-DEVOPS-01 → PM-B\`

This is a **local/offline human listening aid** for \`#80 / P1-AUD-002\`. It does not modify the audio pack, integrate audio into the game, score perception automatically, post to GitHub, or mark \`#80\` accepted.

## Exact input required

Expected source: PR \`#95\` at exact audio head:

\`fc9e838589b43d103e26e772dea7bb4dc59f2b89\`

Point the tool at a repository/worktree root containing:

- \`assets/phase1/audio/manifest.json\`
- \`assets/phase1/audio/bundles/*.zip\`

The harness **never falls back to current \`main\`**. It verifies the Git blob fingerprint of the exact PR #95 manifest and all 12 manifest-referenced ZIP bundles before extraction. A different manifest or bundle fails closed even if paths are unchanged.

A separate checkout/worktree pinned to PR #95 head is recommended. The harness may live on another branch because \`--audio-root\` is always explicit.

## Requirements

- Python 3.10+ recommended.
- Local browser with WAV playback support.
- No npm install, CDN, SaaS, remote service or account.

Only Python standard-library modules are used.

## Validate / prepare only

\`\`\`bash
python tools/audio-audition/audition.py \
  --audio-root /absolute/path/to/pr95-audio-checkout \
  --validate-only
\`\`\`

Generated review material is written only under:

\`tools/audio-audition/.generated/current/\`

The directory is ignored by \`tools/audio-audition/.gitignore\`.

## Start the local browser UI

\`\`\`bash
python tools/audio-audition/audition.py \
  --audio-root /absolute/path/to/pr95-audio-checkout
\`\`\`

Default URL:

\`http://127.0.0.1:8765/\`

Use \`--no-open\` to stop automatic browser launch. Use \`--port 0\` to let the OS choose a free local port.

## ZIP extraction / immutability

\`manifest.json\` is the single source of truth.

For every manifest asset the tool:

1. verifies the exact PR #95 manifest fingerprint;
2. verifies the exact PR #95 source ZIP fingerprint;
3. resolves manifest \`archive\`;
4. resolves manifest \`internal_path\` inside the ZIP;
5. reads the WAV bytes with Python \`zipfile\`;
6. writes those exact bytes into the local generated directory;
7. rereads the generated file and requires byte equality;
8. fingerprints source ZIPs again and fails if source bytes changed;
9. creates generated \`index.json\` for the playback UI.

It never normalizes, transcodes, resamples, trims, rewrites or overwrites source ZIP/WAV data.

## Manifest-driven playback fields

The UI displays:

- \`event_id\`
- \`family\`
- \`priority\`
- loop/non-loop
- variant derived from manifest \`internal_path\`
- \`archive\`
- \`internal_path\`

The harness has no second complete event inventory. Gate views are derived from manifest metadata/event IDs required by #119.

## Six required human listening gates

### A — Predator states

Load Gate A and compare:

\`ALERT → CHASE → WINDUP → RELEASE → RECOVERY\`

Judge perceptual state separation.

### B — Survival-warning family/severity separation

Load Gate B and compare manifest survival events whose IDs identify warning/critical severity states. Record whether family identity and urgency are distinct.

### C — Cold Rain masking/readability

Load Gate C and compare Cold Rain warning/active cues. Use the complete inventory or Gate E for critical-cue comparison and note masking/readability problems.

### D — Loop click/fatigue

Load Gate D. Loop-enabled assets expose a loop toggle; listen continuously for boundary clicks and short-cycle fatigue. The harness never edits loop boundaries.

### E — Ambience/music yielding to critical cues

Load Gate E to sequentially compare \`ambience\`/\`music\` BED material with manifest \`CRITICAL\` cues.

### F — Ruin / Ancient Alloy Shard tone and canon guardrails

Load Gate F and compare ruin/shard cues. Human review should preserve the accepted guardrail: engineered / old / absent / unresolved, without implying builder identity, language, faction, purpose, supernatural truth, or decoded technology.

## Comparison / filtering

Each asset card has native browser audio controls plus Replay. Manifest loop assets expose loop support.

The dedicated comparison panel provides Previous / Replay / Next and a clickable queue. Family, event-id text, priority, and loop filtering are available across the complete manifest-driven inventory.

## Human notes / verdict export

Each gate allows:

- \`PASS\`
- \`FAIL\`
- \`NEEDS FOLLOW-UP\`
- free-form notes

Notes remain in browser local storage keyed to the expected exact audio head.

\`Export Markdown verdict\` downloads a local Markdown file containing all six gate statuses/notes and source identity.

Exporting does **not** submit to GitHub and does **not** change #80 lifecycle state.

## Returning evidence

After a human actually listens:

1. complete all six gate statuses and notes;
2. export the Markdown verdict;
3. add listener identity/role, playback environment, and local date/time;
4. return the human listening evidence to PM-B and A-QA through the existing #80 lifecycle.

A harness validation run is not listening evidence.

## Clean generated files

\`\`\`bash
python tools/audio-audition/audition.py --clean
\`\`\`

This removes only \`tools/audio-audition/.generated/\`.

## Self-tests

\`\`\`bash
python -m unittest discover -s tools/audio-audition -p 'test_audition.py'
\`\`\`

The tests use a synthetic manifest/ZIP to verify manifest parsing, archive/path failure behavior, byte-preserving extraction/indexing, source immutability, path traversal rejection, and gate derivation.

The #119 handoff separately records validation against the exact PR #95 manifest/archive structure. Human playback remains a separate QA input.
