# Checkpoint triển khai 31 issue

Nguồn kích hoạt: [kế hoạch 31 issue](phase2-completion-31.vi.md). Nhánh `feat/phase2-owner-completion`. Tài liệu này ghi tiến độ thực tế; chưa phải kết luận toàn bộ Phase 2 hoàn tất.

## A1 — neo thế giới, mẫu cây/thú và chuột phải

- #242: sáu loài có silhouette/chi tiết riêng, tỷ lệ native khác nhau, con non nhỏ hơn và xác có hình khác. Bốn cây trồng có ba mốc trình bày; sáu forage có hình riêng. Đây là mốc hình ảnh hiện hữu, chưa hoàn thành sinh trưởng nhiều mốc mới ở #222.
- Bỏ cập nhật vị trí cây theo screen-space 20 Hz. Marker gắn vào world stage với cùng raster origin; vị trí tĩnh giữ nguyên khi camera đi. Nội suy động vật chỉ thay presentation; đổi chuồng, teleport >2 m và carcass snap đúng vị trí. Fog dựa vào trạng thái khám phá chính thức. Sprite giữ theo ID/cache theo loại và mốc; giới hạn 64 vật thể hiển thị. Hitbox tối thiểu 24 native px riêng với hình nhỏ.
- #231: chặn browser context menu trong vùng game solo/co-op; input/chat/contenteditable và ngoài game giữ menu mặc định. Chuột phải hủy preview solo (canonical, expedition và till); không cấp/tiêu thụ vật liệu. Tháo listener và chặn kéo ảnh mặc định khi teardown.
- Source: `LivingWorldArt.ts`, `LivingMotion.ts`, `LivingWorldOverlay.ts`, `GameContextMenu.ts`, world-stage origin trong `Phase1ProductReviewWorldRenderer.ts`; runtime solo/co-op cài đặt và hủy guard.

Kiểm chứng đầu: typecheck/lint/build đạt, 151 unit đạt, 37 browser đạt; 2 E2E mới đạt (camera bốn hướng/chéo + resize + chọn cây; right-click hủy blueprint). Trình duyệt preview hiện game không có page error; contact sheet đã xem trực tiếp, hình cây/thú phân biệt được ở mức prototype mới. Bằng chứng local ở `work/outputs/phase2-overhaul-first.png`, `living-art-gallery.png` và `test-results/living-camera-world.png`.

Giới hạn còn lại: #242 vẫn OPEN vì địa hình/thời tiết, UI và art review của Owner chưa hoàn tất. Y-sort nhân vật cũ có ưu tiên cao cố định, cần giải quyết cùng occlusion tổng thể; không tuyên bố đã sửa toàn bộ. Chưa thêm living-world gameplay mới vào replica co-op; guard chuột phải dùng chung nhưng hình ảnh wildlife co-op vẫn cần kiểm chứng theo scene contract. Required CI/full regression chưa chạy cho mốc cuối. Chưa đóng #231 trước khi tích hợp và kiểm tra đầy đủ.

## Tiếp theo

Nhóm B: nguồn thời gian ngày/mùa thống nhất, sáu bậc ánh sáng, autosave sau nghỉ thành công/qua đêm, sprint với chi phí stamina/food. Giữ day-cycle của save/Phase 1 cũ và công bố quy tắc mới theo generation version, không sửa weather tick đã lưu.
