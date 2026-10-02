# Checkpoint triển khai 31 issue

Nguồn kích hoạt: [kế hoạch 31 issue](phase2-completion-31.vi.md). Nhánh `feat/phase2-owner-completion`. Tài liệu này ghi tiến độ thực tế; chưa phải kết luận toàn bộ Phase 2 hoàn tất.

## A1 — neo thế giới, mẫu cây/thú và chuột phải

- #242: sáu loài có silhouette/chi tiết riêng, tỷ lệ native khác nhau, con non nhỏ hơn và xác có hình khác. Bốn cây trồng có ba mốc trình bày; sáu forage có hình riêng. Đây là mốc hình ảnh hiện hữu, chưa hoàn thành sinh trưởng nhiều mốc mới ở #222.
- Bỏ cập nhật vị trí cây theo screen-space 20 Hz. Marker gắn vào world stage với cùng raster origin; vị trí tĩnh giữ nguyên khi camera đi. Nội suy động vật chỉ thay presentation; đổi chuồng, teleport >2 m và carcass snap đúng vị trí. Fog dựa vào trạng thái khám phá chính thức. Sprite giữ theo ID/cache theo loại và mốc; giới hạn 64 vật thể hiển thị. Hitbox tối thiểu 24 native px riêng với hình nhỏ.
- #231: chặn browser context menu trong vùng game solo/co-op; input/chat/contenteditable và ngoài game giữ menu mặc định. Chuột phải hủy preview solo (canonical, expedition và till); không cấp/tiêu thụ vật liệu. Tháo listener và chặn kéo ảnh mặc định khi teardown.
- Source: `LivingWorldArt.ts`, `LivingMotion.ts`, `LivingWorldOverlay.ts`, `GameContextMenu.ts`, world-stage origin trong `Phase1ProductReviewWorldRenderer.ts`; runtime solo/co-op cài đặt và hủy guard.

Kiểm chứng đầu: typecheck/lint/build đạt, 151 unit đạt, 37 browser đạt; 2 E2E mới đạt (camera bốn hướng/chéo + resize + chọn cây; right-click hủy blueprint). Trình duyệt preview hiện game không có page error; contact sheet đã xem trực tiếp, hình cây/thú phân biệt được ở mức prototype mới. Bằng chứng local ở `work/outputs/phase2-overhaul-first.png`, `living-art-gallery.png` và `test-results/living-camera-world.png`.

Giới hạn còn lại: #242 vẫn OPEN vì địa hình/thời tiết, UI và art review của Owner chưa hoàn tất. Y-sort nhân vật cũ có ưu tiên cao cố định, cần giải quyết cùng occlusion tổng thể; không tuyên bố đã sửa toàn bộ. Chưa thêm living-world gameplay mới vào replica co-op; guard chuột phải dùng chung nhưng hình ảnh wildlife co-op vẫn cần kiểm chứng theo scene contract. Required CI/full regression chưa chạy cho mốc cuối. Chưa đóng #231 trước khi tích hợp và kiểm tra đầy đủ.

Required CI ở head `0b279e6` phát hiện hồi quy có thật: vùng trong suốt phía trên sprite đá chặn nhấp ô trồng sau mở save. Sửa hit mask đá/quặng/nước theo phần hình có thể nhấp; không ép click xuyên vật thể trong test. E2E `living-world.spec.ts` tự thu thập, trồng và mở lại đã đạt sau sửa (72 s). Cần CI tại head mới trước khi đóng issue.

## B1 — lịch, ánh sáng, sprint và autosave

- #217/#229/#235: calendar v1 dùng tick authority, một ngày 12 phút active, một ngày/mùa theo mùa 12 phút hiện có; bốn mùa là 48 phút active. Xuân/thu sáng 12 h, hạ 16 h, đông 8 h; lịch dawn/dusk chuyển mềm một phút active đầu mùa. Sáu buổi MORNING/NOON/AFTERNOON/DUSK/MIDNIGHT/PREDAWN, sáu tâm sáng 0.82/1/0.84/0.62/0.43/0.60 nội suy liên tục. HUD lấy buổi từ authority; scene co-op truyền cùng clock/brightness. Không đổi tốc độ simulation hoặc weather ordinal.
- Save V2 thêm `environment.calendarVersion?: 1`. Chỉ thế giới Colony mới có field. Save cũ thiếu field giữ lịch cũ 48 phút/ngày; không nâng ngầm, nhảy đồng hồ hay đổi seed. Unknown calendar bị từ chối. Không tính bù offline. Season v1 vẫn đổi tại 09:00 theo tick khởi đầu, không tuyên bố đổi tại nửa đêm.
- #219: giữ Shift lúc đi để chạy ×1.6, tiêu 8 stamina/s, food drain thêm 25% **chỉ khi có dịch chuyển được authority giải quyết**. Tuning chốt khác đề xuất ×1.5/+15% để dễ phân biệt đi/chạy; cần Owner playtest cân bằng. Cạn sức giữ Shift chờ hồi 15 điểm sẽ chạy lại; thả Shift xóa latch. Không chạy nếu chết, thiếu food/water, đang nghỉ hoặc stamina đã được giao dịch khác giữ. Diagonal/collision/địa hình dùng movement system cũ. Đứng, va tường, panel mở không tính sprint. Input/chat và blur xóa intent. Wire co-op chưa nhận sprint: tính năng mới này ưu tiên solo, không hứa prediction sprint qua Internet.
- #218: sự kiện hoàn tất nghỉ và crossing dawn gọi checkpoint Save V2 hiện có. Dedup theo world/player/rest cooldown hoặc night ordinal; mở save lấy mốc đã lưu, không autosave lại ngay. Serialize với manual Save, coalesce event pending để không ghi song song. Toast báo lỗi ở ngoài Settings. Nghỉ an toàn 8 giây đã có sẵn; không fast-forward thời gian. Đóng panel/Wake up/di chuyển/nguy hiểm hủy nghỉ, không ghi thành nghỉ thành công.

Source map: `ColonyCalendar.ts` → environment/store/Save V2 mapper/reopen → presentation binding/scene; `PlayerInput.ts` → mapper/FixedStepRuntime → bundle permission → movement/survival; `ColonyAutosave.ts` → product runtime crossing → SaveControl checkpoint. Không thêm âm thanh.

Kiểm chứng local: 154 unit, 184 integration + 3 skip (trước bổ sung thêm một test authority sprint), 13 determinism, 39 browser đạt; bốn test sprint/calendar integration mới đạt, typecheck/lint/build đạt. Hai E2E nghỉ/autosave đạt (19.7 s): nghỉ đủ lưu/mở lại giữ lịch và đóng panel hủy không tự lưu. Test authority sprint kiểm tra reservation, va tường, đứng giữ Shift và hồi ngưỡng 15; fixture collision được ghi rõ, không thay playtest tự nhiên. Required CI/full-suite tại head mới và kiểm tra ngày/đêm dài còn cần hoàn tất. Các issue nhóm B giữ OPEN đến tích hợp.

## Tiếp theo

Nhóm C: kích thước/sản lượng, stat sinh trưởng và gốc trồng lại, cỏ thu hoạch, độ ẩm/màu đất, weather motion. Schema/content mới phải có migration từ catalog hiện có và giữ generation V3/V4; không đổi fingerprint rồi làm mất save cũ.
