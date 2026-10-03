# E3 — độ hiếm và nâng cấp vũ khí, bàn giao #239

## Phạm vi nghiệp vụ

Người chơi nhận biết sáu bậc bằng cả chữ và màu: Common/trắng, Uncommon/xanh lá, Rare/xanh dương, Epic/tím, Legendary/vàng, Mythic/đỏ. Màu không phải nguồn xác định sức mạnh hoặc quyền trang bị. Definition trong catalog quyết định rarity và useProfile; client không gửi rarity hoặc damage khi equip/attack. Definition cũ không có rarity được trình bày Common, không sửa fingerprint của các pack cũ.

Đợt này cung cấp một nhánh giáo có thể chế tạo thật, thay vì sáu màu chỉ xuất hiện trong fixture. Phòng thí nghiệm dã chiến và workbench hoàn tất là điều kiện trạm; blueprint chưa cấp đủ vật liệu không được tính là trạm. Công thức nằm tại F → Farm & survival crafting. Inventory → chọn → Equip/X hoặc kéo vào Weapon; Q bật/tắt vũ khí sở hữu đầu tiên còn dùng được, không tự chọn bậc cao nhất. Khi tháo, feedback lấy tên vũ khí thực tế đang trang bị.

## Balance và vòng thu nhận

| Bậc | Vũ khí | Damage / stamina | Công thức | Trạm |
|---|---|---|---|---|
| Common | Basic Spear | 25 / 15 | Công thức Basic Spear cũ giữ nguyên | Như baseline |
| Uncommon | Reinforced Spear | 28 / 16 | Basic Spear 1 + Cordage 1 + Timber 2 | Field Workbench |
| Rare | Alloy Spear | 32 / 17 | Reinforced Spear 1 + Metal Ore 3 + Leather 1 | Field Workbench |
| Epic | Tempered Spear | 37 / 18 | Alloy Spear 1 + Metal Ore 5 + Cordage 2 | Field Workbench |
| Legendary | Relic Spear | 43 / 19 | Tempered Spear 1 + Ancient Alloy Shard 1 + Leather 2 | Field Laboratory |
| Mythic | Mythic Relic Spear | 50 / 20 | Relic Spear 1 + Metal Ore 8 + Cordage 3 + Leather 2 | Field Laboratory |

Mỗi vũ khí: 1,8 kg, bulk 2,5, maxStack 1, durability 100, range 1,5 collision footprints, frontal arc 90°, cooldown 0,65 s = 39 tick ở 60 Hz, wear 1 mỗi hit đã được authority xác nhận. Miss vẫn tiêu stamina/cooldown như baseline, không tiêu durability. Unarmed giữ damage 5/stamina 10/range 0,8/cooldown 48 tick. Công thức nâng cấp tiêu một vũ khí trước và tạo một vũ khí mới ở durability 100; đây là sửa chữa thông qua nâng cấp có phí, kể cả vũ khí cũ đã hỏng. Nếu có nhiều bản cùng ID, ledger dùng thứ tự stack hiện có; không đảm bảo chọn stack đang equip hoặc ít condition nhất.

Ancient Alloy Shard được dùng một lần từ phần thưởng tàn tích hiện hữu. Mythic tiêu Relic Spear, không đòi shard thứ hai vì thế giới hiện chỉ có phần thưởng artifact đó. Đây là quyết định tránh công thức không thể đạt được. Artifact bị dùng thì không còn trong túi; trạng thái tàn tích đã nhận thưởng không reset, không phát lại shard sau tải save. Chưa có loot ngẫu nhiên, enchantment, affix hoặc reroll độ hiếm. Lost/drop/death-cache dùng luật ledger hiện hữu, không tự hồi gear.

## Giao dịch và quyền sở hữu

- `LivingWorldAuthority.execute(craft)` tra recipe ID trong danh sách giới hạn, kiểm tra alive, living/inventory revision, trạm hoàn tất trong 4 m, rồi exchange toàn bộ input/output trên draft ledger.
- Thiếu nguyên liệu/capacity failure không publish ledger hoặc living candidate; không mất vũ khí cũ khi việc nâng cấp bị từ chối.
- Commit mới lưu receipt, tăng living revision và hủy rest hiện tại. Replay payload giống nhau trả kết quả đã commit; không thêm item mới. Receipt living giới hạn 96 như baseline.
- Equipment authority chỉ giữ stack ref hiện hữu thuộc đúng inventory của player. Weapon whitelist gồm Basic Spear và năm definition mới; không mở mọi ID theo chữ “spear”. Protection giữ Thermal Wrap/Warm Cloak. Item khác hoặc ID không sở hữu bị từ chối.
- Reconcile xóa ref khi gear đã bị tiêu, thả, chuyển hoặc vào death cache. Equip không tự chuyển đồ hoặc nhân đôi stack.
- Combat đọc profile của weapon từ catalog, kiểm tra đúng player inventory/revision và condition > 0. Damage/stamina/range/arc/cooldown/wear không còn hardcode riêng Basic Spear. Replay hit không áp damage/wear lần hai.
- Repair Patch hiện hữu có thể sửa mọi item có conditionMax, gồm gear mới, theo luật workbench và mức +25 cũ. Không thêm hệ thống repair riêng.

## Dữ liệu và tương thích

