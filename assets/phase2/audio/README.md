# Phase 2 runtime audio reuse

These five PCM WAV files are extracted byte-for-byte from the repository's accepted Phase 1 family bundles and declared manifest; no external samples or new canon were introduced. `landing.wav`, `badlands.wav`, `marsh.wav` use amb_landing_module, amb_exploration_day and amb_exploration_night respectively. `research.wav` reuses craft_success; `inspect.wav` reuses ruin_inspect. Original provenance: assets/phase1/audio/manifest.json and source issue #80.

The runtime uses one ambient voice plus one cue voice, starts only after Enable sound is clicked, exposes mute and volume, and pauses/releases both on teardown. Actual human listening/masking acceptance is not inferred from metadata or automated playback checks; final product review includes sound.
