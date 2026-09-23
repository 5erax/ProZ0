# ADR-P1-TECH-009 — Phase 1 Performance, Observability, and CI Quality Gates

**Task:** P1-TECH-009 / Issue #45  
**Role:** Technical Lead / Game Architect  
**Member:** A-TL-01  
**Home company:** COMPANY_A  
**Coordinating PM:** PM-A / A-PM-01  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PM-A VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-TECH-002..008 / #38..#44  
**Current-state CI input:** P1-DEVOPS-001 / #71  
**Implementation authorization:** NONE — ADR / quality-gate contract only.

---

# 1. Context

Phase 1 integrates the first meaningful ProZ0 browser vertical slice across:

- deterministic 60 Hz authoritative simulation;
- continuous movement and presentation;
- chunk generation/materialization;
- shared fog/world mutations;
- item/gather/craft/repair transactions;
- survival/combat/death/recovery;
- building/power/machine state;
- Save V2;
- hosted WebSocket co-op for 2–4 active players;
- future-compatible protocol structure up to 10 players.

The milestone is not technically acceptable merely because each subsystem passes its own functional tests.

The integrated candidate must prove that:

- authoritative ticks remain timely enough to preserve the 60 Hz contract;
- browser work does not create visible interaction/frame stalls;
- deterministic chunk/world work cannot create long blocking spikes;
- save/load/import remains recoverable and bounded;
- hosted co-op exposes latency/backpressure/desync rather than hiding them;
- exact-main evidence is reproducible and attributable to one candidate SHA;
- CI failures identify the violated layer/fixture;
- no production analytics service is required.

This ADR defines those measurable gates.

It does **not**:

- change gameplay values;
- define production browser-support hardware;
- require 10-player production certification;
- introduce a telemetry SaaS;
- implement CI/workflow/tooling changes;
- implement runtime feature systems.

---

# 2. Information classification

## CONFIRMED

From accepted project sources:

- authoritative simulation is fixed at 60 Hz;
- authoritative ticks are never intentionally skipped to catch up;
- presentation may interpolate but cannot change canonical state;
- Phase 0 movement responsiveness target is P95 <= 50 ms;
- Phase 1 hosted acceptance is 2–4 active players;
- architecture must remain structurally suitable for 10 players;
- Phase 1 does not require 10-player production load certification;
- WebSocket is reliable ordered transport for Phase 1;
- movement input refresh is at least every 15 authority-tick equivalents and movement lease is 60 ticks;
- OperationId protects retryable semantic mutations;
- baseline snapshot + revisioned updates is the hosted replication model;
- save/live commit and durable save confirmation are distinct;
- Save V2 is reconstructive, validated, atomic and stale-write protected;
- current CI already runs lockfile install, typecheck, lint/boundaries, unit, integration, determinism, build, Chromium browser tests and production-preview E2E;
- current CI retains P0 responsiveness + visual evidence for 30 days;
- current CI does not retain exact built `dist/`;
- current repository does not currently enforce CI through branch protection/rulesets;
- current PR workflow may test a synthetic merge commit rather than the source branch commit;
- current CI uses Node 24 major but Node/npm/runner patch versions may drift.

## DECISION

Phase 1 uses:

- absolute technical budgets measured on fixed fixtures;
- exact-head evidence manifests;
- real Chromium browser measurements;
- controlled loopback/synthetic-network tests rather than public-Internet timing;
- two-client blocking PR hosted smoke;
- four-client exact-main hosted acceptance evidence;
- retained structured evidence + failure diagnostics;
- no remote production analytics dependency.

---

# 3. Quality-gate principles

1. **Correctness beats speed.** A fast wrong result never passes.
2. **Performance measurement cannot become gameplay authority.**
3. **No gameplay branch may depend on Performance API, wall clock, CI timing, network RTT or telemetry.**
4. **Measure representative bounded Phase 1 fixtures, not arbitrary microbenchmarks.**
5. **Use absolute thresholds, not “faster than previous commit” as the only criterion.**
6. **PR evidence may qualify a change, but milestone acceptance requires exact integrated `main` evidence.**
7. **A missing required evidence artifact is a gate failure even if the underlying test command exited zero.**
8. **CI timing noise is handled with warmup + percentiles + generous hard ceilings, not by silently ignoring slow runs.**
9. **Failure evidence must expose seed/fixture/tick/revisions needed to reproduce the issue.**
10. **No resume credential, secret, private token or sensitive payload is written into evidence.**

