# Company B — bàn giao Phase 2 và Phase 3

Ngày đối chiếu: 04/10/2026. Owner xác nhận trong chat rằng Company B phụ trách **cả triển khai game**, gồm engine/save/network cần thiết. Đây là thực thi trực tiếp theo yêu cầu đó; không tự nhận vai B-TD/PM-B hoặc ghi phê duyệt của chuyên gia.

## Tiến độ đã xác minh

Main đầu vào: `f3208d3`, PR #265. PR #210 đã merge; bản cũ ngày 02/10 không còn là baseline hiện tại. Bản nâng cấp giữ toàn bộ các thay đổi đã phát hành: UI world-first, EN/VI, trang bị và độ hiếm, blueprint ngoài căn cứ, thế giới sống, trồng trọt/chăn nuôi, sông/câu cá, núi/hang động, nhiều địa điểm khám phá và lưu thế giới.

| Phần | Kết quả hiện tại | Phần cần phân biệt |
| --- | --- | --- |
| Phase 2 nội dung/khám phá | Biome, thời tiết/sinh thái, tài nguyên tái sinh, địa điểm quan sát/khôi phục, journal/map, nội dung solo mở rộng đã có trên main | #260 còn tham vọng tuyến địa lý/phức hợp lớn và nội dung văn minh; không coi scenery là một hệ thống văn minh Phase 4 |
| Phase 2 hình ảnh/UI | PR #261–#265 đã sửa tỷ lệ, fog, ưu tiên hiển thị wildlife, điều khiển, panel/scroll/focus và journal | Nhận diện nghệ thuật, trải nghiệm người mới và cân bằng vẫn cần người thật (#242/#250/#254/#259) |
| Phase 2 nghề | Main đã cho đổi nghề; bản này thêm kiểm tra revision túi và sức chứa trước khi mất Engineer cuối cùng | Không cộng dồn bonus/XP hoặc làm hỏng hòm đã lưu vượt sức chứa mới |
| Phase 2 kết nối | Kiểm tra payload server, thứ tự/baseline/epoch/identity/revision, trạng thái kết thúc và reconnect được tăng cường | Kiểm thử local không thay bằng chứng latency Internet/hardware #204 |
| Phase 3 Industry | Bảy loại công trình, sáu công thức, năm nghiên cứu; production, logistics, điện, nhà kính, xe và bảo trì dùng authority thật | Candidate trên nhánh, chưa phải bản production hoặc Owner ACCEPT |

## Thay đổi Phase 2 trong bản này

- Mất Engineer cuối cùng chỉ được đổi nghề khi tất cả hòm vừa sức chứa sau đổi: 150 kg / 180 volume. Nếu quá tải, giảm đồ trước; vẫn giữ 2× khi còn Engineer khác.
- Nghề mới thay nghề đang hoạt động, không tốn vật liệu/nhận thêm XP; inventory revision tham gia giao dịch. Trạm nghiên cứu/lab, alive, khám phá và prerequisites vẫn được kiểm tra.
- Client từ chối envelope/baseline/replica/motion sai hình dạng, identity, content version, thứ tự hoặc clock. Không dùng gói foreign epoch để đẩy thời gian; không hồi sinh session đã kết thúc.
- Công trình công nghiệp chặn movement/placement thật, không chỉ là hình ảnh. Tháo dỡ trả lại lối đi. Người đang nằm trong footprint vẫn đi ra được.
- Không cho giao dịch công nghiệp trên mặt đất từ tọa độ bên trong hang.

## Phase 3 — cách chơi

