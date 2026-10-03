# D4 — audit kỹ thuật núi/hang trước triển khai #232

Baseline khảo sát: `26cec09c89abb08a2c80cf0f9933d266bc62db2e`, PR nháp #243. Đây là thiết kế triển khai kế tiếp, chưa có feature núi/hang trong runtime và không dùng tài liệu này để đóng issue.

## 1. Khoảng cách đã xác nhận trong mã

- `PlayerRecordV2.position` chỉ có x/y. Không có worldspace/portal/return anchor. Nhân vật tải lại trong hang mà chỉ ghi tọa độ sẽ bị hiểu như tọa độ bề mặt.
- `ChunkCoord`/`Phase1WorldStore` và IndexedDB chunks dùng worldId + coord. Hai chunk có cùng x/y trong hai vùng không thể dùng chung identity đó mà vẫn giữ fog/resource delta riêng.
- `Phase1ChunkGenerator.generate` hiện chỉ nhận generation3/4/5; compatibility/golden IDs được giữ bằng generationCatalog. Vẽ núi lên ground không tự tạo collision slope hoặc foundation rule.
- ItemAuthority/SurvivalWorldPort, map, renderer, expedition station queries và death cache đang đi qua world adapter/bundle. Chỉ đổi collision của movement sẽ chưa chặn loot/craft/station xuyên hai vùng.
- `Phase1SaveV2Composer` và `Phase1ReopenState` là điểm đóng gói/mở lại; world validator kiểm tra chunk fingerprint theo world seed. Interior cần seed riêng, không thể nhét chunk interior dưới fingerprint surface để né validation.
- #216 cung cấp POI có chức năng; lab/shelter không phải interior hoặc cave. #221 cung cấp hydrology V5; cửa hang cần tiếp cận từ dry bank và không xóa tài nguyên/công trình cũ. #235 ánh sáng có sáu period, chưa là ánh sáng dưới hang.

## 2. Kết quả người chơi cần đạt

Người chơi tìm núi có silhouette/elevation, đi theo dốc hợp lệ tới cửa hang đã khám phá, thấy điều kiện/rủi ro, chọn vào, đi và khai thác trong không gian riêng, xem map riêng, lưu/reload tại vị trí thật rồi ra đúng cửa. Loot đã lấy không trở lại khi vào/ra nhiều lần. Chết hoặc cửa bị chặn có cách hồi phục, không bị kẹt vĩnh viễn. Không lộ ore/loot chưa nhìn thấy qua vách.

Núi cần tối thiểu hai cấu hình độ cao và ramp rõ. Hang cần ba layout khác nhau, mỗi layout có đường entry→exit không phụ thuộc phá đá hay vật phẩm hiếm, ore/supply hữu hạn và rủi ro được biểu đạt trước khi áp dụng. Không gán canon cho chủ nhân hoặc lịch sử hang nếu chưa có nguồn đã duyệt.

## 3. Hợp đồng vị trí bắt buộc

`WorldLocation = {spaceId, position:{x,y}}`, spaceId surface hoặc cave:<portalId>. x/y là tọa độ cục bộ trong space. Portal instance chứa source surface position, destination spawn và returnAnchor. Các phép distance/line-of-sight chỉ có nghĩa khi spaceId bằng nhau; khác space trả target unavailable.

Giữ worldId là ID thế giới gốc; không tạo một save/ledger người chơi khác khi vào hang. Inventory, equipment, survival, research và authority tick vẫn thuộc cùng người chơi/cùng thế giới. Entity stable ID của hang phải bao gồm world seed, version, portalId và entity ordinal. Không dùng chỉ chunk coord làm ID.

Bề mặt cũ giữ nguyên IDs/seed/terrain. Default migration cho save không có worldspace là surface, không thay x/y hoặc inventory. New world có thể thêm mountain profile có version; save cũ không bị đổi ground thành cliff khi load. Nếu đổi raster/generation contract cần version riêng và kiểm tra exact legacy3/4/5, không nâng version rồi gọi là không reroll.

## 4. Phân lớp và công việc triển khai

