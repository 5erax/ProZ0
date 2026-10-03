# D3 — điểm khám phá có giao dịch và công dụng thực tế

Phạm vi triển khai trong PR nháp #243, nhánh `feat/phase2-owner-completion`, sau checkpoint E3 `97bb352`. Owner yêu cầu hoàn thiện 31 issue trong chat hiện tại, thay trạng thái chỉ đặc tả/queued của #216; không nhận tên hoặc khóa của thành viên A/B. Tài liệu này phục vụ người nhận việc sau và kiểm chứng #216, không phải nghiệm thu toàn Phase 2.

## 1. Nghiệp vụ và thao tác

Thế giới solo Colony + Expedition có tám landmark: giữ năm landmark đã phát hành và thêm lab, mỏ, nơi trú. Sáu landmark là POI có layout và chức năng; spring/seam vẫn là landmark tự nhiên. Mỗi biome có hai POI. Người chơi đi khám phá → thấy silhouette khi fog đã mở → click hoặc focus rồi Enter/Space; ở gần có E nếu không có mục tiêu thu thập/nhặt/repair ưu tiên → Journal cuộn tới đúng hàng và focus nút → Inspect trong 1,25 m → sửa bằng vật liệu thật trong 4 m → sử dụng công dụng và thu hồi vật tư hữu hạn → save/reopen thấy trạng thái đã thay đổi.

Journal, Research và Professions giữ navigation hiện có. Escape/Close thoát; mở panel khác đóng panel này. Khi panel mở, runtime chặn movement/action của thế giới, ẩn prompt E trùng bên dưới; simulation vẫn chạy, nên thời tiết/đói/nghỉ tiếp tục. Setting đóng panel. Text input không bị hotkey Journal bắt. Không có cue âm thanh mới.

Không cần mang kit hoặc quay về base để sửa POI. Vật tư không chuyển thẳng vào túi khi chỉ đi ngang hoặc Inspect. Restore và Recover là hai intent riêng; mỗi cache nhận toàn bộ hoặc không nhận gì. Đầy túi thì vật tư còn ở điểm đó, có thể quay lại sau khi cất đồ. POI đã thu vật tư vẫn giữ công dụng.

## 2. Sáu template, con số đã chốt

| Template / instance | Biome | Vật liệu sửa, lấy từ bag | Vật tư một lần | Công dụng sau sửa |
|---|---|---|---|---|
| Relay / `site:marsh-relay` | Mist Marsh | Cordage 1, Metal Ore 1 | Repair Patch 1, Cordage 2 | Journal có tọa độ/bearing/distance tới lab mới |
| Laboratory / `site:abandoned-lab` | Mist Marsh | Cordage 1, Metal Ore 2 | Field Dressing 2, Repair Patch 1 | Research/Specialize trong 7,5 m, vẫn trả research cost và kiểm tra prerequisite |
| Garden / `site:windfall-grove` | Landing Grassland | Clean Water 1, Plant Fiber 2 | Root Seed 2, Grain Seed 2, Compost 1 | Native timber/fiber/food node trong 16 m được nhân recovery duration với 0,8 |
| Mine / `site:mining-camp` | Ochre Badlands | Timber 1, Cordage 1; phải mang Stone Field Tool còn dùng được | Metal Ore 5, Stone 3 | Ore cache hữu hạn, không tái sinh quặng miễn phí |
| Array / `site:badlands-array` | Ochre Badlands | Metal Ore 2, Cordage 1 | Power Unit Kit 1 | Shelter trong 3 m chỉ lúc regional Dry Wind |
| Shelter / `site:abandoned-shelter` | Landing Grassland | Timber 1, Plant Fiber 3 | Clean Water 2, Edible Plant 2 | Shelter 3 m; nghỉ hiện hữu 8 giây trong 4 m |