---

# 4. Gate classes

Phase 1 defines four gate classes.

## G0 — correctness / architecture

Existing mandatory gates remain blocking:

1. lockfile install;
2. TypeScript typecheck;
3. lint + architecture boundaries;
4. unit tests;
5. integration tests;
6. determinism/golden tests;
7. production build;
8. real-browser tests;
9. production-preview E2E.

No G1/G2/G3 result can waive G0.

## G1 — deterministic runtime performance

Controlled Node/browser fixtures measuring:

- authority tick cost;
- chunk generation/materialization;
- browser frame work;
- Save V2 snapshot/load/import.

## G2 — hosted co-op quality

Controlled hosted tests measuring:

- 2–4 client correctness;
- command/motion delivery latency;
- backpressure behavior;
- sequence-gap/desync detection;
- resync/rejoin.

## G3 — exact-main retained evidence

Integrated-main candidate evidence:

- exact SHA identity;
- environment identity;
- build artifact;
- structured metric manifests;
- browser traces/screenshots on failure;
- hosted multi-client results;
- save/load results.

---

# 5. Standard measurement rules

All timing gates use:

- monotonic elapsed clock only for diagnostics/measurement;
- no timing value fed into simulation;
- warmup before samples;
- raw samples retained for failing runs where practical;
- nearest-rank percentile calculation or an equivalently documented exact method;
- one fixture manifest identifying input seed/workload;
- exact source/tested SHA;
- exact workflow commit SHA;
- Node/npm/browser versions;
- CI runner OS/image metadata where available.

If a browser/CI environment cannot produce the required monotonic measurement, the gate fails as **EVIDENCE_UNAVAILABLE** rather than silently passing.

---

# 6. Authority tick budget

Authoritative simulation contract:

- 60 Hz;
- nominal tick interval = 16.666... ms.

## Representative fixture

The Phase 1 authority benchmark must include, once corresponding systems exist:

- 4 active players;
- movement input for all players;
- representative Food/Water/Stamina/Temperature updates;
- one active hostile encounter;
- shared inventory/container activity;
- one machine/power foothold;
- relevant world/environment update;
- no rendering;
- deterministic scripted input/command tape.

Run:

- >= 300 warmup ticks;
- >= 10,000 measured ticks.

## Hard gate

On the CI authority benchmark:

- P95 tick execution <= **8 ms**;
- P99 tick execution <= **12 ms**;
- no measured tick > **33.34 ms**;
- no three consecutive ticks may each exceed **16.67 ms**.

Why:

- 8/12 ms preserves headroom below the 16.67 ms fixed-step interval;
- one noisy tick does not automatically invalidate a candidate;
- repeated budget misses indicate authority cannot sustain its fixed-step contract;
- >2-frame single stalls are rejected.

The benchmark records:
- P50/P95/P99/max;
- tick index for max;
- subsystem timing breakdown when instrumented.

---

# 7. Browser frame-work and responsiveness budget

Browser performance is measured in real headless Chromium in CI against the production build.

## 7.1 Application frame-work budget

Measure application-controlled work per presentation frame after warmup:

- input/read-model application;
- camera/presentation update;
- Pixi scene update;
- renderer invocation boundary.

Do not measure browser idle time as application work.

Hard gate over >= 30 seconds steady fixture:

- P95 application frame work <= **12 ms**;
- P99 <= **20 ms**;
- no application-controlled frame-work sample > **50 ms**.

A >50 ms sample is a browser long-stall risk and fails the fixture.

## 7.2 Movement responsiveness inheritance

The existing Phase 0 movement responsiveness gate remains blocking:

- start P95 <= **50 ms**;
- stop P95 <= **50 ms**;
- direction-change P95 <= **50 ms**.

Phase 1 integration may not weaken this threshold.

## 7.3 Frame-interval diagnostic

Retain rAF/frame-interval distribution as diagnostic:

- P50;
- P95;
- P99;
- max;
- count >33.34 ms;
- count >50 ms;
- count >100 ms.

Because headless scheduling can vary by CI runner, frame interval is diagnostic unless a later supported-browser/reference-hardware contract promotes it to a product gate.

Application-controlled frame work remains the blocking browser CPU gate.

---

# 8. Chunk generation/materialization budget

