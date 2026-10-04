# World-first HUD and management UI

Owner request: implement the supplied HUD/panel redesign in code and provide a running preview.

## Shipped presentation

- Compact survival meters retain accessible names, exact values and severity. Native atlas cells scale together with their background coordinates. Settings can expand labels.
- Clock, weather, season/cycle and team share one corner card. Equipment and carry status form the opposite lower corner. A quiet dock contains Inventory, Craft, Build, Map and Farm; research/journal/professions form the secondary strip.
- Interaction feedback sits below the world center. Nearby expedition objects expose a mouse action through their existing callback. Its visibility follows range, worldspace, other panels and the native interaction bar; it does not change authority limits or advertise an unsupported E shortcut.
- Inventory separates character/equipment, item grid and selected-item inspection. Secondary inventory/storage instructions are disclosures. Slot actions use compact symbols with full localized accessible names. Split uses the existing revision-checked item transaction and conserves quantity.
- Recipe cards distinguish availability with a glyph and border, retain material-source disclosures, station requirements and crafting actions. Pagination replaces persistent keyboard prose; the full original title remains a tooltip.
- Building exposes categories, icons and compact placement actions. Map centers small content, preserves bounded pan/zoom/reset and supports clicking eligible known markers through canonical selection. Hidden map knowledge remains hidden.
- Farm groups plots, livestock and nearby resources. Authored crop/animal art and real growth, moisture, feed/water meters expose care state. Existing crop choices, costs and authority actions are retained.
- Research and professions expose unlock state and named prerequisites; journal discoveries remain individual cards. Panels share subdued surfaces, thin borders and consistent physical sizing, independent of the world raster.
- Inspected journal sites remain visible from canonical saved progress even while chunks are unavailable. The journal cache also follows discovered-site availability as exploration chunks finish loading.

## Verification

Browser regression covers EN/VI, 1280×720, 1600×900, 1920×1080 and the existing 640×360 fallback: viewport bounds, HUD separation, compact mode, active navigation, mouse close, Farm and map marker selection. Targeted gameplay checks cover real water use, quantity-preserving split, storage transfer/save/reopen, construction and visual conformance. Full CI retains the existing functional, repeated co-op and frame-pacing gates.

Preview screenshots are captured from the production client. A fresh world's map/management panel contains only knowledge and entities actually available in that world. The one-to-two-second readability target and novice scan speed require human assessment; this change does not certify that acceptance criterion or close the broader art/content/hardware issues.