Mine chỉ kiểm tra tool sở hữu/còn condition, không tiêu tool hoặc wear khi sửa khung; không gọi đây là đào quặng bằng tool. Garden tác động policy cho canonical `resource:timber-source`, `resource:fiber-plant`, `resource:food-plant`; không tăng tốc LivingWorld crop/forage, không đổi nước/đá/quặng và không tự viết lại cooldown depletion đã lên lịch. Ecology/biome/research/season và policy khác vẫn nhân cùng. 0,8 nghĩa là thời gian hồi giảm 20%, không phải sản lượng tăng 20%.

Relay cung cấp thông tin trong Journal khi dùng, không tự mở fog hoặc tạo map marker lab chưa khám phá. Lab cho research/profession; không giả là crafting station Field Lab của recipe spear. Array là chắn gió nhiệt, không miễn sát thương predator và không bảo vệ mọi thời tiết. Shelter dùng `completeExpeditionRest`: yêu cầu sống, food/water ít nhất 15, không predator sống trong 8 m; di chuyển >0,05 m, damage/đói/khát/nguy hiểm hủy nghỉ. Sau thành công cooldown 1800 tick, autosave theo cơ chế đã có. Nghỉ không fast-forward đêm; tiến trình nghỉ đang chạy không persist qua reload.

Phần thưởng authored cố định, không RNG loot khi click/reload. Không thêm Ancient Alloy Shard thứ hai; không xác nhận bí mật lore từ các câu suy đoán.

## 3. Placement và tương thích seed

`colonySurveySites(seed)` giữ nguyên năm ID và tọa độ lịch sử. Mọi golden journey, generation identity và callers co-op cũ vẫn dùng hàm này. `colonyExplorationSites(seed,generationVersion)` trả tám site, ba site mới dùng namespace `colony-exploration:sites:v1`, stable identifier là instance ID. Seed quyết định hướng biome và jitter; chunk-load order và việc mở UI không đổi instance.

Prototype lab (-24,-144) và mine (20,144) xoay theo cùng quadrant biome; shelter (24,48) không xoay. Mỗi điểm mới tìm tối đa 128 ứng viên jitter ±8 m, snap vào tâm cell 2 m. Yêu cầu đúng biome, cách landing ít nhất 16 m, cách landmark khác ít nhất 8 m, vùng 3×3 m khô theo raster thật của generation 3/4/5. Pond lịch sử và legacy V4 marsh-water overlay được giữ. Chỉ tăng POI, không tăng generation version, không di chuyển resource IDs hoặc reroll thế giới cũ.

Runtime availability kiểm tra center đã explored/active và AABB 3×3 m không giao footprint có orientation của canonical/player expedition facilities. Không xóa hoặc di chuyển công trình người chơi trong save cũ: nếu đã xây trùng, Inspect/Restore/Recover và công dụng bị chặn tới khi người chơi dời vật cản. Art là ruin mở có thể đi xuyên, không thêm solid collision giả. Hình POI có thể còn hiện dưới/cạnh công trình trùng trong save lịch sử; đây là điều kiện bị chặn chứ không phải bảo đảm không bao giờ có visual overlap. Không tự đặt blocker mới gây kẹt save cũ.

Cache site tối đa 16 seed/version, cache art tối đa 18 sprite (6×3 trạng thái). Không spawn loot entities/particles hoặc làm procedural search mỗi frame.

## 4. State machine và giao dịch

`unrestored` là default suy từ absence. Sau `inspect-site`, instance vào inspectedSites; chưa trả vật liệu. `restore-site` tiêu inputs trong draft và ghi `restored`. `recover-site` chỉ nhận từ restored, atomically insert toàn bộ reward và ghi `recovered`. Recovered không quay về unrestored/restored, không nhận vật tư lần nữa.

Authority xác thực command ID/player/revisions, replay signature, actor sống, target/template, inspection, range, availability, inventory revision, stage và usable tool. Candidate ColonyDepthState được validate trước khi gọi item draft. Item exchange reject không publish state/ledger, không ghi receipt thành công; có thể retry bằng ID mới sau khi sửa lỗi. Replay đúng payload trả lại revision cũ mà không trả đồ; dùng ID đã committed cho payload khác trả OPERATION_ID_CONFLICT. Tối đa 96 colony receipts; stage persisted tiếp tục chặn replay cũ sau receipt eviction/reload.

