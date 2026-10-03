# Bàn giao release solo — 2026-10-03

Owner yêu cầu ưu tiên code, chưa làm multiplayer, giao E2E cho người khác và push/merge/release trước. Nhánh `feat/phase2-final-completion`, PR #245. SHA phát hành được pin bởi tag release; hồ sơ này không thay nghiệm thu Phase 2.

## Code bàn giao

- #244/#215: sửa hit shape đá/quặng theo silhouette, giữ input thật; stat/kích cỡ/yield theo authority.
- #222/#223/#230: lifecycle v2 tích lũy integer work theo active tick; mùa/đất/độ ẩm thay tốc độ. Tưới gốc tiêu một Clean Water qua exchange và commit soil/growth; stale revision không tiêu đồ. Legacy v1 giữ lịch cũ, explicit watering mới chuyển sang work. Không growth offline. Mốc growing 50%, mature 100%; dry/normal/wet multiplier 0.5/1/1.25, duration/rate nền lấy từ content. Inspect có tiến độ/rate/ETA đọc đúng state.
- #232: fresh solo bật ba hang echo-gallery/iron-vault/drip-grotto. Mountain profiles cao 5/10; ramp nam dài 8 m/rộng 3.2 m; query chung cho art/collision/camera/foundation. Không đặt trên ramp hoặc trong 2 m cửa. Portal E/click, map/fog theo khám phá, mỏ hữu hạn, drop/cache/ledger đúng worldspace, save trong hang reopen tại chỗ. Ẩn surface objects/weather trong hang; không thêm audio. Save cũ thiếu cave extension giữ mode cũ.
- #240/#242: field facility sprite dùng footprint/pivot thực và bốn orientation. Cave nodes dùng cùng stage/camera và cull/cache; không có simulation/RAF thứ hai.
- #225: EN/VI lobby/Settings, preference `proz0.locale.v1`, source-owned label/ARIA/content dictionaries, fallback English và build parity. IDs/fingerprint không đổi, tên người chơi/chat không qua dịch. Item inspection cache tách locale, growth number/time dùng Intl. **Một số composite trong Phase1PresentationBinding.ts vẫn còn English khi chọn VI; cần hoàn thiện trước đóng #225.**
- #220/#224/#236/#237/#238/#239: tiếp nhận equipment/grass/soil/weather/rarity/hunting từ các commit đã có trên nhánh. Không sửa hosted gameplay để thêm feature solo.
- Operation IDs có session UUID: reload không tái dùng ID trùng với receipt đã lưu; retry cùng request vẫn do authority kiểm tra idempotency.

## Kiểm chứng và QA tiếp nhận

Trước yêu cầu dừng E2E: domain 475 PASS/3 skip; journey hang đầu đi bộ/ramp → vào → mine → save/reopen → ra đúng cửa PASS; hai bài locale lobby/gameplay 850 px PASS; 7 entrypoint PASS. Đây là kết quả tại working-tree checkpoint, không phải full E2E của exact release SHA. Selector/case bài locale đã sửa; không force-click hoặc nới gate.

Commit cuối kiểm tra typecheck/lint/domain/production build. Không chạy thêm final browser/E2E/FPS/production save smoke theo yêu cầu Owner. GitHub CI tự chạy theo workflow; đọc trạng thái live của PR/main, không lấy run cũ để tuyên bố PASS. Giữ nguyên ≥50 FPS/P95 ≤34 ms.

QA cần kiểm tra cả ba hang/ramp, repeated enter/exit, mining/drop/death/recovery/full bag, save cũ/mới và fog; facility footprint/bốn hướng, crop hit routing, locale composite/journal/errors ở 850 px và 1280×720; full browser/E2E/FPS. Fixtures kiểm tra biên không phải novice playtest.

## Trạng thái issue

Giữ OPEN các issue tính năng chờ final integration/visual evidence. #225 còn composite copy như trên. #166/#167 đã cập nhật master contracts và link hồ sơ này; permanent profession-choice discrepancy và independent review chưa tự phê duyệt. #204 còn exact-head FPS, multiplayer latency được hoãn. #199 chưa có 3–5 novice observations; #187 chưa có quyết định Owner. #67 là điều phối thường trực.

Tham chiếu: [checkpoint trước](phase2-single-player-transfer-2026-10-03.vi.md), [lifecycle](phase2-resource-lifecycle-handoff.vi.md), [cave authority/save](phase2-cave-query-handoff.vi.md), [construction](phase2-field-construction-handoff.vi.md), [equipment](phase2-wearable-equipment-handoff.vi.md).