Use deterministic Phase 1 chunk fixtures including:

- empty/new generated chunk;
- resource-heavy representative chunk;
- ruin/landmark chunk;
- chunk with representative persisted resource/fog/landmark delta;
- created persistent entities where implemented.

Benchmark at least 200 generated/materialized chunks across stable coordinate fixtures after warmup.

## Hard gates

### GeneratedBase

- P95 <= **20 ms/chunk**;
- P99 <= **40 ms/chunk**;
- max <= **100 ms/chunk**.

### PersistedDelta validation + materialization

- P95 <= **30 ms/chunk**;
- P99 <= **50 ms/chunk**;
- max <= **100 ms/chunk**.

### Authority protection

No synchronous chunk operation executed inside the fixed authority tick path may cause the authority tick gate in Section 6 to fail.

World implementation may schedule/budget work, but it may not skip authoritative ticks to hide chunk cost.

---

# 9. Shared fog/discovery diagnostic budget

Fog reveal is incremental and bounded to affected exploration fragments.

For the standard 4-player movement fixture:

- P95 total fog-reveal mutation work per authority tick <= **2 ms**;
- P99 <= **4 ms**.

A no-change reveal should avoid revision mutation.

This is included in authority timing breakdown so a fog regression cannot hide inside the aggregate tick budget.

---

# 10. Save V2 benchmark fixture

The representative Save V2 fixture must be deterministic and include:

- 4 PlayerRecordV2 records;
- survival/progression/equipment state;
- player inventories;
- at least 64 chunk records spanning explored/unexplored and dirty/clean history;
- resource depletion/regeneration state;
- fog/discovery;
- investigated ruin + reward claim state;
- predator mutation;
- one foothold;
- Habitat;
- Workbench;
- Compact Power Unit;
- Atmospheric Water Condenser with non-zero partial progress;
- 4 Storage Crates with representative contents;
- machine output container;
- at least 2 Death Cache / persistent world-entity records;
- canonical Cold Rain environment event;
- non-zero revisions across aggregates.

No artificial Phase 2 data is introduced merely to inflate the fixture.

---

# 11. Save/load/import budgets

Measured in real Chromium against the production persistence adapter when available.

## 11.1 Authority snapshot capture

Capturing an immutable coherent save snapshot from live authority:

- P95 <= **16 ms**;
- max <= **33.34 ms**.

Persistence I/O continues asynchronously after snapshot capture.

The authority must not freeze gameplay for the entire durable-write duration.

## 11.2 Durable IndexedDB save

Representative fixture:

- P95 <= **750 ms**;
- max <= **2,000 ms**.

A slow save does not become gameplay authority failure by itself, but exceeding the hard evidence budget blocks the integration candidate until investigated.

## 11.3 Load + validate + reconstruct

From IndexedDB read to coherent unpublished authority reconstruction ready for publication:

- P95 <= **1,500 ms**;
- max <= **4,000 ms**.

Corrupt/incompatible fixtures must fail explicitly and may not publish partial authority.

## 11.4 Export

Canonical bundle creation + validation:

- P95 <= **1,500 ms**;
- max <= **4,000 ms**.

## 11.5 Import

Validate + migrate where applicable + reconstruct + atomic replace preparation:

- P95 <= **2,500 ms**;
- max <= **6,000 ms**.

Invalid import must never overwrite a valid world, regardless of timing.

---

# 12. Persistence observability

Development/test diagnostics must expose at minimum:

- save snapshot worldRevision;
- authorityTick;
- subsystem revisions included;
- snapshot capture ms;
- serialization/canonicalization ms;
- durable write ms;
- total checkpoint ms;
- load read ms;
- migration ms;
- validation ms;
- reconstruction ms;
- import validation/replacement ms;
- failure category from Save V2 taxonomy;
- stale-write expected/actual revision;
- dirty/persisted revision for affected chunk/world aggregate.

Never log:

- ResumeCredential plaintext;
- private tokens;
- arbitrary user chat/input text;
- unbounded full save payload by default.

---

# 13. Hosted co-op acceptance load

Phase 1 acceptance:

- every PR with hosted/network changes: **2-client** real-browser hosted smoke;
- exact integrated-main milestone candidate: **4-client** real-browser hosted E2E.

Architecture remains collection/ID based for 10 clients, but 10-player performance certification is explicitly not a Phase 1 gate.