Owner/player được kiểm tra bằng inventory container của actor và item authority. Không đọc quantity từ UI làm nguồn sự thật. Restore/Recover thành công hủy rest đang chạy để tránh cùng lúc nhận hai tương tác khác nhau. Inspect không thay inventory revision và giữ semantics cũ.

## 5. Save và network

Save V2 giữ schema/generation/catalog fingerprint hiện tại. Thêm `world.colonyDepth.exploration?`:

| Field | Type / bound | Absence / rule |
|---|---|---|
| version | literal 1 | Unknown version reject |
| entries | 0..6 entries | Absence giữ nguyên tới lần restore đầu |
| siteId | sáu ID template biết trước, không trùng | Phải nằm trong inspectedSites |
| stage | restored hoặc recovered | Unrestored không cần ghi |

`validateColonyDepthState` nhận inspectedSites ba ID mới bên cạnh năm ID cũ và validate optional exploration. Không nhận ID/stage/version tùy ý. Save/reopen giữ inventory stack IDs, item quantity, state/site coordinates, research và cooldown rest; không refill cache. JSON load dữ liệu cũ không có field này không reset progress cũ. Chính runtime solo tạo ba điểm bổ sung theo seed/version cũ; không gọi đây là generation reroll.

Feature mới chỉ bật khi Colony + single-player Expedition và catalog có living materials. Composition không có exploration services vẫn năm landmark cũ. Hosted dispatcher giữ research/specialize/inspect-site enum cũ, không mở restore/recover cho guest chưa có network contract. Không có claim rằng Internet co-op đã có sáu POI hoặc loot replication. Nếu sau này port co-op: thêm intent schema, room authority lifetime, snapshot field và guest reconciliation trước khi bật UI; không cho client grant reward.

## 6. Hình ảnh / UI

Sáu SVG pixel diorama 96×80 được authored trong code, cùng limited palette và bottom anchor của world stage. Relay có mast/console; lab mái vỡ/terminal/tủ y tế; garden hai bed; mine khung/cart/rail; array ba plate; shelter canopy/bed. Ba stage có trạng thái terminal/mái/locker khác, cache bounded. Stage art không đổi gameplay.

Sprite dùng foot-depth cùng camera variable; tie layer -1 để actor đứng tại hotspot vẫn trước ruin thay vì bị mast che kín. Actor đi phía sau vẫn theo foot ordering, không đẩy player luôn-on-top. Thêm clip hit area giảm transparent sky, role button/tabIndex/aria-label, click/Enter/Space/E. Chỉ render và nhận mở Journal cho cell explored. Map marker sau Inspect, không tiết lộ bằng global POI list.

Journal có tên/khoảng cách, icon riêng, objective, vật liệu have/need, tool requirement, công dụng, finite reward và trạng thái hết vật tư. Nguyên nhân range/stale/tool/capacity/needs được chuyển thành câu đọc được; không thêm HUD chữ dài mọi lúc. Chỗ nghỉ hiện countdown từ authority và thông báo cooldown khi hoàn tất. Không đổi full EN/VI ở đây; #225 vẫn thiếu.

## 7. Kiểm chứng và tiêu chí còn lại

