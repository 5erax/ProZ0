# Living World / Homesteads — bàn giao triển khai single-player

Baseline: main 4220521 / PR #212. Tracking: #213; PR #214. Nhánh: product/living-world-and-homesteads. Phạm vi sáu yêu cầu Owner mới; co-op không nhận extension này. Kế hoạch nghiệp vụ/kỹ thuật và dependencies: [living-world-homesteads.vi.md](living-world-homesteads.vi.md).

## Luồng người chơi

- Công trình đã dựng: B → Expedition blueprints → danh sách công trình gần → Move, trỏ vào đất hợp lệ và R để xoay, click để xác nhận; Escape hủy. Giữ nguyên kho, vật phẩm, ID và tiến độ. Lab là landmark cố định; habitat phải nối connector lab hợp lệ. Cabin độc lập có thể đặt ngoài base.
- Homestead: F hoặc nút Homestead; E gần động vật/forage/ô trồng mở thao tác tại chỗ. Crafting trong details giữ nguyên trạng thái mở và vị trí cuộn khi dữ liệu cập nhật.
- Kiếm đá/gỗ/fiber, chế Field Cordage rồi Field Hoe. Root seeds chế từ Edible Plant; các hạt grain/flax/herb kiếm qua wild forage. Till a new plot trên đất khô đã khám phá trong tầm, gieo, tưới bằng Watering Can + Clean Water, fertilize Compost, gặt cây chín. Làm đất dọn forage chồng tại chỗ và nhận tài nguyên còn thu được; túi đầy giữ cả đất và tài nguyên. Clear crop bỏ cây, không hoàn vật liệu.
- Dựng Livestock Pen hoặc Chicken Coop ở đất hợp lệ bất kỳ. Animal Feed thuần hóa con gần pen; Feed dùng thức ăn và nước. Cặp đực/cái trưởng thành được cho ăn/uống đủ tự sinh con. Thu trứng, sữa, xén lông theo loài; Hunt cần spear đang trang bị và còn condition, Loot nhận thịt/da/xương; túi đầy giữ xác/sản phẩm.
- Campfire cần Fuel bằng Timber để sưởi trong 5 phút active-time. Irrigation Tank: 1 Clean Water → 4 lượt tưới, tối đa 24; mưa nạp tank. Greenhouse giảm mất nước và cải thiện tăng trưởng mùa đông.
- Save trong Settings hoặc L; season, plots, animals, forage depletion/cleared, station buffers và command receipts được lưu. Không chạy thời gian khi đóng game.

## Nội dung và cân bằng ban đầu

| Hệ thống | Quy tắc hiện hành |
|---|---|
| Mùa | 12 phút active/mùa, 48 phút/năm; bắt đầu xuân |
| Xuân | Thực vật tăng trưởng 135% |
| Hạ | Mất nước 200%; đất khô 90 giây làm cây chết |
| Thu | Thu hoạch 125%; lá trôi và mất nước 80% |
| Đông | Thực vật 45%; nhiệt ngoài shelter giảm 32; fire/shelter sưởi; greenhouse tăng growth lên 90% |
| Đất | Loam 100%, sand 70%, clay 90%, peat 125%, rocky 45%; retention khác nhau, nhận dạng theo seed/vùng đất độc lập |
| Cây | Grain 5 phút, root 4 phút, flax 4 phút, herb 3 phút trước soil/season/fertilizer; thu cơ bản 4 sản phẩm + 2 hạt |
| Vật nuôi | Chicken trưởng thành 120s, rabbit 90s, goat 240s, boar 180s; có food/water, tuổi non, giới tính, cooldown sinh sản riêng |
| Thiên địch | Fox săn chicken/rabbit; wolf săn goat/boar; nuôi trong pen bảo vệ khỏi săn hoang và giữ vật nuôi trong phạm vi pen |
| Sản phẩm | Con cái chicken đẻ trứng, goat cho sữa; goat xén wool có cooldown riêng 5 phút; không dùng chung breed timer |
| Content | 29 items thêm, 10 facilities thêm (17 expedition facilities tổng), 15 homestead recipes thêm |

Facilities mới: Livestock Pen, Chicken Coop, Greenhouse, Irrigation Tank, Compost Bin, Kiln, Smoker, Mill, Tannery, Field Cabin. Recipes mới: Root Seeds, Hoe, Watering Can, Feed, Compost, Bone Compost, Charcoal, Brick, Cooked Meat, Dried Meat, Flour, Bread, Leather, Warm Cloak, Herbal Salve. Costs và station requirement có nguồn duy nhất trong LivingWorldContent.ts, UI hiển thị have/required và icon.

## Điểm tiếp nhận kỹ thuật

