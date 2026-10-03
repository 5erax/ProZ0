# D4.2 — authority và cổng truy vấn hang đơn

## Đã có mã và kiểm tra

SoloCaveStateV1 là hợp đồng trạng thái bounded: một actor, tối đa ba interior từ registry seed tin cậy, fog 480 cell mỗi hang, bốn node hữu hạn thuộc layout, 32 ground drops và 32 death caches mỗi hang, 64 transition receipts. Không nhận worldspace/layout tùy ý từ save; kiểm tra vị trí và toàn thân AABB, anchor gần portal đúng, owner, duplicate entity/container/death IDs, version/future/extra data. Object/arrays trả về được freeze.

SoloCaveAuthority cung cấp collision và ItemInteractionWorldPort cho một không gian hang thực. Sweep có bước ngắn chống xuyên tường, dùng footprint player hiện tại; nước chậm 0.6×. Fog/LOS không thấy hay khai thác xuyên tường. Node finite đọc size tier 1–3 theo seed, dùng cùng resourceHarvestDefinition, field tool, work/wear và yield có thật qua ItemTransactionAuthority. Không có station bề mặt trong hang.

Transition enter/exit kiểm tra life state, expected revision, portal known/explored/range, return anchor an toàn; cancel actions trước relocate. Receipt duplicate chỉ trả lại kết quả, không teleport lần nữa. Nếu anchor exit không an toàn, chỉ dùng fallback Landing 0,0 đã xác nhận standable. Khi respawn được canonical DeathAuthority cho phép, actor trở về surface.

Ground drops và death caches giữ vị trí/ID/container theo space. SoloWorldspaceWorldAdapter nằm ở integration (world layer không phụ thuộc simulation): route collision/item/survival ports rõ ràng. Khi ở hang, không fallback resource/station/container/predator bề mặt vì trùng x/y. Khi ở surface, deny IDs thuộc cave registry/state trước khi gọi cổng bề mặt; kiểm tra phát hiện và sửa fallthrough container. Cave exposure tạm 40, sheltered; layer tích hợp phải tránh áp dụng lại surface season/fire vào actor hang.

## Kiểm chứng

Năm test mới PASS: transition gates/replay/return fallback; actual movement runtime bị tường chặn; bounded snapshot/query scope/drop/cache reconstruction; real item mining output/stamina/condition/finite depletion/replay/full-bag atomicity; real item transactions từ chối surface gather/craft trong hang, drop→exit inaccessible→reenter pickup và scoped cache/respawn. Thao tác di chuyển tới node/cửa trong các fixture được ghi rõ; chưa phải browser novice journey. Typecheck/lint PASS.

## Chưa phát hành hay bật vào game

Đây là foundation được kiểm tra, chưa được nối Phase1AuthorityBundle, Save V2 composer/validator/reopen, renderer hoặc portal UI. Không tuyên bố #232 đã hoàn tất hoặc hang đã chơi trên public.

Mốc kế tiếp cần:

1. Registry ba portal/biểu đồ núi seed ổn định; hai elevation profile, ramp/cliff có query và art cùng dữ liệu; preserve surface generation/IDs/save cũ.
2. Một optional manifest extension version1 lưu spaces/actor/anchor và container owner refs. Validator đối chiếu actor với PlayerRecord, từng cave entity với ledger container đúng kind/owner; reject surface container mượn ID và duplicate refs giữa chunk/space.
3. Bundle movement/item/death ports dùng router; surface building/storage/station/colony/living/fog/AI phải guard actor space. Inventory/equipment/clock dùng cùng authority. Cancel gather/consume/rest/fishing khi chuyển, không offline catch-up.
4. Main loop sync pose/fog sau movement trước action/save; streaming bề mặt giữ return chunks, không coi local x/y hang là surface position. Không thêm loop RAF riêng.
5. Cave renderer/map/HUD dùng space riêng, weather/rain audio bề mặt tắt trong interior; portal input/range/exit thật. Surface overlays không xuyên vào hang.
6. Hoàn chỉnh giới hạn death cache: hiện reserve từ chối khi đã có 32 cache trong một hang. Trước khi bật runtime cần hành vi recovery an toàn khi đạt cap, bảo toàn toàn bộ inventory; không để death exception phá session. Drop đạt 32 từ chối trước ledger mutation.
7. Save/reopen trong hang, enter→mine→drop→death→respawn→reenter recover→exit, cross-space forge và FPS ≥50/P95≤34ms trên browser/public thật.

#232 giữ OPEN. EN/VI gameplay, canonical watering/growth, final art/performance/master docs và deploy vẫn ở kế hoạch riêng. Không đóng human/Internet/co-op gates vì foundation solo này.
