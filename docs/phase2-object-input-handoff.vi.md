# Bàn giao S1 — tương tác chính xác với thực thể trong single player

Phạm vi Owner: single player trước. Nhánh `feat/phase2-final-completion`, PR #245. Đây là checkpoint triển khai; đóng #244 chỉ sau tích hợp, kiểm tra bản phát hành và deploy đúng commit.

## Hành vi và trách nhiệm

- Chuột phải/Shift-F10 mở một stat card nhỏ; chỉ đọc, không thu hoạch hoặc đổi inventory. Không có tooltip stat dài mặc định. Card theo ID thực thể khi marker được thay, đóng khi thực thể biến mất/fog hoặc mở menu thao tác.
- Chuột trái/Enter trên resource, quái, đồ rơi, death cache, ruin gửi thao tác với **đúng ID được chọn**. Target không khả dụng báo từ chối; không âm thầm hành động lên đối tượng khác. E vẫn chọn đối tượng gần theo luật hiện có.
- Landing Lab mở đúng một nhóm tương tác; facility/blueprint mở đúng nhóm di chuyển/xoay/cấp vật liệu tương ứng. B mở catalog đủ 20 blueprint và các công thức field craft. Kết quả di chuyển được giữ sau khi chọn vị trí, tránh mất thông báo.
- Click hòm mở đúng container của hòm đó. Hòm bị dời quá xa hoặc biến mất không tự chuyển mục tiêu sang một hòm khác. Mở inventory bằng I khôi phục chế độ quản lý thông thường.
- Các diorama khám phá chỉ bắt pointer tại console/locker có thể thấy. Nền diorama không chặn stump nằm phía sau. Targeted Homestead của stump chỉ hiện một mục đào gốc; F mở quản lý chung.
- Dock I/C/B/M/N giữ nguyên DOM qua cập nhật đồng hồ/chỉ số, tránh mất focus hoặc nút bị tháo giữa một cú click. Hàng đợi simulation async tối đa bốn bước; lấy input mới nhất khi thực thi, tránh tiếp tục đi sau khi thả phím/mở menu. Quá tải bỏ wall-clock catch-up; không tự cộng thời gian offline.

Authority giữ kiểm tra range, ownership, condition, inventory revision, cooldown và receipt. Presentation không tự cấp đồ, mở rộng interaction range hoặc sửa save để tương tác thành công.

## Kiểm chứng và phát hiện

Typecheck/lint/build đạt. Unit/integration/determinism: 218/212(+3 skip cũ)/13 ở checkpoint trước khi bổ sung test đất. Browser có kiểm tra pointer/context menu, card identity, dock focus và avatar/item details. Hai E2E lab/di chuyển đạt; stump click thật→uproot→replant→save/reload đạt; sáu POI inspect/restore/recover/save đạt. Hành trình tự đi từ landing tới lab/mine/shelter không grant/teleport đạt.

Bài expedition hoàn chỉnh đi qua thu thập, xây kho xa landing, dời kho, save/reload và ngủ tại lab nhưng lần kiểm tra 240 giây hết thời gian ở chặng quay lại. Lần chạy 360 giây đi tới cuối và phát hiện focused panel không theo blueprint sau khi công trình hoàn thành. Đã sửa chuyển focus sang facility ID; regression riêng tạo→cấp vật liệu→complete→dismantle đạt. Hành trình đầy đủ được chạy lại sau sửa. Helper thả phím **trước** round trip đọc vị trí, tránh overshoot trên Windows; stopping tolerance 0.5m vẫn nằm trong range authority gốc. Không force click, không teleport hoặc giảm tiêu chí gameplay để làm test xanh.

## Seam cho công việc sau

`Phase1ProductReviewRuntime.interactWorldEntity` là router intent; `PresentationSource.openStorage` giữ target container; `ExpeditionOverlay.open(id)` và LivingWorld targeted focus là UI local. `EntityInspection` nhận reader authoritative; không lưu stat card vào world save. `WorldRenderer` sở hữu hit region POI. Thêm thực thể mới cần ID ổn định, reader readonly, range/query authority và cùng gesture contract; không gắn stat dài vào native title.

Co-op, #187 Owner nghiệm thu và #199 chơi thử người mới giữ ngoài checkpoint solo này. Đất/mùa/gear/hang/EN-VI còn có các mốc riêng, không được coi là đã hoàn tất chỉ vì router và test input đạt.