---

# 14. Network latency diagnostics

Application Ping/Pong cadence while READY:

- one ping every **2 seconds**;
- record latest RTT + rolling P50/P95;
- diagnostic state:
  - NORMAL: RTT <250 ms;
  - DEGRADED: RTT >=250 ms and <500 ms;
  - SEVERE: RTT >=500 ms.

These labels are diagnostics only.

They do not:
- change damage;
- change movement speed;
- change contention priority;
- extend leases;
- alter simulation.

---

# 15. Controlled hosted latency gates

Public-Internet latency is not a CI gate.

Use controlled loopback and deterministic transport-delay fixtures.

## 15.1 Loopback

### 2-client PR fixture

- discrete command submit -> authoritative CommandResult observed by submitting client:
  - P95 <= **100 ms**;
- server authoritative movement view generation -> client application:
  - P95 age <= **100 ms**.

### 4-client exact-main fixture

- discrete command result P95 <= **150 ms**;
- motion-view age P95 <= **150 ms**.

## 15.2 Synthetic 100 ms RTT fixture

Using a test transport/proxy that adds:

- 50 ms one-way base delay;
- <=20 ms deterministic jitter envelope;
- no packet loss for the latency fixture.

Hard gate:

- discrete command result P95 <= **350 ms**;
- authoritative motion-view age P95 <= **300 ms**.

The test proves bounded protocol/application overhead, not Internet SLA.

---

# 16. Sequence/desync checkpoint

Every READY hosted client must be able to diagnose replication divergence.

## Checkpoint cadence

Server emits AuthorityCheckpointV1 at least once every:

- **120 authority ticks** = 2 seconds nominal.

Checkpoint includes:

- sessionEpoch;
- authorityTick;
- last serverMessageSeq;
- selected aggregate revisions;
- optional deterministic diagnostic digest.

## Required digest

Phase 1 diagnostic digest uses:

`sha256-canonical-json-v1`

over a bounded canonical checkpoint projection containing:

- sessionEpoch;
- authorityTick;
- relevant player revisions;
- relevant container revisions;
- foothold/build/power/machine revisions;
- exploration/landmark revisions in interest scope;
- durable worldRevision where applicable.

Do not hash:
- renderer state;
- wall-clock timestamps;
- transient network queue state;
- secrets.

Digest is for diagnostics/resync detection, not cryptographic trust/authentication.

## Mismatch behavior

On mismatch/gap:

- increment diagnostic counter;
- capture expected/actual checkpoint metadata;
- request resync;
- client state never becomes authority.

Controlled injected mismatch/sequence-gap test:

- resync begins <= **250 ms** after mismatch is detected on loopback;
- READY coherent state is restored <= **2 seconds** after resync request for the representative Phase 1 snapshot;
- authority continues for other clients.

---

# 17. Backpressure policy

One slow client may not stall authoritative simulation.

Per READY client track:

- outbound queued bytes;
- outbound queued message count;
- snapshot/resync backlog age.

## Soft threshold

If either persists for >1 second:

- queued bytes > **256 KiB**, or
- queued messages > **64**,

mark client SLOW_CLIENT and request/coalesce toward resync rather than accumulating unbounded deltas.

## Hard threshold

If either is exceeded:

- queued bytes > **1 MiB**, or
- queued messages > **256**, or
- oldest queued authoritative update age > **5 seconds**,

the server may send RESYNC_REQUIRED where possible and disconnect the slow client.

Authority for other clients continues.

No gameplay rollback occurs because of slow-client disconnect.

---

# 18. Deterministic mismatch diagnostics

Any deterministic/golden mismatch must report enough context to reproduce it.

Minimum evidence:

- exact tested SHA;
- content canonical fingerprint;
- world generation/RNG/seed-derivation versions;
- world seed;
- ChunkCoord where relevant;
- authority tick;
- input sequence / authority ingress ordinal;
- OperationId where relevant;
- expected digest/golden;
- actual digest/value;
- subsystem name;
- first mismatch path/key where available.

Do not “fix” a deterministic mismatch by regenerating the golden in the same change without an explicit compatibility/version decision when required by the owning ADR.

---

# 19. Authority instrumentation boundary

Timing/diagnostics are composed around public system boundaries.

Allowed examples:

