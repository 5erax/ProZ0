# Phase 1 FPS and base construction rework

Owner requested changes to deployed candidate `5bb09c454b1205fa2f34d0308f496e2648b01767`: low FPS, too much text, and unusable base facilities. Issues #162 and #163 track this recovery in the current chat under the Owner's direct execution instruction. This document does not record product acceptance, a novice playtest waiver, or permission to start Phase 2.

## Rendering finding and correction

The Product Review renderer removed and rebuilt terrain, fog, actors and weather DOM on every animation frame. It now retains keyed scene nodes and sprite styles, updates changing positions/frames, and removes only nodes that leave the visible scene. Terrain/fog are culled before creation. HUD changes below whole-unit display precision update diagnostic values without rebuilding the whole HUD. These changes preserve canonical simulation, exploration eligibility, interaction range and save authority.

On Windows Chromium 154 at 1262 × 624, an eight-second idle sample of the old candidate measured 11.74 FPS, frame P95 108.3 ms, and 42,465 nodes both added and removed. The corrected renderer measured 119.80 FPS idle and 117.52 FPS moving, both with frame P95 8.5 ms and no frames above 50 ms. Idle scene node churn was zero. These are measurements on one browser/machine, not a universal device performance guarantee.

The independent full-scene Playwright check measures three-second idle and normal-key movement samples in clear day, rainy day and rainy night. It requires at least 50 FPS, frame P95 no greater than 34 ms, actual authority advancement and actual movement. It writes viewport, browser, timing, authority ticks and scene churn to `test-results/p1-int-001-product-review/full-scene-fps.json`, with the exact source SHA supplied by CI. The existing input response gate remains separate.

The timing project runs after functional tests so the measured game does not compete with another worker launching/playing a second game on the same runner. The first PR CI run recorded 48.18 FPS while the new-world journey was still running in another Chromium worker; it failed the 50 FPS gate. The gate was retained. Each sample is now written before its assertion so a failing sample also remains in the artifact.

## Visual controls and facilities

Survival, equipment and ingredient displays use icons, quantities, condition bars and tooltips. A mouse action bar opens inventory, craft, build, map and colony; when a panel is open it moves below the panel so craft cannot obscure it. Names and status remain available for accessibility and failure reasons.

Craft rows have real action buttons. The five approved facility entries are selectable buttons: Storage Crate, Workbench, Habitat Room, Compact Power Unit and Atmospheric Water Condenser. Prepare kit opens the page containing the selected facility's actual kit recipe; it does not grant items or bypass the workbench requirement. Free placement follows the mouse in world coordinates; click the world or Place to commit. Habitat uses Landing connectors and the connector arrow buttons. Rotation and keyboard shortcuts remain supported.

Preview and actual placement share the same read-only spatial assessment. Missing kits, caps, blocked terrain/access, unexplored ground and base zone limits remain enforced. A dashed base zone uses the real 7.5-world-unit radius. Empty world-drop containers no longer leave a pickup prompt after successful collection.

## Verification and limits

- The new-world E2E starts with production inputs and the real starter inventory. It walks to resources, completes gather channels, crafts Cordage and a Storage Crate Kit, builds the crate, consumes the kit, saves and reopens. It neither grants resources nor relocates the player.
- A raw-material fixture separately verifies mouse crafting into both Storage and Workbench kits and actual construction.
- Five individually validated, carry-cap-respecting kit fixtures verify each facility's real placement command, kit consumption and saved reopen. They isolate construction controls and do not count as a natural gathering playthrough or novice evidence.
- Existing all-weather visual, cultivation/husbandry, inventory/drop/equipment/fullscreen, map, persistence, deterministic and hosted network checks remain required.
- Browser tests verify retained node identity; integration tests verify that spatial assessment is read-only and that a blocked placement consumes no kit.

Generation-v3 saves remain compatible with this patch; it does not change world generation or content fingerprints. Existing generation-v2 migration limitations remain disclosed. Automated or agent-operated tests do not substitute for #59's real 3–5 novice Journey A/B/C records. #60 requires an actual Owner decision; #122 and Phase 2 must reflect that decision separately.

The final issue handoff must pin the merged main SHA, exact-main CI/security runs, Pages deployment and public smoke evidence. Passing local checks alone does not close the release tasks.