| Mốc | Đầu ra | Gate trước mốc kế tiếp |
|---|---|---|
| D4.1 content/data | Registry mountain/portal và ba cave template; SpaceKey/location; persisted version/bounds/default | 20 seed layout ổn định, cửa/return dry, đường nội thất thông; schema old/new/future validation |
| D4.2 worldspace query | Adapter collision/exploration/resource/drop/station/death theo space; local chunk/fog key riêng | Không collision/query/loot/station xuyên space; player inventory không đổi |
| D4.3 authority/lifecycle | Enter/Exit intent, validate candidate trước transition, cancel incompatible channels, stream active interior | Replay/stale/dead/range/blocked exit giữ state; enter/exit lặp không duplicate hoặc leak |
| D4.4 save/death | Compose/reopen interior delta/location/return/fog/caches; death/rescue anchor đúng space | Save trong hang reload tại chỗ, lấy reward một lần; storage fault không ghi nửa transition |
| D4.5 gameplay | Real gathering/tool/stamina/wear/capacity; location-scoped facilities/progression nếu hỗ trợ trong hang | Full bag reject giữ node/cost; có đường ra dù không craft/build; không station ở surface hỗ trợ giả trong hang |
| D4.6 art/UI | Hai mountain silhouettes/ramp/cliff; ba interior layouts/wall occlusion/light/map; E/click/keyboard | Fog không lộ sau vách; character/ore readable, không jitter; narrow viewport và input modal |
| D4.7 QA/handoff | Natural enter/explore/exit/reopen; frame pacing/determinism/memory; issue notice | Existing gate giữ ≥50FPS/P95≤34ms; exact-head CI và review bằng ảnh thật |

Các mốc là thứ tự phụ thuộc kỹ thuật, không phân công sang nhân sự/chat khác. Không triển khai portal bằng việc chuyển player tới một tọa độ xa trên surface rồi gọi là đã có cave.

## 5. Persistence dự kiến và giới hạn cần khóa trước runtime

Một persisted extension có version bắt buộc cho worldspaces. Phải ghi rõ: portal registry đã discovered; template/layout identity; fog delta; depleted resource/claimed reward IDs; actor location/returnAnchor; death cache location; active action semantics. Bounded tối đa ba interior cho phạm vi initial content, một interior active/rendered cho solo. Cache/template tile count và retained deltas phải có cap trước allocation.

Có hai hướng lưu hợp lệ: schema mới với records/key theo space, hoặc extension versioned lưu interior records bounded riêng trong manifest nhưng vẫn validate seed/fingerprint của từng space. Chọn và ghi quyết định sau D4.1 spike với repository transaction thật. Không đưa interior vào parent surface chunks mà không thêm identity. Unknown space/version/portal/template phải reject có thông báo, không chuyển về spawn và xóa nội dung âm thầm.

Nếu phải đổi IndexedDB key path, cần nâng DB version, sao chép toàn bộ records cũ trong upgrade transaction, lỗi quota/upgrade abort phải giữ DB cũ có thể đọc; có rollback/export/reimport coverage. Không dùng xoá DB để “sửa migration”. SaveRepository, portable export và cloud room persistence phải thống nhất hoặc ghi giới hạn solo rõ.

## 6. Time, giao dịch và an toàn đường ra

Cùng simulation tick chạy trong surface và interior; không offline catch-up. Travel là transition authority, không reset stamina/health/weather clock hoặc auto cấp đồ. Cancel gather/fish/rest khi đổi space; không resume session chỉ có target ID thuộc vùng cũ. Rain/biome exposure của surface không render hay áp dụng vào hang; nếu có cold/dark hazard phải định nghĩa riêng và hiển thị remedy.

Enter kiểm tra sống, portal known/unblocked, range, location/revisions và destination walkable. Exit thử returnAnchor, rồi các candidate dry/walkable bounded quanh chính cửa; nếu không có thì chặn kèm lý do và cho rescue hợp lệ, không kẹt do build của người chơi. Rescue/death không mint inventory; cache và recovery references giữ ownership/space. Transition chuẩn bị state + stream rồi publish một lần; load thất bại không để player ở space thiếu world.