- AuthorityRuntime host wraps `step()` with a monotonic timer;
- world host wraps chunk generate/materialize operations;
- persistence adapter/coordinator measures I/O/reconstruction stages;
- server network layer measures queue/RTT/application delay;
- client presentation measures frame work.

Forbidden:

- simulation logic importing DOM or browser Performance APIs;
- world generation branching on measured elapsed time;
- network RTT changing conflict ordering;
- save timing changing canonical revision semantics;
- telemetry callback mutating gameplay state.

A lightweight foundation timing abstraction may be injected by composition for tests, but canonical domain results cannot depend on it.

---

# 20. Development diagnostic buffers

Phase 1 requires no production telemetry backend.

Use bounded in-memory diagnostics.

Recommended default:

- last **2,048** timing samples per metric;
- last **256** structured warning/failure events per category;
- overwrite oldest samples;
- export on demand in tests/development.

Required metric names may be implementation-specific, but the following concepts must exist:

- authority.tick.ms;
- presentation.frameWork.ms;
- world.chunk.generate.ms;
- world.chunk.materialize.ms;
- world.fog.reveal.ms;
- persistence.snapshot.ms;
- persistence.write.ms;
- persistence.load.ms;
- persistence.import.ms;
- network.rtt.ms;
- network.commandLatency.ms;
- network.motionAge.ms;
- network.outboundQueue.bytes;
- network.outboundQueue.messages;
- network.resync.count;
- network.desync.count.

---

# 21. CI extensions

P1-TECH-009 requires future CI implementation to add explicit blocking layers.

Recommended package script surfaces:

```text
test:performance
test:persistence:browser
test:multiclient
test:evidence
```

Exact script composition is Build/Tools implementation scope.

## Pull request gate

For Phase 1 implementation PRs once applicable systems exist:

1. current G0 suite;
2. deterministic authority performance fixture;
3. chunk performance fixture;
4. browser frame-work + movement responsiveness fixture;
5. persistence browser fixture when persistence is touched/available;
6. 2-client hosted real-browser smoke when network/hosted integration is available;
7. structured evidence manifest creation.

## Push to main gate

Every integrated Phase 1 main candidate must run:

1. full PR-equivalent gates;
2. four-client hosted E2E;
3. controlled latency/desync/resync fixture;
4. representative Save V2 performance/recovery fixture;
5. exact build artifact retention;
6. exact-main quality evidence manifest.

By P1-REV-001 / #58 and final QA / #59, all applicable gates are mandatory.

A subsystem that does not yet exist is not fabricated solely to satisfy an earlier unrelated PR; however the integrated milestone cannot pass while an applicable required gate is absent.

---

# 22. Multi-client real-browser E2E strategy

## 22.1 Two-client blocking PR smoke

Minimum:

1. start host authority;
2. connect two independent browser contexts;
3. complete compatibility handshake;
4. verify distinct ConnectionId / expected PlayerId binding;
5. move both players;
6. verify shared world view;
7. perform one revisioned shared mutation/contention;
8. verify both clients converge;
9. disconnect one client;
10. reconnect/resume;
11. verify baseline + incremental state coherence;
12. no fatal console/server error.

Target suite wall time:
- <= **5 minutes** in CI.

## 22.2 Four-client exact-main E2E

Minimum integrated path:

- 4 clients READY concurrently;
- movement for all;
- shared fog;
- shared container/item mutation;
- build/machine mutation where integrated;
- contention winner deterministic by authority ingress;
- one disconnect/rejoin;
- sequence-gap/resync fixture;
- another player can observe/assist a recovery path when death/recovery is integrated;
- no divergent aggregate revisions at final checkpoint.

Target suite wall time:
- <= **10 minutes** in CI.

This is acceptance automation, not the PO-facing 30–60 minute playtest.

---

# 23. Browser failure evidence

On browser/E2E failure retain where practical:

- Playwright trace;
- screenshot;
- console errors;
- page errors;
- server log excerpt;
- exact URL/route;
- viewport/DPR;
- tested SHA;
- workflow commit;
- browser version;
- failing fixture/seed.

No full recording is required for every passing run if it creates unnecessary artifact volume.

---

# 24. Evidence manifest V1

Every Phase 1 quality-evidence artifact bundle contains a machine-readable manifest.

Conceptual:

```ts
interface Phase1QualityEvidenceManifestV1 {
  readonly schemaVersion: 1;
  readonly task: string;
  readonly testedHead: string;
  readonly workflowCommit: string;
  readonly event: 'pull_request' | 'push' | 'manual';
  readonly generatedAtUtc: string;

  readonly environment: {
    readonly os: string;
    readonly node: string;
    readonly npm: string;
    readonly browser: string | null;
  };

  readonly contentFingerprint: string | null;
  readonly fixtures: readonly {
    readonly id: string;
    readonly status: 'pass' | 'fail';
    readonly measurements?: Readonly<Record<string, number>>;
    readonly thresholds?: Readonly<Record<string, number>>;
  }[];
}
```

`generatedAtUtc` is evidence metadata only and never gameplay input.

---

# 25. PR head versus workflow commit

For pull-request workflows GitHub may test a synthetic merge ref.

Therefore every evidence manifest must retain both:

- `testedHead` = source branch head intended for review;
- `workflowCommit` = actual checked-out workflow commit.

A PR gate is valid only when:

- the source head is explicit;
- the workflow commit is traceable to that source + intended base;
- the PR has not changed after evidence generation.

PR evidence is **not** final milestone evidence.

---

# 26. Exact-main acceptance policy

For integrated milestone acceptance, the authoritative evidence source is a **push CI run whose checked-out commit equals the exact accepted `main` SHA**.

Required:

- `testedHead === workflowCommit === candidate main SHA`;
- all applicable G0/G1/G2/G3 gates PASS;
- no newer main commit exists when the candidate is handed to architecture review/final QA;
- evidence manifest identifies all fixtures and thresholds;
- required artifacts are downloadable when handoff occurs.

A green PR merge-ref run cannot substitute for this exact-main run.

If main advances after the evidence run:

- previous evidence remains historical;
- the new candidate requires a fresh exact-main gate run.

---

# 27. Retained artifacts

## 27.1 PR runs

Retain structured quality evidence for at least:

- **30 days**.

This matches the current P0 artifact retention baseline.

## 27.2 Exact-main Phase 1 milestone candidate

Retain for at least:

- **30 days**, and preferably the maximum repository-configured retention up to the platform limit.

Additionally persist a permanent GitHub summary on #58/#59 or approved QA artifact containing:

- exact main SHA;
- workflow run ID;
- artifact IDs/names;
- artifact digests when available;
- gate summary;
- Product Review candidate linkage.

This permanent summary survives artifact expiry.

## 27.3 Production build bits

Exact-main integrated candidate CI must retain:

- production `dist/` output as an artifact;
- SHA-256 digest manifest of retained files/archive;
- exact candidate SHA.

Retention minimum:
- **30 days**.

This is build evidence, not production deployment authorization.

---

# 28. Repository enforcement policy

Technical policy:

> Phase 1 implementation must not be considered merge-ready unless the required CI quality gate has succeeded for the current PR head/base state.

Preferred enforcement:

- GitHub required status check for the CI quality gate;
- protect `main` from bypass/direct change through normal contributor workflow.

Current #71 audit confirms repository-side enforcement is not presently configured.

Until Build/Tools work implements enforcement:

- PM/reviewer manual verification of exact current-head CI is mandatory;
- lack of server enforcement is a known delivery risk;
- it does not make a failing CI acceptable.

Repository ruleset/branch-protection implementation requires a separately authorized Build/Tools task.

---

# 29. Environment reproducibility decision

Phase 1 keeps:

- Node 24 major contract;
- committed package-lock;
- exact project dependency versions;
- Playwright-provisioned Chromium.

Phase 1 does **not** require an exact Node patch, npm patch or frozen GitHub runner image as a hard acceptance prerequisite.

Reason:

- #71 proved patch/runner drift while the full suite remained green;
- absolute quality gates + recorded exact environment provide useful reproducibility without frequent infrastructure-only churn.

Evidence must record exact observed:

- Node version;
- npm version;
- OS/runner identity;
- browser version.

If environment drift is suspected in a regression, rerun/triage; do not update thresholds merely to accommodate a slower runner.

Pinning Actions by immutable SHA, exact Node patch, devcontainers or custom runner images may be future Build/Tools hardening.

---

# 30. Browser provisioning / stale-local-server findings

#71 current-state gaps are classified as follows.

## Browser provisioning

CI parity documentation must include:

`npx playwright install --with-deps chromium`

Future developer setup documentation/tooling should expose this explicitly.