| Thành phần | File / trách nhiệm |
|---|---|
| Authority công trình | src/world/building/Phase1BuildingWorld.ts: assessRelocation/relocate, ignore-self footprint, revision/owner/inside guard, connector/power recalculation |
| Expedition | src/simulation/expedition/ExpeditionAuthority.ts: relocate action, preview, actor/range, state/receipt; ExpeditionState.ts: facility unions |
| Living content | src/content/livingworld/LivingWorldContent.ts: items, species, crops, soils, seasons, facilities và recipes; thay balance tại đây |
| Living authority | src/simulation/livingworld/LivingWorldAuthority.ts: execute(command), tick(), thermalTarget(), renewal multiplier, read()/presentationSnapshot() |
| Living persistence | src/simulation/livingworld/LivingWorldState.ts: version 1, strict validation/caps; optional WorldManifestV2.livingWorld |
| Catalog upgrade | src/content/phase1/Phase1Catalog.ts, src/content/ValidationV1.ts; SaveValidatorV2 chỉ cho phép fingerprint legacy đã biết |
| Bundle | src/integration/Phase1AuthorityBundle.ts: solo authority wiring, terrain validation, weapon/thermal/renewal callbacks |
| UI | src/client/presentation/LivingWorldOverlay.ts: F/E, contextual actions, icons, world markers, season motion; ExpeditionOverlay.ts: Move/rotate |
| Art | assets/livingworld/items.svg, facilities.svg; marker pixel SVG trong LivingWorldOverlay.ts |
| QA | tests/unit/living-world.test.ts, living-world-relocation.test.ts; tests/integration/living-world-save.test.ts; tests/e2e/living-world.spec.ts, single-player-expedition.spec.ts |

Living commands gồm id/playerId/expectedRevision/expectedInventoryRevision/action/target, optional x/y/crop. Mutations kiểm tra alive, owner, range 4, terrain/station/capacity trước commit. Item exchange và mutation world cùng thành công hoặc giữ nguyên cả hai. Receipt signature lưu 96 lệnh, replay cùng ID không trừ/nhận hai lần. Đây là authoritative simulation, UI không cấp vật phẩm hoặc tự điều chỉnh health/growth.

Generation V3/V4 dùng chính catalog legacy cho chunk identity; active catalog bổ sung items có fingerprint mới. Migration chỉ nhận catalog legacy chính xác; unknown fingerprint và legacy header chứa items/extension mới bị từ chối. Existing worlds giữ seed, generated terrain, inventory, clock và deadlines đã lưu; extension vắng mặt khởi tạo ở clock hiện tại, không catch-up.

Pen di dời giữ identity và dịch chuyển anchor/vật nuôi theo pen; xóa pen thả vật nuôi. read() reconcile ngay trước save để không lưu orphan references giữa hai tick. Forage spawn retry khi đất chưa khám phá; origin history giữ để săn không tạo duplicate spawn. Tilling lưu tombstone cleared để forage không tái xuất hiện trên plot.

Tick một lần/giây; snapshot bất biến cache theo revision, markers cập nhật tối đa 20Hz/cull trong 16 world units. Soil tint cache theo terrain node. Caps: 256 plots, 96 animals, 128 discovered regions, 640 origin records, 768 forage, 64 stations, 64 visible marker DOM. Seasonal cycles hữu hạn, feedback từ nước/đất/food/predation; không tự invent species, terrain hay genetics ngoài catalog.

## Kiểm chứng và trạng thái phát hành

Targeted domain + save: 12 PASS; relocation giữ loaded crate/container/connectors đã có unit và natural browser coverage. Natural farming browser PASS: lab supplies thật → gather timber/stone → craft hoe/seeds → till/plant ngoài căn cứ → growth → save/reopen → click và E đúng crop; không grant hoặc chỉnh hidden runtime. Screenshot lưu test-results/living-world/ và được CI upload.

Lệnh tiếp nhận: npm run ci. Kiểm tra giới hạn frame giữ nguyên ≥50 FPS / P95≤34ms. Đo Windows Owner trước đợt này có baseline khoảng 33–35 FPS; #204 vẫn mở. Run Windows trên build 0c34182: 149 unit, 181 integration (3 skip), 13 determinism, 31 browser PASS; E2E 40 PASS, 2 skip, 2 frame failures. Phase 1 sample 29.26 FPS; Phase 2 marsh-rain sample 29.77 FPS / P95 50.1ms. Các gate vẫn ≥50 / ≤34. Hai sửa hẹp sau đó (pen bounds, E không chọn forage đã dọn) được kiểm tra targeted và CI ở PR. Không quy mọi failure cho contention hoặc tuyên bố 60 FPS mọi máy.

Chưa thay thế novice playtest/Owner acceptance: #199/#187 vẫn riêng; #67 coordination vẫn mở. Không gọi sáu hạng mục này là hoàn tất toàn Phase 2 hoặc đồng bộ co-op. Nguồn kết quả CI/deployment/phát hành cuối: [PR #214](https://github.com/5erax/ProZ0/pull/214), [delivery #213](https://github.com/5erax/ProZ0/issues/213) và [releases](https://github.com/5erax/ProZ0/releases). Chỉ thông báo phát hành sau khi CI và hai public journeys thực sự hoàn thành.

Marker thế giới nằm dưới core HUD/panels; Homestead menu và panel dùng lớp UI riêng. Inventory/map/craft/help/settings khóa pointer/E của marker; mở Settings hủy preview canh tác/di dời. Natural storage regression kiểm tra E không cướp focus của inventory. Automation walk dùng shared helper với khoảng tới đích 0.65 m (nhỏ hơn range tương tác), giữ kiểm tra va chạm/stuck; không cấp đồ hoặc dịch chuyển actor.
