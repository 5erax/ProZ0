# Kế hoạch hoàn thiện 31 issue — 03/10/2026

Owner đã kích hoạt toàn bộ backlog trong chat ngày 03/10/2026. Quyết định này thay thế trạng thái “chỉ đặc tả, giao sửa sau” của 24 yêu cầu ngày 02/10; PR audio #241 vẫn giữ nguyên phạm vi đã phát hành. Không thêm âm thanh ngoài file mưa đã được duyệt. Nhánh triển khai: `feat/phase2-owner-completion`, baseline `ea26b3d0a80b0f1dd17ca57f95934c76ea46c10c`.

## Nguyên tắc giao việc và tích hợp

Mỗi nhóm đi từ contract → domain/content → save/network nếu thay đổi → UI/art → kiểm thử → handoff. Commit chỉ ghi file thuộc phạm vi đã làm; không gom các skill Redis chưa được theo dõi. Giữ seed, save cũ, giới hạn quần thể và giao dịch chống nhân đôi. Không tự ký dưới tên thành viên công ty khác. Các khóa/điều kiện role cũ được ghi lại trong issue liên quan trước khi thay trạng thái; triển khai trong chat này theo chỉ thị trực tiếp của Owner.

Mỗi issue đóng cần mapping tiêu chí ↔ mã ↔ bằng chứng ở đúng SHA và trạng thái đã tích hợp. “Có nút”, “có tài liệu” và “unit test đạt” riêng lẻ không đủ chứng minh hành trình thật. #199 cần dữ liệu người mới; #187 cần Owner nghiệm thu bản cuối. #67 là issue điều phối toàn dự án: hoàn thành checkpoint Phase 2 không tự kết thúc điều phối các phase tiếp theo.

## Chuỗi triển khai và phụ thuộc

| Đợt | Issue | Đầu ra chuyên môn/kỹ thuật | Kiểm chứng bắt buộc |
|---|---|---|---|
| A — nền trình bày | #242, #231 | Registry sprite có tỷ lệ/pivot, camera dùng chung, nội suy thú, right-click đúng phạm vi, panel/hitbox không hỏng | Camera bốn hướng/chéo, DPR/resize, fog/occlusion, click/E, không thay authority |
| B — clock và vận động | #217, #229, #235, #218, #219 | Clock ngày/mùa dùng chung, sáu bậc sáng chuyển mượt, autosave sau rest hoàn tất/qua đêm, sprint stamina và đói | Ranh giới buổi/mùa, pause/reload, rest bị hủy không save nhầm, Shift trong chat không chạy |
| C — tài nguyên và cảnh quan | #215, #222, #223, #224, #230, #236, #237, #238 | Kích cỡ/sản lượng, sinh trưởng nhiều mốc, thu/trồng gốc, cỏ thu hoạch, moisture đất, gió/biến thể tile | RNG theo seed, regen/save, trạng thái hover thật, khai thác không mất/nhân đồ, art/hitbox ổn định |
| D — thủy hệ/khám phá | #221, #216, #232, #226 | Sông/bờ tự nhiên, POI khác biệt, núi/hang với transition, câu cá và quần thể | Generation version cũ không reroll, vào/ra hang và save/reopen, không đứng dưới nước để khai thác |
| E — thiết bị và thông tin | #220, #227, #228, #239, #225 | Equipment/avatar, item detail, character effects/remedies, rarity tên/viền, EN/VI thống nhất | Equip/drop/unequip thật, avatar đổi, keyboard/focus, dịch toàn luồng solo/co-op, không chỉ đổi nhãn |
| F — xây dựng | #240 | Audit mọi facility/canonical legacy build, đặt blueprint trước, cấp vật liệu sau, sửa/dời/hủy hợp lệ | Không chỉ ba kit cũ, chi phí/thời gian rõ, replay/stale không mất đồ, container ID giữ nguyên |
| G — performance/network | #204 | Profiling đầy cảnh, giảm work render, đo movement/interaction co-op và reconciliation | Giữ ≥50 FPS/P95≤34 ms; ghi riêng Linux/Windows/Internet; reconnect/3 người |
| H — hợp đồng/đóng phase | #166, #167, #199, #187, #67 | Gameplay/architecture contract phản ánh mã cuối; QA matrix; Owner và novice evidence; notice điều phối | Không giả lập nghiệm thu của người mới/Owner; checkpoint #67 không đóng toàn dự án vô căn cứ |

Các đợt là nhánh phụ thuộc theo hệ thống, không phải hứa rằng mọi việc nhỏ đều làm độc lập. A là điều kiện trình bày cho C/E; B là nguồn thời gian cho C/D; thay generator ở D cần versioning trước khi release. F có thể audit trên baseline trước khi E hoàn tất. G đo lại sau nội dung cuối thay vì chỉ đo cảnh trống.