## Local stale preview reuse

CI acceptance is safe because `CI` disables Playwright server reuse.

For local debugging, reusing an existing server is not acceptance evidence.

Future tooling should either:

- disable reuse for verification commands; or
- prove the reused server serves the current exact build SHA.

This is a tooling task, not a gameplay/runtime requirement.

---

# 31. Deterministic performance fixtures

Performance fixture inputs must be stable and source-controlled.

Examples:

- world seed;
- chunk coordinate list;
- authority input tape;
- command sequence;
- save fixture generator/version;
- network latency schedule.

Changing a fixture that affects thresholds requires:

- explicit review;
- retained before/after evidence;
- no silent fixture weakening in the same change that fixes a regression.

A performance gate may not simply reduce workload to regain green CI.

---

# 32. Failure classification

Quality gate failures classify at minimum as:

- FUNCTIONAL_FAILURE
- ARCHITECTURE_BOUNDARY_FAILURE
- DETERMINISM_MISMATCH
- AUTHORITY_TICK_BUDGET
- BROWSER_FRAME_BUDGET
- MOVEMENT_RESPONSIVENESS_BUDGET
- CHUNK_GENERATION_BUDGET
- CHUNK_MATERIALIZATION_BUDGET
- SAVE_BUDGET
- LOAD_BUDGET
- NETWORK_LATENCY_BUDGET
- BACKPRESSURE_FAILURE
- DESYNC_FAILURE
- RESYNC_TIMEOUT
- EVIDENCE_UNAVAILABLE
- BUILD_ARTIFACT_MISSING

CI summary should identify category + fixture.

---

# 33. Exceptions

A technical quality gate may be waived only when:

- Technical Lead records the exact failed gate/evidence;
- Coordinating PM records why lifecycle proceeds;
- waiver scope is limited to one exact candidate SHA;
- waiver is not used to hide data-loss, authority, determinism or security failure.

No waiver is permitted for:

- corrupt/partial save accepted as valid;
- client-authoritative critical mutation;
- determinism mismatch without an approved version/compatibility decision;
- silent inventory/world duplication;
- missing exact-main identity for final milestone acceptance.

Project Owner is not required for ordinary technical-gate disposition unless the proposed waiver changes milestone/product scope or quality/timeline trade-off enough to enter PO authority.

---

# 34. Security/privacy boundary

Diagnostics may record:

- IDs already safe for development;
- revisions;
- tick numbers;
- timing values;
- deterministic seeds/fixtures used by test worlds;
- error categories.

Diagnostics must not persist:

- ResumeCredential plaintext;
- GitHub tokens;
- secrets/environment credentials;
- arbitrary private user content;
- production account identifiers if introduced later.

No external analytics/telemetry service is required.

---

# 35. Required downstream QA use

P1-QA-001 / #46 must:

- map these technical gates into executable cases;
- distinguish automated vs manual/product evidence;
- not invent replacement performance thresholds;
- include 2–4 player hosted paths;
- include exact-main evidence identity checks;
- include save/desync/backpressure failure paths.

QA may propose a threshold change through Technical Lead review if execution evidence shows a gate is invalid/flaky.

---

# 36. Required architecture-review use

P1-REV-001 / #58 must confirm:

- instrumentation stays outside gameplay authority;
- all applicable gates exist;
- exact-main evidence is fresh;
- performance fixture workload was not weakened;
- hosted 4-client evidence exists;
- save/load evidence exists;
- no subsystem bypasses revisions/authority to meet a performance number.

---

# 37. Required final-QA use

P1 final QA / #59 must consume:

- exact-main evidence manifest;
- retained browser traces/artifacts where applicable;
- build artifact digest;
- full functional QA matrix;
- PO-facing playtest build identity.

A stale PR-only quality run is insufficient.

---

# 38. Current CI gap disposition

From #71:

| Finding | P1-TECH-009 decision |
|---|---|
| no server-enforced required CI | required policy; route Build/Tools implementation |
| browser provisioning omitted in older docs | must be documented in CI-parity setup |
| Node/npm/runner patch drift | record exact environment; no exact patch hard-pin required |
| `dist/` not retained | exact-main integrated candidate must retain build artifact |
| local E2E may reuse stale server | local run not acceptance evidence; future tooling should isolate/prove build |
| cross-platform provisioning absent | not a Phase 1 acceptance blocker |
| root README weak discovery | documentation improvement, not quality gate |
| no project credential required | preserve |

