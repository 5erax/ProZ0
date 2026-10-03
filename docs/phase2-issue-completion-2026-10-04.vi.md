# Phase 2 — bàn giao hoàn thiện issue, 2026-10-04

Owner yêu cầu ưu tiên code, push nhánh, merge main và release; hoãn multiplayer và E2E cho người khác kiểm thử. Đây là báo cáo kỹ thuật, không phải biên bản nghiệm thu Owner hay chơi thử người mới.

## Phần code đã hoàn thiện trong đợt này

| Issue | Kết quả / source chính | Bằng chứng |
| --- | --- | --- |
| #246 | Enter trên item được focus chuyển đồ qua authority thay vì chỉ click lại item; không thay transaction/capacity/revision guards. `Phase1ProductReviewRuntime` | Browser input thật chuyển hai chiều, số lượng 3→2/1→3/0; IndexedDB save/reopen giữ item. Construction fixture được ghi rõ, chưa phải fresh-game journey. |
| #247 | Bàn mới xây mở craft ngay; sửa công cụ là lựa chọn riêng R/Repair, có station/selection guards. | Browser regression với công cụ mòn và bàn xây bằng canonical commands. |
| #248, #244 | Right click giữ/switch inspection; ngoài/Esc đóng. Bỏ thông tin chi tiết tự hiện khi đến gần và manage markers trùng lặp. E/click vẫn là interaction. | Browser inspection regression. |
| #249 | Giữ Space khóa mục tiêu gần nhất, tự hướng/áp sát bằng input collision checked; release/blur/panel/WASD hủy. Damage/loot/cost/cooldown vẫn canonical. | Unit route/override/release/barrier/attempt bounds; integration obstruction không mất stamina/độ bền hoặc tạo damage/cooldown. |
| #251 | Zoom 1–4×, pan chuột/mũi tên, Home reset; right click resource đã khám phá → mark/remove; legend cho phép remove. | Browser map controls; integration owner/CAS, save/reopen, reject forged position/owner/unknown ID, legacy absence. |
| #225 | EN/VI composite inventory, storage, progression, recovery, power, copy solo/co-op; numbers Intl, glossary và template parity bắt buộc. | Unit parity/canonical identity; browser đổi locale, screenshot cùng fixture ở 3 viewport. Không dịch operation IDs, player names hoặc chat. |
| #252–#254 | Vitals ưu tiên health/stamina, caption và warning/critical; shared font/spacing/focus tokens; scrollbar ẩn nhưng panel còn scroll. | Browser 8 panel × EN/VI × 1280×720, 1920×1080, 640×360: không tràn viewport. 640px vẫn có chữ nhỏ; tester đánh giá readability cuối. |
| #250, #242 | Native 32×48 Pioneer atlas 165 frames, authored crafted-item icons và isometric facilities/material/foot shadow cùng palette. Không dùng resize/noise để thay hình. | Browser decode/frame geometry/orientations/states; contact sheet before/after được nhìn trực tiếp. Chưa phải screenshot same biome/time toàn gameplay. |
| #166, #167 | Loại permanent profession lock, chỉ một profession active, đổi tại lab/base khi đủ prerequisites; cập nhật design/architecture/save annotation contract. | Integration Cultivator→Engineer→Cultivator không cộng dồn bonus. Không giả danh specialist review. |

Các issue #215, #220, #222, #223, #224, #230, #232, #236, #237, #238, #239, #240 đã có code trong PR #245 hoặc delivery trước. Đợt này giữ regression coverage cho size/yield, equipment/rarity, stages/roots, soil/moisture, mountains/caves, grass/dry wind và blueprints. Hồ sơ trước: [release 2026-10-03](phase2-solo-release-handoff-2026-10-03.vi.md).

## Data và tuning

Save V2 thêm optional `soloResourceMarkers` v1: sole-owner player ID, safe integer revision ≥0, tối đa 64 marker resource ID/definition/space/canonical position. Save cũ thiếu field là danh sách rỗng. Reject version lạ, owner khác, vị trí giả hoặc node chưa khám phá; không sửa fingerprint/IDs. Solo-private, không thêm co-op wire fields.

Combat acquire 8 m, deterministic distance rồi ID; local grid 0,5 m, tối đa 1024 expansions/replan, replan 30 active ticks hoặc target di chuyển >0,5 m. Attempt tối đa 10/s để rejection không spam command; cooldown authority vẫn quyết định nhịp thành công. Swept geometry dùng footprint người chơi và samples 0,125 m. Map zoom presentation-only, không cấp exploration hoặc đổi authority positions.

## Validation và giới hạn

Windows, Node 24, npm 11. Typecheck, ESLint, unit/integration/determinism, Vitest Chromium browser và client/server production build. E2E không chạy lại theo yêu cầu Owner; workflow CI giữ nguyên toàn bộ gates. Test fixtures không phải novice playtest hoặc chuyến khám phá multiplayer. Screenshot fixture lưu trong artifacts `.vitest/attachments/` tại runtime kiểm thử; bản giao cho Owner có contact sheet và inventory EN/VI ở ba viewport.

Những issue có acceptance yêu cầu fresh-game journey, natural visual review, FPS toàn scene, multiplayer hoặc human acceptance tiếp tục OPEN cho tester/Owner; không đánh dấu hoàn thành những bước chưa thực hiện. #204 multiplayer/latency hoãn; #199 cần 3–5 người mới thật; #187 cần quyết định Owner; #67 điều phối thường trực. Không hạ ≥50 FPS/P95≤34ms và không thay acceptance bằng một test decode ảnh.

## Cách kiểm thử tiếp

Mở solo, I gần rương: click item, [/] chọn lượng, Enter chuyển, Tab đổi pane, save và reopen. E gần bàn mở craft; R sửa item đang chọn khi gần bàn. Giữ Space gần animal/hostile, thả hoặc WASD để dừng. M mở map; wheel/+/- zoom, drag/arrows pan, Home reset. Right click resource đã khám phá để đánh dấu; remove tại inspection/legend. Settings đổi EN/VI. Professions tại U/lab cho phép đổi một lựa chọn active khi đủ research/region.
`npm run typecheck`, `npm run lint`, `npx vitest run --config vitest.config.ts` (486 pass, 3 skip), `npm run test:browser` (53 pass), `npm run build:vercel` đều đạt tại source delivery của PR này. `git diff --check` đạt.
