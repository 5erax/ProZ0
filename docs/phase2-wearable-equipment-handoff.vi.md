# S4 — sáu ô trang bị single player

## Luồng người chơi

I mở inventory: Head / Torso / Legs bên trái, nhân vật ở giữa, Weapon / Feet / Accessory bên phải. Túi có vùng cuộn riêng để vẫn kéo tới ô trang bị được. Chọn món rồi Equip/X, kéo vào ô đúng, hoặc Unequip. Kéo lại cùng stack là idempotent; X là toggle có chủ đích. Ô sai loại, đồ không thuộc túi, món hỏng và người chơi chết bị từ chối. Gear vẫn là stack trong túi, vẫn chiếm trọng lượng/bulk; equip/swap/unequip không tạo stack và không cần ô trống giả.

## Content và tuning đã nối runtime

| Ô | Món | Nguyên liệu tại Field Workbench | Tác dụng khi mặc và condition > 0 |
|---|---|---|---|
| Head | Sun Visor, Uncommon | 1 Leather + 1 Cordage + 2 Plant Fiber | Target nóng giảm tối đa 8 về mức 50; không làm lạnh dưới comfort |
| Torso | Thermal Wrap / Warm Cloak cũ | Giữ công thức và profile cũ | Giữ cơ chế chống thay đổi nhiệt bất lợi cũ |
| Legs | Fur Trousers, Uncommon | 2 Wool + 1 Leather + 1 Cordage | Target lạnh tăng tối đa 8 về mức 50; không làm nóng quá comfort |
| Feet | Trail Boots, Rare | 2 Leather + 2 Cordage | Chạy hao 6.4 stamina/s, bình thường 8; vẫn đói nhanh hơn khi chạy |
| Accessory | Hydration Pack, Rare | 2 Leather + 1 Cordage + 1 Metal Ore | Hao nước thụ động 0.8/min, bình thường 1; không sinh thêm nước |
| Weapon | 6 loại spear hiện có | Giữ hand/Workbench/Lab progression | Combat và Hunt dùng damage/stamina/wear thật của tier |

Bốn món mới stack 1, condition 100, nặng/bulk lần lượt visor 0.4kg/0.7, trousers 0.8/1.2, boots 0.7/1, pack 0.6/1.1. Đồ passive không tự hao condition chỉ vì được mặc. Hỏng sau penalty/wear thì bonus ngừng; death cache áp dụng penalty lên mọi gear tham chiếu như vũ khí/wrap cũ. Không có bonus carry hoặc armour damage reduction giả.

Preview/world dùng cùng `wearableSprite` 32×48, cùng pivot actor, flip theo facing. Icon riêng 24×24; rarity có tên lẫn màu. Outfit dùng skin body hiện có, không sửa seed/content spawning. Panel hiển thị hiệu ứng đang mặc và item details giải thích tác dụng/nguồn craft. UI giữ DOM khi drag và thả giữ authority ownership validation.

## Data/save và source map

- `WearableContent.ts`: bốn slot/profile/item/recipe và thermal target clamp; registry bounded, không nhận stat modifier từ client.
- `EquipmentAuthority.ts`: tham chiếu `wearables:{version:1,head,legs,feet,accessory}`, ownership/type/life guard, reconcile khi đồ chuyển đi, active effects, death refs. Weapon/wrap cũ giữ nguyên field.
- Bundle nối survival context: sprint percent 80/100, water drain percent 80/100, thermal target. Rational drain giữ remainder cũ; không dùng wall clock, không bắt offline catch-up.
- PlayerRecordV2 / mapper / composer / portable canonicalizer / SaveValidatorV2 lưu optional extension. Save cũ thiếu field→bốn ô trống; không mất spear/wrap hoặc đổi seed/IDs. Unknown version/key/stack/slot/duplicate/ownership bị reject.
- `createRootsV2ContentCatalog` giữ **đúng fingerprint** catalog ngay trước wearable. Validator nhận snapshot này và các catalog cũ đã biết, nhưng không cho nhét wearable mới dưới identity cũ. V3/V4/V5 giữ original generation catalog; root transplant hợp lệ của snapshot cũ vẫn mở được.
- Presentation source/binding/model/overlay và renderer đọc refs, không tự cấp item. Recipes đi qua LivingWorldAuthority transaction cùng range/station/capacity/replay rules.

## QA và bàn giao

Typecheck/lint/build PASS. Domain tổng 458 PASS (+3 skip sẵn có): 227 unit, 218 integration, 13 determinism. 49 browser PASS. E2E equipment cũ, rarity và wearable PASS; wearable rerun sau chỉnh layout/footer PASS 22.6s. Ảnh thật desktop và 640×360 đã xem; output nằm `test-results/wearable-equipment/`, bản giữ ở `work/outputs/solo-wearable-equipment/` ngoài repo.

Kiểm tra riêng: recipe đúng station/range/missing inputs/replay; sprint và water drain exact; hot/cold thay đổi body temperature thực; dead/wrong-slot/foreign/broken refs; bag ledger không đổi khi equip; save/reopen; death move clears bonuses; exact old catalog giữ terrain/root inventory; forged content/version bị reject. E2E cấp gear ban đầu để kiểm tra wardrobe, không phải acquisition/novice playtest.

Scope được Owner xác nhận: solo trước. Co-op không có intent/replication wearable mới trong checkpoint này, không tuyên bố teammate/reconnect parity. Shared domain/browser đã kiểm tra, full co-op regression và FPS toàn bản nằm ở S8. PR #245 vẫn draft; #220/#239 chưa đóng trước tích hợp/deploy. Hang động, EN/VI toàn UI và contract release còn là các mốc sau.