Mining dùng real ledger/tool profile và finite node state, không nút bấm thêm ore vào túi. Tool/stamina/capacity và resource decrement phải nằm trong một transaction/validation sequence bảo toàn. Không áp dụng damage25 trực tiếp vào động vật hiện có health4..12 mà không giải quyết balance/scale; đây là seam hunting riêng, không gộp vào cave để né hợp đồng.

## 7. Hình ảnh, map và budget

Elevation query cần chiều cao, ramp direction và support/foundation legality cùng nguồn dữ liệu renderer; không dựa màu đất. Ưu tiên đường dốc và mép cliff dễ đọc trong camera3/4. Walls/roof có occlusion khi che nhân vật, nhưng không vẽ người chơi trên mọi vật thể. Ore có silhouette riêng và tooltip dữ liệu authority. Interiormap chỉ fog/current interior, surface marker không dùng tọa độ local để hiển thị nhầm.

Một interior active, cache layout bounded; cập nhật tile DOM theo chunk/cell dirty, không dựng lại toàn bản đồ mỗi frame. Benchmark phải có cảnh cave đứng/di chuyển, entry/exit và surface populated cũ; thời gian stream/peak entity/memory được ghi riêng. Không hạ FPS gate, bỏ scene cũ hoặc gọi screenshot tĩnh là kiểm tra chuyển động.

## 8. Điều kiện handoff và các mục ngoài scope

Source map cần chỉ rõ actor-location resolver, movement facade, resource/station queries, worldspace store identity, composer/reopen/validator, death/return fallback, UI/map/renderer. Commit theo mốc như bảng; mỗi commit nêu test expected/actual và giới hạn. Chỉ đóng #232 sau feature được tích hợp và save/death/exit/QA đạt.

Solo trước, hosted dispatcher không nhận portal intent chưa có room worldspace snapshot/permission/replication. Không thêm game SFX/music; chỉ file mưa Owner đã duyệt còn được sử dụng ở môi trường mưa bề mặt. Voice chat nếu dùng là communication opt-in hiện có. #199 cần novice thật, #187 cần Owner nghiệm thu; automated cave journey không thay hai điều kiện này.

## 9. D4.1 — contract/content đã có mã, chưa nối runtime

Sau D3, thêm `src/world/phase2/ColonyCaveLayout.ts` và `tests/unit/cave-layout-contract.test.ts`:

- Version layout 1, grid 24×20 (480 cell), ba mẫu Echo Gallery / Iron Vault / Drip Grotto. Gallery có partition/door, vault có phòng/corridor, grotto có pool nhưng đường vào/ra khô. Reflection và vị trí/yield node theo RNG namespace `colony-cave:layout:v1` + seed/portal/template, không phụ thuộc load order.
- Bốn resource node mỗi hang: hai ore, hai stone; yield 1..3. Đây là nội dung dự kiến cho authority mining, chưa phải giao dịch khai thác đang hoạt động. ID có space/derived layout identity/node ordinal, khác world seed không dùng cùng depletion ID. Không spawn hoặc cấp item khi gọi generator.
- `WorldLocationV1` kiểm tra registry thật, surface finite/int32 chunk range; interior phải trong bounds và không phải wall. Không coi một string spaceId hợp lệ là quyền truy cập.
- `CaveProgressV1` có version 1, spaceId, exploredCellIndices tối đa 480 không trùng, depletedNodeIds tối đa 4 và thuộc layout; reject foreign/future/invalid reference, canonical sort và freeze output. Đây là validator contract, chưa có field vào WorldManifestV2 hoặc loader migration.
- Kiểm tra BFS độc lập trên 20 seed × ba layout: spawn/exit/all nodes reachable, IDs/load order ổn định, layout khác nhau, malformed/out-of-bounds/unknownspace/duplicate/future progress reject. Ba unit tests PASS; typecheck/lint PASS.

Mốc này không thay surface generator, không nâng generation/schema, không đổi save hoặc UI và không chứng minh cave journey. D4.2 tiếp theo phải nối movement/item/station/map/death queries theo worldspace; các mốc save/transition/art vẫn còn. Source chưa export vào runtime entry point nên không thêm chi phí render/FPS.
