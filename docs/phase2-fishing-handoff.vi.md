# D2 — câu cá có vật phẩm, quần thể và Save V2

Triển khai cho #226, nối #221/#227. Phạm vi single-player; multiplayer vẫn không có intent/replication fishing mới. PR #243 còn draft, chưa merge/deploy hoặc nghiệm thu toàn Phase 2.

## Nghiệp vụ và điều khiển

1. Homestead **F → Farm & survival crafting**: craft Field Fishing Rod và Plant Fishing Bait. Rod cần Timber 2 + Cordage 1 + Stone 1, hand crafting; bait cần Plant Fiber 1 + Berries 1, tạo 4 mồi. Rod mang trong túi, không gán vào Weapon slot. Bản đầu không có độ bền rod (giống hoe/can hiện có), không tạo chỉ số wear giả.
2. Chọn **Fish nearby water**, click tile nước đã khám phá cách chân người chơi ≤4 m. Preview và command dùng cùng `assessCast`: alive, rod, mồi, nước canonical, range, ray line, session/population limits. Chọn đất/nước chưa khám phá/xa/bị chắn không tiêu mồi hoặc tạo RNG ordinal. Chuột phải/Esc hủy preview.
3. Thả thành công tiêu đúng 1 mồi và đặt phao tại cell center 2 m. Chờ 6–12 giây active (360–720 ticks), không hiện countdown dự báo bite để giữ phản ứng. Phao và khung chuyển sang **BITE**; **Space/Reel** trong 4 giây (240 ticks). Cue chỉ hình ảnh, không có SFX mới.
4. Mỗi catch trả một Pond Minnow/River Trout/Marsh Perch thật vào item ledger. Hồ khởi đầu ưu tiên Minnow; biome marsh ưu tiên Perch; river habitat ưu tiên Trout, có 25% Minnow phụ ở hai habitat đó. Đây là ba nhóm freshwater/pond/marsh, chưa có deepwater hoặc salinity simulation.
5. Có thể đặt blueprint Campfire trên bờ, góp vật liệu/hoàn công; Homestead craft **Cook [loài cá]** ở campfire trong range 4 m. Tốn 1 cá sống + 1 Timber → 1 Cooked Fish, ăn hồi 25 food trong 1 giây. Cá sống không consumable. Cooking dùng station hiện hữu, không cần lửa âm thanh mới và không giả thành nút cấp đồ.

## Hủy, lỗi và giao dịch

- Tự hủy nếu đi cách vị trí bắt đầu >0.35 m, mất rod đã chọn, chết, bị giảm health so với tick trước, hoặc quá endTick. Hồi máu cập nhật baseline, nên damage sau heal vẫn hủy. Mồi đã thả không hoàn, nhưng stock chỉ giảm khi cá được nhận thành công.
- Space sớm từ chối `FISHING_WAIT_FOR_BITE`, giữ cast. Esc/Cancel/right-click hủy session và không cấp cá. UI tránh bắt phím trong input/textarea/contenteditable, không điều khiển Space fishing khi inventory/Settings mở.
- Túi đầy: item ledger trả `TARGET_CAPACITY_WEIGHT/VOLUME`, không giảm population hoặc kết thúc session. UI báo giải phóng túi trước khi window kết thúc; người chơi có thể drop đồ và thử lại. Hết window cá thoát, có thông báo ngắn. Đây là policy giữ phiên trong window, **không** có pending catch vô thời hạn hoặc overflow reward.
- Candidate fishing state validate trước exchange, sau đó synchronous ledger commit và publish state. Cast/reel receipts bounded 96; command cùng ID + cùng payload replay kết quả không trả thêm cá/mồi. Cùng ID khác payload từ chối. Command stale revision/inventory/alive/unknown player/invalid position giữ state và item. Rejected capacity không mutate escrow/population/ordinal.
- Một session/player, tối đa 8 sessions. Các cast vào cùng khu population giữ reservation bằng session count, tránh nhiều người giữ hơn stock. Solo hiện một người; domain không phải bằng chứng co-op API.

## Population, RNG và giới hạn

- Nước cùng region **32×32 m** dùng chung key `floor(x/32):floor(y/32)`, max 8 fish. Đổi sang cell lân cận trong region không reset population. Đổi sang region khác là habitat khác theo bản đầu; chưa mô phỏng đàn cá di chuyển hoặc cân bằng theo connected watershed.
- Catch thành công giảm một. Hồi tối đa một cá mỗi **90 s xuân / 120 s hạ-thu / 180 s đông**, theo active authority tick. Tick gọi đều, không offline catch-up hoặc vòng while cấp vô hạn. Chuyển mùa dùng interval mùa đang có; không tích hợp lịch sử tốc độ từng mùa. UI preview số stock/8 và ETA một fish tiếp theo; ETA là theo mùa hiện tại, không cam kết tốc độ tương lai.
- Tối đa 128 regions đã câu, giữ tombstone/state để không reset cá bằng eviction. Khi chạm cap, vùng mới trả `FISHING_SPOT_LIMIT`; vùng cũ tiếp tục dùng. Đây là bound cụ thể, không hứa một thế giới thủy sinh vô hạn.
- RNG namespace **`fishing:v1`**, hash seed + population key + persisted cast ordinal; chọn fish và biteTick ngay lúc cast thành công. Cancel/missed bite vẫn tăng ordinal vì mồi đã được trả. Hover/open UI không chạy RNG. Reload giữ cùng species/bite/end/ordinal, không reroll.
- Ray từ bank đến target lấy mẫu mỗi 0.2 m, tối đa 21 bước, dùng collision/passability và expedition footprints thật với footprint line 0.05 m. Nước nằm trên foundation xây cũ không bị coi là fishing water. Không suy luận từ sprite/màu hoặc query chunk chưa active/chưa khám phá.

