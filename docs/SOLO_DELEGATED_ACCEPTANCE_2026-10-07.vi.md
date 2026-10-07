# Nghiệm thu single player theo ủy quyền — 07/10/2026

Kết luận: **ACCEPTED — SINGLE PLAYER**. Người thực hiện: agent trong chat hiện tại, theo chỉ đạo trực tiếp của Owner: “bạn phải tự test nghiệm thu đi để tự end dự án mà tôi hông cần đụng”. Đây là quyết định nghiệm thu được ủy quyền, không phải tuyên bố Owner đã chơi bản cuối, phê duyệt của một nhân sự có tên, hay kết quả của 3–5 người mới.

Phạm vi đóng là đợt hoàn thiện single player của Phase 2. Co-op Internet/hardware và hosted cave/mountain parity được giữ tại #204, ngoài mốc nghiệm thu này, theo ưu tiên single player Owner đã xác nhận. Các phase tương lai không được coi là hoàn thành; #67 là phối hợp thường trực.

## Định danh bản nghiệm thu

- Runtime đã kiểm tra: `f94f28deea1f440f5d079efc8bc2ec37364562d2`; PR #277/#284/#285/#288/#289/#290 đã merge.
- Website thật: https://proz0-colony.vercel.app/ . Deployment `dpl_E8q7pgNHYmBYBLFxwJc6WF52nFgW`, READY/production, gitSource đúng SHA trên.
- [Exact-main quality](https://github.com/5erax/ProZ0/actions/runs/37615162967) và [CodeQL](https://github.com/5erax/ProZ0/actions/runs/37615162929) PASS. Quality gồm 573 domain checks (3 existing skips), 80 Chromium browser checks, 83 E2E (2 existing skips); ngưỡng frame pacing không bị giảm.
- Release: `solo-construction-checkpoint-2026-10-07`. Commit chứa biên bản/ảnh này chỉ thay tài liệu, không sửa runtime hoặc định dạng save.

## Kiểm thử bổ sung trên production

**15/15 chức năng PASS, 5,8 phút**. Dùng các spec hiện hữu, baseURL là website thật; hai worker cho chức năng, không đo FPS trong lượt này:

`lobby-hierarchy`, `arrival-scenes`, `living-world-camera`, `living-world`, `living-roots`, `living-hunt`, `item-character-inspection`, `equipment-preview`, `world-map-readability`, `exploration-natural`, `single-player-expedition`, `fishing` trong `tests/e2e/`.

Bao phủ EN/VI ở 640×360, 1280×720, 1920×1080; selected skin; keyboard/reduced motion; cây bám world stage khi đi bốn hướng/chéo và resize; inspect/cancel bằng chuột phải; E/click; kho và căn cứ tạm; lab/rest; hồi fiber; random/custom seed; trồng đất xa; bảo toàn root, trang bị, thịt/cá và save/reopen.

Ba hành trình khám phá tạo ba world ID riêng với seed golden để so sánh route lab/mine/shelter; đi từ landing và không grant/relocate. Hành trình trồng và căn cứ tạm lấy vật liệu tự nhiên. Wardrobe, săn bắt, root, câu cá và frame pacing dùng Save V2 fixture có chủ đích; fixture không được gọi là tiến trình người mới. Lobby layout test chỉ stub account lookup để ổn định trạng thái guest; đây không phải nghiệm thu đăng nhập production.

**Frame pacing PASS**: spec `phase2-frame-pacing` chạy riêng một worker trên production, Windows x64 (UA Windows NT 10.0) / headless Chromium 153, viewport đo 1280×720; ảnh đối chiếu 640×360 và 1920×1080. 22 mẫu/11 cảnh, idle và moving, có clear/rain/wind/night/river/fishing/gear/restored sites/legacy generation. FPS 50,17–60,36; P95 lớn nhất 33,4 ms. Ngưỡng vẫn ≥50 FPS và ≤34 ms, với authority ticks và khoảng cách chuyển động được kiểm tra. Raw evidence: [frames.json](qa/solo-acceptance-2026-10-07/frames.json). Không suy ra hiệu năng mọi GPU hoặc độ trễ Internet.

## Đánh giá trực tiếp hình ảnh và quy tắc raster

Đã xem ảnh gameplay, lobby, ba cảnh arrival, modal/map EN/VI và bảng mẫu lấy trực tiếp từ `LivingWorldArt.ts` hiện tại. Bảng mẫu là source-art review ở 3× native, không phải một phiên gameplay; dùng progress 0/0,65/1 để thực sự xem sprout/growing/mature.

Quy tắc dùng chung: world/effect raster tham chiếu 640×360, display scale nguyên và nearest-neighbor cho bitmap; SVG sinh vật dùng kích thước native được khai báo và `crispEdges`, cùng scale world stage, không phóng CSS riêng theo từng vật thể. Gốc/chân sinh vật dùng pivot 50/64 của canvas authored; camera/depth dùng cùng projection, không sửa authority. Nhân vật 32×48 là chuẩn tỉ lệ, không ép mọi loài vào cùng khung. UI chữ và marker có kích thước vật lý độc lập world zoom. Đây là kế thừa pixel foundation hiện hữu, không tuyên bố mọi đường SVG có cùng số chi tiết.

Đánh giá: gà/thỏ nhỏ hơn dê/lợn/sói, có mào/tai/sừng/ngà/mõm/đuôi riêng; con non nhỏ hơn trưởng thành, xác nằm thấp. Grain có bông, flax có hoa, root có củ, herb có cụm lá/hoa, berry có quả; clay và salt khác cấu trúc. Địa hình ít tương phản, fog không lộ terrain chưa biết, mưa có hướng và không xuyên panel. Map có Bắc/tỉ lệ và marker giữ kích thước khi zoom; độ bền có phần trăm/current/max. CTA và Appearance tách vai trò; cutscene có ba bố cục khác nhau. Kết quả đạt mức nhận diện/readability của phạm vi này.

Giới hạn đã chấp nhận: sprite vẫn là pixel art cách điệu, các sprout đầu dùng hình chung và xác dùng biến dạng silhouette hiện có; không phải bộ animation riêng cho mỗi loài hay đồ họa ảnh thực. Kiểm tra agent không đo việc một người mới nhận ra CTA trong hai giây. Tối ưu GPU yếu hơn và subjective novice balance có thể nghiên cứu tiếp, không được giả là đã có số liệu người chơi.

Ảnh lưu cùng biên bản: [loài/cây](qa/solo-acceptance-2026-10-07/species-review.png), [lobby](qa/solo-acceptance-2026-10-07/lobby.png), [arrival](qa/solo-acceptance-2026-10-07/arrival.png), [gameplay/inspect](qa/solo-acceptance-2026-10-07/world-inspection.png), [map VI](qa/solo-acceptance-2026-10-07/map-vi.png).

## Quyết định issue và bàn giao

| Issue | Quyết định theo phạm vi hiện tại |
|---|---|
| #268 | ACCEPTED: CTA/layout/skin đã kiểm tra; yêu cầu đo human 2 giây được miễn theo ủy quyền, không đánh dấu đã đo. |
| #269 | ACCEPTED: ba cảnh/motion/handoff đã xem và kiểm tra; agent review thay cổng chờ nhân sự/Owner. |
| #283 | ACCEPTED: quy tắc raster, fog/terrain/rain/map/HUD đã đối chiếu; không mạo danh A-ART/A-QA. |
| #242 | ACCEPTED: child implementation/QA và review hình ảnh hiện tại đã hoàn thành; cổng Owner xem trực tiếp được thay bằng ủy quyền trên. |
| #199 | ACCEPTED under revised gate: kiểm thử agent/natural/fixture phân biệt rõ; 3–5 novice và three-person subjective session được miễn cho mốc single player, không dựng người chơi giả. |
| #187 | ACCEPTED — SINGLE PLAYER theo ủy quyền, không phải actual Owner play session hoặc global co-op acceptance. |
| #204 | DEFERRED backlog: co-op Internet/hosted parity; Windows single-player measurements đã có nhưng không đóng yêu cầu network bằng số liệu này. |
| #67 | KEEP OPEN: phối hợp dự án thường trực, không phải lỗi phát hành. |

Không cần Owner đăng nhập, chơi lại hoặc ký thêm để hoàn tất mốc single player này. Giữ lịch sử checklist cũ để audit; những yêu cầu human được miễn/chuyển cổng, không tick như dữ kiện đã xảy ra. Để chạy lại, dùng Playwright config production với các spec trên và chạy frame riêng một worker. Raw report/ảnh đầy đủ còn ở `work/outputs/self-acceptance-f94f28d`; nguồn test và các ảnh trọng yếu đã lưu trong Git.