`ItemDefinitionV1.rarity?` là enum sáu giá trị; validator strict keys cho phép duy nhất field này và reject giá trị lạ. Rarity đi vào canonical content fingerprint; không lưu một bản rarity có thể bị sửa độc lập trên stack. Save giữ itemDefinitionId/quantity/condition và equipment stack ref như trước.

Active catalog thêm năm gear ID. `createFishingV1ContentCatalog()` giữ đúng pack của commit câu cá d32334b; policy Save V2 chỉ tiếp nhận đúng fingerprint này cùng các pack legacy/living/root đã được hỗ trợ. Không wildcard/ignore fingerprint. Save mang identity fishing cũ không được chứa gear mới; các identity legacy/living/root cũng không được giả chứa nội dung thêm sau chúng. Save equipment cross-reference chấp nhận vũ khí mới nhưng vẫn yêu cầu ref nằm trong inventory của player, đúng Weapon/Protection.

`generationCatalog` ánh xạ active/fishing-v1/root-v1/living-v1 về identity generation legacy đã chốt. Nâng catalog không thay seed, generationVersion, terrain, resource IDs hoặc yield profile. Không đổi network protocol/Save V2 schema version trong milestone này.

## Trình bày và lifecycle

Token `RARITY_STYLE` chứa màu và nhãn EN/VI. Chưa phải bản dịch toàn game của #225. Inventory grid/Storage áp border, rarity label và tên khi có gear; selected detail tô tên/viền và công bố rarity cùng profile thật. Wardrobe tô slot/nhãn/tên; recipe nâng cấp có rarity badge/tên/viền. Giữ aria-label item name để bàn phím/test không phải suy ra nghĩa từ màu. Vật phẩm không phải equipment không bị tô thêm border độ hiếm.

Icon giáo nâng cấp dùng pixel SVG và màu tương ứng. Preview và held world layer dùng cùng `heldSpearSprite(facing, rarity)`; cache tối đa sáu sprite, pivot/size/foot anchor không đổi. World layer dùng stack thực tế đang equip; không lấy grade từ tên hoặc từ localStorage. Common giữ sprite cũ. Attack frame hiện vẫn chứa hình giáo cơ bản trong atlas nhân vật; nâng cấp animation cầm/tấn công chi tiết thuộc phần polish #242 còn lại. Không thêm SFX.

## QA và cách chạy lại

1. `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run test:determinism`, `npm run test:browser`, `npm run build:vercel`.
2. `npx playwright test tests/e2e/rarity-equipment.spec.ts tests/e2e/equipment-preview.spec.ts tests/e2e/fishing.spec.ts --workers=1` sau build. Fixture rarity cấp nguyên liệu/vũ khí để kiểm chứng giao diện; workbench hoàn tất qua authority thật, Reinforced được craft bằng UI. Không gọi đây là natural artifact journey.
3. Frame pacing chạy độc lập, sau các tác vụ CPU/browser khác: `npx playwright test tests/e2e/phase2-frame-pacing.spec.ts --project=frame-pacing --no-deps --workers=1`. Giữ gate ≥50 FPS/P95≤34 ms.
4. 12 test rarity unit: sáu profile hit/stamina/wear/replay/equip-slot; năm recipe range/missing-input conservation/replay; enum/fingerprint. Hai integration: sáu tier Save V2/condition/ref; old fishing identity/world giữ nguyên và forged identity reject.
5. E2E kiểm tra cả sáu label/border, recipe thực tế, avatar/world Mythic, item details damage 50, save/reopen và unequip. Ảnh `test-results/rarity-equipment/six-tiers.png`, `wardrobe-mythic.png`; CI upload vào artifact Phase 2.

Kết quả chính xác và CI commit nằm trong [progress](phase2-completion-progress.vi.md), tránh biến hướng dẫn chạy thành tuyên bố tất cả gate đã đạt. #239/#220/#242 còn cần tích hợp cuối; không tự nghiệm thu thay Owner.

## File sở hữu và công việc nối tiếp

- Content/balance: `src/content/livingworld/EquipmentContent.ts`, `SchemaV1.ts`, `ValidationV1.ts`, `phase1/Phase1Catalog.ts`.
- Giao dịch: `simulation/livingworld/LivingWorldAuthority.ts`; equip/combat: `simulation/equipment/EquipmentAuthority.ts`, `simulation/combat/CombatAuthority.ts`; hunt-equipped predicate trong `integration/Phase1AuthorityBundle.ts`.
- Persistence: `persistence/validation/SaveValidatorV2.ts`; không sửa các mapper stack/player chỉ để thêm dữ liệu trùng lặp.
- UI/art: `client/presentation/ItemInspection.ts`, `Phase1HudOverlay.ts`, `LivingWorldOverlay.ts`, `EquipmentArt.ts`, `Phase1ProductionAssets.ts`; binding/runtime/renderer lấy grade từ definition.
- Multiplayer dùng chung authority có thể nhận gear ID hợp lệ, nhưng milestone chưa thêm co-op Homestead crafting intents hoặc rarity border vào UI co-op riêng. Chưa chứng minh Internet acquisition/latency của gear. Wildlife hunt hiện vẫn dùng damage/cooldown của hệ living cũ; chỉ kiểm tra có vũ khí equip hợp lệ, không áp combat profile mới cho hunt.
- Còn lại: head/legs/boots thật, art attack theo tier, full EN/VI, polish panel chiều cao/focus, balance playtest natural acquisition, co-op UI parity. Không đặt các phần này DONE dựa trên một ảnh sáu ô màu.