## Save và catalog compatibility

- `livingWorld.fishing?: FishingState`, **version 1**; thiếu field giữ save cũ, không tự tạo stock đến cast đầu. Có `revision/lastTick`, `spots(key,stock,ordinal,recoveryTick)`, `sessions(id,playerId,spotKey,x,y,anchorX,anchorY,rodStackId,startedTick,biteTick,endTick,healthMilli,fishItemId)` và receipts.
- Validator giới hạn array/coordinate/tick/stock/window/species, unique player/session/region/receipt, và session key phải khớp vị trí. Save V2 cross references kiểm tra player, rod stack thuộc đúng inventory, fishing.lastTick ≤ world.authorityTick. Unknown version/fingerprint hoặc rod/player/timing giả bị từ chối, không reset save.
- Catalog thêm đúng 6 item: rod, bait, 3 cá sống, cooked fish. Giữ catalog root cũ qua `createRootV1ContentCatalog`; active loader chỉ nhận fingerprint chính xác legacy Phase 1, living 29 item, roots và active mới. Fingerprint cũ không được chứa fish item/state. Unknown catalog không được blanket accept.
- `generationCatalog` giữ original Phase 1 seed contract cho cả catalog cũ và mới; V3/V4/V5 terrain/entity IDs/fingerprints không reroll do thêm fish item. Save mới sau reopen dùng active catalog identity, world generation giữ nguyên. Không đổi Save V2 schema hoặc wire co-op.
- Save giữa lúc chờ giữ cast; reload trở lại tick đã lưu và tiếp tục cùng window. Không bù thời gian ngoài ứng dụng. `LivingWorldAuthority.read` ghép stream fishing hiện tại vào snapshot Save; plant/animal presentation không cần đổi revision theo mỗi tick fishing.

## Source map và QA bàn giao

`FishingContent.ts`: items/recipes/tuning. `FishingState.ts`: persisted shape/validation. `FishingAuthority.ts`: preview, stock, RNG, transactions, interrupt/replay. `LivingWorldAuthority.ts`: craft + tick + save bridge. `Phase1AuthorityBundle.ts`: actual alive/health/terrain/line/habitat services. `Phase1VerticalSliceWorldAdapter.ts`: explored water/ray. `Phase1Catalog.ts`, `ValidationV1.ts`, `SaveValidatorV2.ts`: exact additive compatibility và cross references. `LivingWorldOverlay.ts`: F/cursor/bobber/bite/Space/cancel/stock. `Phase1ProductionAssets.ts`/`ItemInspection.ts`: rod/bait/fish pixel icons, item facts/use/cook sources.

Domain tests: invalid/no-pay, cast bait once, reload same outcome, replay conservation, move/damage/death/tool loss/late/cancel, full-bag retry, nearby-cell stock sharing/winter recovery, malformed state. Integration: canonical Save V2 active cast/reopen/catch, forged player/tool/clock reject; prior-root exact compatibility giữ terrain/IDs/inventory và không chứa fish dưới fingerprint cũ.

UI fixture chỉ cấp nguyên liệu và bank position. Người chơi thực hiện craft rod/bait, blueprint campfire → contribute → complete, cast → save/reload → early reel reject → bite/Space → catch thật → cooking → save/reopen. Right-click cancel lần sau tiêu đúng một bait, không tạo cá. Stock/ordinal kiểm tra bản ghi IndexedDB thật. Fixture này không phải natural-material hoặc novice acceptance. Ảnh `test-results/fishing-ui` được giữ/upload CI.

Checkpoint local: 189 unit, 197 integration + 3 skip, 13 determinism, 44 browser đạt trước refactor preview/bank cuối; sau guard cuối 8 fishing tests, typecheck/lint/build và UI craft→cast/reopen/cook/cancel đạt. Scene budget cuối 14 mẫu/7 cảnh có cast trên bank thật đạt **min 55.78 FPS / max P95 33.3 ms**, Windows HeadlessChrome153/1280×720. River-fishing đứng 58.25 FPS/P95 16.8 ms, di chuyển/hủy 55.78 FPS/P95 33.3 ms, sát giới hạn nhưng vẫn cùng gate ≥50 FPS/P95 ≤34 ms; không bỏ cảnh hoặc chọn chỉ lần đo đẹp hơn. Evidence `work/outputs/checkpoint-D2-bank-fps` và `checkpoint-D2-bank-ui`.

Cần exact-head full checks/CI trước đóng #226. Chưa có fish meshes/underwater creature AI, salinity/deepwater, special rod tiers, multiplayer fishing hoặc audio mới; các phần đó không được giả nhận đã xong.
