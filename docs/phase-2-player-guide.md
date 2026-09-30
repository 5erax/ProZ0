# Colony depth — player guide and delivery boundaries

From the launcher choose **Start Colony World**, or **Continue with Colony Depth** to keep an accepted generation-v3 Phase 1 save. Colony mode upgrades it additively to generation-v4 ecosystem clusters, retaining original terrain/entities, depletion, inventory, exploration and structures. Save to commit that upgrade. The original Continue button remains available. The gear contains sound/volume, display size, fullscreen, controls and **Save world [L]**; browser storage still owns the save.

## Exploration and colony choices

The Landing grassland stays familiar. Beyond 96 world units, seeded outer regions become Mist Marsh and Ochre Badlands. Their terrain palettes, survey silhouettes, ambient sound, exposure and recurring weather differ. Inspect a visible site from nearby through **Journal [J]**. The journal separates observed details from unresolved questions; only inspected sites enter the map. No coordinates of hidden sites or alien-history answers are granted.

Research [U] spends the materials shown beside each icon. Return within the landing base to invest in Field Survey, Water Stewardship, Expanded Storage and Cultivation, respecting prerequisites. Research belongs to the shared colony. Professions are a permanent choice:

| Profession | Earn it | Effect |
| --- | --- | --- |
| Explorer | Field Survey and two visited regions | Local survey radius rises from 6.25 to 8 |
| Engineer | Expanded Storage | Researched storage rises from 150 kg / 180 volume to 200 kg / 240 volume |
| Cultivator | Cultivation | Planted crops advance twice per active simulation step |

Expanded Storage alone raises crates from 100 kg / 120 volume to 150 kg / 180 volume. Move one and Move stack buttons use the same range, revision and capacity checks as keyboard transfers. Carry limits stay unchanged.

In Inventory choose **Build storage crate**, then Prepare kit. A crate costs **4 Timber + 2 Cordage**. Craft its kit, place the crate on valid nearby ground, then open Inventory beside it to transfer supplies. Nearby discovered trees, plants, rocks and water can also be clicked or focused and activated with Enter; E remains available. Range/tool/capacity checks still apply.

Repeated harvesting reduces the local Ecology indicator; pressure slows renewal and, around the colony, crop growth. Ecology recovers during active play. Marsh vegetation renews faster than marsh ore; badlands minerals renew faster than badlands vegetation. Water Stewardship improves recovery, animal care and rain-assisted crop growth. Shelter and thermal wraps remain useful during regional exposure. The weather bar warns before recurring rain or dry wind.

Enable sound starts one ambient voice and one action-cue voice after your click. Mute and the volume slider remain available. The reused audio is documented in `assets/phase2/audio/README.md`; automated playback is not a claim of human listening approval.

## Scope and release boundaries

- Region rules and presentation preserve accepted generation-v3 geography. The explicit generation-v4 ecosystem adds resource clusters without replacing legacy terrain/entity identities or resetting harvested nodes. The two survey sites add bounded observations. Resource types remain the same; biome-specific renewal changes sustainable supply.
- Cultivation and husbandry extend the existing bed and pen. They do not add offline growth, breeding, arbitrary farm placement or greenhouses; greenhouse/industry progression belongs to Phase 3.
- The hosted authority and WebSocket tests cover eight real clients, shared research, stable identities, stale/duplicate commands and reconnect. GitHub Pages is a static solo browser candidate; these tests do not provision a public multiplayer service or imply an internet co-op session happened.
- Existing generation-v2 saves remain rejected safely. Generation-v3 saves can acquire the separately versioned colony extension. Future or corrupt extension versions, absent profession owners and ecology clocks beyond authority time fail validation.
- Pixel terrain/sites and soft regional lighting build on the accepted isometric scene. No new physical floating-island simulation is introduced.

Phase 2 closes only after release evidence and a real Owner decision on the published candidate. Automated verification never supplies that decision.