1. Nghiên cứu Field Survey và Expanded Storage tại thuộc địa.
2. Mở **Industry / Công nghiệp bằng O**. F vẫn mở Farm. Nghiên cứu Industrial Automation bằng quặng và dây thừng trong túi.
3. Xây dàn pin, kho, máy xử lý sợi và máy chế tạo trên đất trống đã khám phá gần nhân vật. Chi phí/phạm vi hiển thị ngay trong panel.
4. Nạp sợi vào máy xử lý để tạo dây; máy chế tạo dùng dây và quặng tạo miếng sửa chữa. Logistics mở công thức bộ máy/bộ nguồn và băng chuyền.
5. Chọn From/To và bộ lọc để nối băng chuyền. Mỗi đường trả vật liệu thật, chuyển một đơn vị mỗi 30 tick, dừng khi kho đích đầy. Đường nối hiển thị tại vị trí công trình.
6. Dàn pin/trạm tiếp điện tạo các mạng độc lập, chia công suất hữu hạn. Máy thiếu điện dừng; ban đêm dàn pin không sản xuất. Không cộng điện vào mạng không liên thông.
7. Cultivation của Phase 2 + Protected Cultivation mở nhà kính; Intensive Cultivation mở công thức nhanh và sản lượng cao hơn, có thêm nguyên liệu.
8. Cargo Mobility mở xe chở hàng. Sạc xe gần điện, nạp hàng, chọn đích đã khám phá và lái. Địa hình, vật cản, năng lượng, cooldown và người lái được authority kiểm tra.
9. Công trình hao mòn khi hoạt động; sự kiện cần bảo trì/hỏng/sửa được lưu. Lấy hết hàng và ngắt băng chuyền trước khi tháo dỡ; chỉ hoàn vật liệu nếu túi nhận được.

## Dữ liệu và tích hợp

Content: `src/content/phase3/IndustryContent.ts`. Canonical state/commands: `src/simulation/industry/`. UI chung solo/co-op: `src/client/runtime/IndustryPanel.ts`; copy EN/VI: `src/client/localization/IndustryMessages.ts`.

Save V2 thêm extension `world.industry` tùy chọn, version 1. Save cũ khởi tạo industry trống tại tick đã lưu, giữ seed/generator, inventory, progression, living world và cave state. Save có industry cần colony mode; version/owner/clock/prerequisite/buffer sai bị từ chối. Không có offline output, crop growth, charge hay hao mòn.

`industry.action` dùng identity đã admission, industry control revision và inventory revision. Tick sản xuất cập nhật replicated view nhưng không làm mọi lệnh điều khiển đang đi trên mạng thành stale. Receipt đã commit được lưu và dùng lại khi mất phản hồi; không gửi chữ ký receipt riêng trong shared view. Chi phí/nạp/lấy/sửa/tháo dỡ dùng item ledger nguyên tử.

Solo marker dùng canonical raster origin và depth cùng world stage, cull ngoài màn hình/hang; panel dùng physical pixels. Khi panel mở, movement/combat input được chặn và marker không nổi lên che nút. Ngôn ngữ chỉ đổi copy, không đổi ID/save/operation.

## Kiểm chứng và nghiệm thu

Kiểm thử gồm toàn bộ unit/integration/determinism/browser hiện hữu và regression mới cho mạng, nghề, production, conservation, power, receipts, save cũ, collision và worldspace. Journey UI dùng fixture nguyên liệu/infrastructure được ghi rõ, nhưng các thao tác research/build/input/output/conveyor/crop/drive/save đều chạy thật.

Ba journey công nghiệp đã đạt trên Windows/Chromium: chuỗi sợi → dây → miếng sửa; nhà kính thâm canh 40 giây và xe nạp/lái/mở lại; hai client hosted bị mất phản hồi sau commit rồi reconnect, đúng một lần chuyển vật liệu. Giữ nguyên gate ≥50 FPS, frame P95 ≤34 ms và visible-start ≤350 ms. Kết quả toàn bộ E2E/frame và CI của head cuối phải được đọc trước khi công bố release.

**Chưa có bằng chứng để đóng toàn bộ Phase 2:** #199 cần 3–5 novice thật; #204 cần hardware/network và expedition ba người; #187 cần quyết định Owner trên bản được phát hành. Không tự tick checklist hoặc đóng issue bằng automated fixture. Visual art approval của người thật cũng chưa được tạo trong chat này.

Giới hạn Phase 3: xe dùng bước lái hữu hạn tối đa 8 đơn vị/lệnh; buffers nhận catalog vật liệu đã khai báo; chưa có aircraft, battery grid, dây điện cấp cho mọi máy legacy, đào địa hình hay NPC/civilization Phase 4. Các giới hạn này không làm biến mất việc còn thiếu ở issue gốc.