## Ma trận kiểm kê ban đầu

| Issue | Trạng thái lúc kích hoạt | Khoảng cách cần giải quyết |
|---|---|---|
| #242 | Mới tạo | Cây/thú generic 32 px, screen-space 20 Hz gây trượt; cần đại tu art/UI và nhận diện |
| #231 | Open | Chưa có contextmenu guard đúng lifecycle/phạm vi |
| #217 | Open | Audit clock/buổi hiện hữu; thống nhất điều kiện và tên buổi |
| #229 | Open | Clock hiện hữu chưa công bố độ dài ngày/đêm theo mùa |
| #235 | Open | Sáu bậc ánh sáng cần chuyển tiếp và palette đồng bộ |
| #218 | Open | Có rest 8 giây; cần save sau thành công và khi qua đêm, không làm lại sleep |
| #219 | Open | Cần sprint input/authority/cost và không chạy trong modal/chat |
| #215 | Open | Resource hiện hữu cần kích thước và năng suất thật có persistence |
| #222 | Open | Crop có progress, forage có readyTick; chưa là nhiều mốc/tip thống nhất |
| #223 | Open | Chưa có chu trình lấy gốc → item → trồng lại |
| #224 | Open | Cỏ hiện hữu cần atlas/palette/depth thống nhất |
| #230 | Open | Moisture crop có thật; màu đất toàn vùng cần ba trạng thái |
| #236 | Open | Dry-wind cần chuyển động có hướng/độ sâu, giữ im lặng theo audio policy |
| #237 | Open | Đất có loại theo seed; cần biến thể và seam trong biome |
| #238 | Open | Cỏ trang trí chưa đồng nghĩa resource thu hoạch thành fiber |
| #221 | Open | Cần sông tự nhiên đồng nhất collision/render/generation |
| #216 | Open | Có survey sites; cần nội dung khám phá khác biệt và progression |
| #232 | Open | Chưa có hành trình vào/ra hang được kiểm chứng |
| #226 | Open | Chưa có chu trình câu cá với công cụ/quần thể |
| #220 | Open | Equip cơ bản có; thiếu bảng nhiều slot và avatar xem trước |
| #227 | Open | Cần catalog detail và UI sử dụng được |
| #228 | Open | Vitals có; cần effect/detail/remedy và trạng thái thật |
| #239 | Open | Cần rarity semantics, màu tên và border có nhãn không chỉ màu |
| #225 | Open | Cần EN/VI từ lobby đến gameplay và lỗi miền |
| #240 | Open | Expedition có plan/contribute; cần audit đầy đủ legacy/canonical và menu |
| #204 | Open | Linux CI đạt nhưng số đo Windows trước đó chưa đạt; Internet phải đo riêng |
| #166 | Open | Contract gameplay cần đồng bộ phạm vi mở rộng và phiên bản |
| #167 | Open | Contract authority/save/network/content cần đồng bộ và migration |
| #199 | Open | Automated evidence có; thiếu 3–5 novice thật |
| #187 | Open | Cần nghiệm thu Owner sau bản cuối, không dùng nghiệm thu Phase 1 thay thế |
| #67 | Open | Ghi notice, dependency, checkpoint và người nhận tiếp cho Phase 2 |

Đây là kiểm kê, không phải kết quả hoàn tất. Mỗi nhóm cập nhật thêm một handoff với SHA, source map, quyết định tuning, test, ảnh và giới hạn thực tế. Các issue gốc giữ lịch sử trạng thái deferred; tài liệu này ghi nguồn kích hoạt mới để người nhận không hiểu sai.

## Quy trình QA và phát hành

1. Domain test cho giao dịch/time/RNG/migration và trường hợp hủy, full bag, stale revision khi có đổi logic. Không viết test chỉ xác nhận chuỗi trong tài liệu.
2. Browser test cho input/lifecycle/focus/presentation; E2E hành trình tự nhiên được tách khỏi fixture grant vật liệu.
3. Đối chiếu sprite bằng gallery và screenshot thế giới thật; đo độ neo camera theo tọa độ đất, không chỉ chụp đứng yên.
4. Required CI typecheck/lint/unit/integration/determinism/build/browser/co-op stability/full E2E và frame pacing ở exact head. Chỉ broaden/repeat khi có đổi mã, fail hoặc nghi vấn mới.
5. PR mô tả kết quả cuối, liên kết issue và artifact; attach PR vào chat. Merge sau CI đạt, xác nhận main CI, Vercel và Pages ở đúng SHA.
6. Chơi thử bản phát hành, ghi hạn chế chưa chứng minh; cập nhật #199/#187 bằng bằng chứng con người khi có. Không hạ gate hoặc đóng tất cả issue bằng một comment chung.
