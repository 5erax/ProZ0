# P1-AUD-002 — Phase 1 Core Audio Asset Pack

Owner: `B-AUD-01 / AUDIO_DESIGNER / COMPANY_B`
Source: `#80 / P1-AUD-002`
Accepted audio direction: `#79 / P1-AUD-001` @ `f9d76c729d6831b40cd30f8283cc1ff02e9abf8a`
Role Pack: `2.0.0` @ `a8aec0b8d377aa9c7e568573e8ba6a3a87e02cb6`

## Stage
`ASSETS_PRODUCED_TECHNICALLY_VALIDATED_UNLISTENED`

Repository bundles under `assets/phase1/audio/bundles/` contain 108 actual WAV assets covering all 86 accepted Phase 1 semantic event IDs. The ZIP bundles are transport packaging only; they do not define a runtime audio architecture.

## Format
- WAV, mono, 16000 Hz, PCM16.
- Event ID is recoverable from every filename.
- Loops use `__loop__v01`.
- Repetition-heavy events have v02/v03 variants.
- `manifest.json` maps every semantic ID to archive + exact internal path, duration, priority, loop intent, format, peak/RMS, and listening status.

## Guardrails
- `predator_attack_windup`: 0.50 s, inside approved 0.55 s state.
- Cold Rain does not imply direct HP damage.
- Ruin/Ancient Alloy remains engineered/old/absent/unresolved: no builder identity, language, faction, purpose, supernatural truth, or decoded technology.
- Success, invalid, stale, personal reward, and remote shared-information semantics remain separate.
- Music is sparse punctuation and subordinate to critical gameplay cues.

## Validation
- 86/86 semantic IDs covered; 108 WAVs.
- No full-scale clipping; no near-silent asset below -48 dBFS RMS.
- No loop edge jump > 0.02 linear.
- No runtime integration performed.

## Listening gate
`UNLISTENED`. This runtime cannot audition audio. Metadata/waveform checks are not listening evidence. Listening must verify Predator state separation, survival-warning separation, Cold Rain masking, loop fatigue/click perception, music/ambience yielding, and ruin-canon tone.

## Downstream
Handoff: `B-AUD-01 → PM-B / B-PM-01`.
Runtime integration stays with existing Company A ownership. #55 explicitly records `A-GE-01 / GAMEPLAY_ENGINEER` as integration support; #56 remains downstream and unchanged.

`PROJECT_OWNER_ACTION: NONE`