---

# 39. Alternatives considered

## Only functional correctness gates

Rejected.

Would miss:
- tick starvation;
- long chunk stalls;
- unusable save/load time;
- slow-client backpressure;
- integration latency/desync regressions.

## Production analytics platform in Phase 1

Rejected.

Adds service/privacy/ops scope not required to prove a browser vertical slice.

## 10-player hard load certification

Rejected for Phase 1.

Architecture supports configurable capacity up to 10, while accepted Phase 1 operational certification is 2–4.

## Exact environment/container image as the only reproducibility mechanism

Deferred.

Current lockfile + Node-major + exact evidence metadata is proportional to Phase 1. Environment hardening remains possible later.

## PR CI only, no post-merge exact-main evidence

Rejected.

PR merge refs/source heads are not identical to the final integrated main candidate.

---

# 40. Trade-offs

Benefits:

- regressions become measurable before Product Review;
- performance remains tied to player-facing technical risks;
- desync/save failures are diagnosable;
- exact-main evidence prevents stale/PR-only acceptance;
- no analytics SaaS or load-test farm is required.

Costs:

- added CI runtime;
- retained artifacts consume storage;
- benchmark fixtures need maintenance;
- multi-client browser tests are more complex;
- generous-but-real timing ceilings still need occasional investigation under CI environment drift.

These costs are proportionate to Phase 1 integration risk.

---

# 41. Future implementation/file plan

This ADR does not authorize implementation.

Expected future work may include, through separately activated tasks:

```text
src/foundation/diagnostics/
  TimingSampleBuffer.ts
  QualityDiagnosticEvent.ts

src/server/diagnostics/
  HostedNetworkDiagnostics.ts
  AuthorityCheckpointDigest.ts

src/client/diagnostics/
  PresentationDiagnostics.ts

tests/performance/
  authority-tick.performance.test.ts
  phase1-world.performance.test.ts
  save-v2.performance.test.ts

tests/e2e/
  hosted-two-client.spec.ts
  hosted-four-client.spec.ts
  hosted-resync.spec.ts

test-results/phase1-quality/
  phase1-quality-manifest.json
```

Potential tooling changes:

- package scripts;
- `.github/workflows/ci.yml`;
- retained build artifact;
- required GitHub status enforcement.

Build/Tools implementation must be separately routed by PM authority.

---

# 42. Acceptance criteria self-check

Issue #45 AC:

- quantitative gates measurable and tied to player-facing risk: **PASS**
- CI can detect architecture/determinism/save/network regressions: **PASS**
- evidence reproducible on exact candidate head: **PASS**
- no production analytics infrastructure required: **PASS**
- ADR + handoff persisted: **ADR ready for persistence; handoff follows after exact re-read**

Additional Technical Lead DoD:

- architecture/ownership explicit: **PASS**
- instrumentation cannot become authority: **PASS**
- browser/runtime/network/save budgets explicit: **PASS**
- failure/observability behavior explicit: **PASS**
- downstream QA use explicit: **PASS**
- exact-main policy explicit: **PASS**
- future 10-player path not unnecessarily blocked: **PASS**
- Phase 1 scope proportional: **PASS**
- implementation authorized: **NO**
- blocking open question: **NONE**

---

# 43. Consequences

After PM-A acceptance:

- #46 can translate the technical gates into executable QA traceability;
- integration/Build/Tools work can implement missing instrumentation, CI scripts, artifacts and server-enforcement policy under separate locks;
- #58 may reject an integrated candidate missing applicable evidence;
- #59 must use exact-main evidence rather than PR-only runs.

The Project Owner does not need to route or adjudicate these normal technical gates.

---

# 44. Implementation authorization

**NOT AUTHORIZED by P1-TECH-009.**

This ADR defines the contract only.

---

# 45. Handoff

**Task:** P1-TECH-009 / #45  
**Role:** Technical Lead / Game Architect  
**Member:** A-TL-01  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-009-performance-observability-ci.md`  
**Handoff to:** PM-A / A-PM-01  
**Recommended next action:** PM-A verifies Issue AC/DoD and accepts TECH READY if satisfied; then evaluate activation of #46 and any separately scoped Build/Tools implementation needed by downstream integration.  
**Project Owner action required:** NONE.
