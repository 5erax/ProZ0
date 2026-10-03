# Colony depth — player guide and delivery boundaries

From the lobby choose **Single Player → Bắt đầu thế giới mới**, or continue the last committed save. Legacy Phase 1 worlds can continue or upgrade to Colony; the explicit generation-v4 upgrade retains original terrain/entities, depletion, inventory, exploration and structures. The gear contains sound/volume, display size, fullscreen, controls and save. Solo saves stay in browser storage. **Multiplayer** opens the Vercel origin for real username/password accounts and named, password-protected rooms for 2–3 players. See [lobby/account rules](player-lobby-and-accounts.md).

## Exploration and colony choices

The Landing grassland stays familiar. Beyond 96 world units, seeded outer regions become Mist Marsh and Ochre Badlands. Their terrain palettes, survey silhouettes, ambient sound, exposure and recurring weather differ. Inspect a visible site from nearby through **Journal [J]**. The journal separates observed details from unresolved questions; only inspected sites enter the map. No coordinates of hidden sites or alien-history answers are granted.

Research [U] spends the materials shown beside each icon. Return within the landing base to invest in Field Survey, Water Stewardship, Expanded Storage and Cultivation, respecting prerequisites. Research belongs to the shared colony. One profession is active at a time; you can change it at an accessible lab/base when the listed prerequisites are met:

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
- The hosted authority regression covers eight clients, independently from the Owner's public limit of three. Vercel hosts the real room service; GitHub Pages offers solo play and links Multiplayer/Login to that service. Each account retains one private colonist seat per room. Automated Internet/browser verification and genuine human playtests are distinct evidence.
- Existing generation-v2 saves remain rejected safely. Generation-v3 saves can acquire the separately versioned colony extension. Future or corrupt extension versions, absent profession owners and ecology clocks beyond authority time fail validation.
- Pixel terrain/sites and soft regional lighting build on the accepted isometric scene. No new physical floating-island simulation is introduced.

Phase 2 closes only after release evidence and a real Owner decision on the published candidate. Automated verification never supplies that decision.

## Co-op controls and communication

Click your account name in the lobby to set a display name (2–24 Unicode code points). It appears above your colonist and in room chat after rejoining. Your login username stays unchanged.

WASD moves; E interacts with the nearest object; Space attacks nearby predators. I opens inventory/equipment and nearby crate transfer, C crafting with actual material counts, B facilities and connector placement, M the explored local map with teammate markers, U shared research, P professions, J observations, H controls. Click nearby resources, crates, machines, drops and ruins directly. The server checks range, tools, capacity, life state and revisions; blocked actions explain the reason. Drop one item from Inventory; click its visible ground drop or approach and press E to pick it up. Machines expose their output inventory and enable control. Death caches expose recovery transfers; ruin investigation unlocks its physical reward.

Enter opens room chat. Chat is room-scoped, bounded to 50 recent messages and ephemeral across authority restart. It is not part of the world save. Typing suppresses movement. Voice is optional: open Chat, choose Bật voice, and permit your microphone. Tắt mic mutes, Rời voice stops its tracks. Disconnect/reconnect stops voice and requires another explicit opt-in. Direct WebRTC uses STUN; restrictive networks may prevent audio because this release has no TURN relay. Text chat remains available. The media stream goes directly between opted-in peers; room authority relays connection setup only.

The HUD shows five survival meters, carried weight/volume, equipment and contextual interaction feedback. Sound, resolution/fullscreen, shared save, backup and return-to-lobby remain in Settings. A map shows explored terrain within the active streamed region; it does not reveal hidden terrain or act as GPS.