- Unit 20 seed × generation 3/4/5 so sánh năm anchor cũ, hai POI/biome, 3×3 m dry lấy cell từ Phase1ChunkGenerator thật và landscape overlay; deterministic layout. Kiểm tra sáu giao dịch thực, range/stale/replay/capacity, tool, blocked/dead và bad progress. Không kiểm tra khô bằng cách chỉ sao chép công thức trong generator.
- Integration sáu template dùng authority bundle/world fog thật; cấp đúng vật liệu/vị trí được gắn nhãn fixture. Restore/claim, lab research trước/sau, garden multiplier, array conditional shelter, shelter qua 480 tick và Save V2/reopen/no second reward/future version reject.
- Sáu E2E dùng real UI Inspect → Restore → Recover, keyboard/mouse/E, discovered-only fog, world stage đổi, save/reopen, map. Lab research xa base, shelter 8 s và autosave thật; viewport 640×360 và 1280×720. Fixture chỉ vị trí/vật liệu, không grant exploration progress hoặc gọi là human playtest.
- Ba natural journeys mới: fresh world từ landing, keyboard walking tới lab/mine/shelter, Inspect/save/reopen/map; không grant/teleport. Đây là automated discovery path, chưa chứng minh natural resource-funded restoration hoặc 3–5 novice.
- FPS mở rộng 11 scene / 22 mẫu, có restored lab/garden/array bên cạnh 8 scene trước. Giữ ≥50 FPS, P95≤34 ms. Lần trước patch depth cuối đã đạt min55,40/max33,3; gate sau patch và exact-head CI còn phải ghi ở progress.

Tại lúc viết: 210 unit, 205 integration +3 existing skip, 13 determinism, 44 browser PASS; typecheck/lint/client/Vercel SSR build đã qua trước các sửa UI depth/guard cuối. Sáu UI đầu và sáu UI sau depth/guard đạt; natural journeys đang chạy. Ảnh sáu mẫu đã được xem trực tiếp, phát hiện và sửa actor bị che ở relay. Chưa công bố production release, human acceptance hoặc đóng #216 khi chưa tích hợp.

## 8. Source map và người nhận tiếp

| Seam | File |
|---|---|
| Business templates/cost/reward/progress validator | `src/content/phase2/ExplorationContent.ts` |
| Seed/layout/legacy preservation | `src/world/phase2/ColonyExplorationSites.ts`, `src/world/phase2/ColonyRegions.ts` |
| Stage/transaction/effects | `src/simulation/colony/ColonyDepthAuthority.ts` |
| Fog/occupancy/shelter/recovery wiring | `src/integration/Phase1AuthorityBundle.ts`, `src/world/phase1/Phase1VerticalSliceWorldAdapter.ts` |
| Existing rest reuse | `src/simulation/expedition/ExpeditionAuthority.ts` |
| Art / depth / world interaction / Journal / map | `src/client/presentation/ExplorationArt.ts`, `ColonyDepthOverlay.ts`, runtime `Phase1ProductReviewRuntime.ts`, `Phase1ProductReviewWorldRenderer.ts`, `Phase1ProductReviewMapProjection.ts` |
| Domain / persistence | `tests/unit/exploration-sites.test.ts`, `tests/integration/exploration-sites-save.test.ts` |
| Real UI / natural journeys / FPS | `tests/e2e/exploration-sites.spec.ts`, `exploration-natural.spec.ts`, `phase2-frame-pacing.spec.ts` |

Sau D3 còn núi/hang vào trong #232; không giả gán lab này là cave. Canonical cây lớn nhiều mốc/gốc, EN/VI, gear attack atlas/wildlife profile, final art/UI, Internet co-op latency, gameplay/architecture contracts và evidence Owner/novice vẫn theo kế hoạch 31 issue. Người nhận kiểm tra progress/CI SHA mới nhất, không dùng đoạn kết quả đang chờ trong tài liệu này làm bằng chứng đã phát hành.

## 9. Gate cuối trước commit D3

Ba natural discovery journeys đã PASS2,7phút; sáu UI cuối PASS16,6s sau depth/modal guard. Ảnh relay sau sửa layer-1 đã xem, actor nhìn rõ; narrow640×360 đã xem và không tràn viewport. FPS cuối22mẫu/11scene đạt min56,9962FPS/P95max33,3ms, gatekhôngđổi. Typecheck/lint/client+VercelSSRbuild cuối đạt. Thêm kiểm tra thiếu nước tưới/broken mine tool không tiêu vật liệu khác:10POIunit cuối PASS,6POIintegration trước PASS. Fullunit210 vàintegration205+3skip trước test bổ sung; toàn bộexact-headCI/fullE2E còn cần xác nhận sau push.
