# P2-ART-001 — Đại tu hình ảnh, tỷ lệ sinh vật và giao diện

## Nguồn yêu cầu và phạm vi

Owner, 03/10/2026: tester không nhận diện được cây và động vật mới; kích thước không hợp lý; chúng rung hoặc trượt khi nhân vật di chuyển. Owner yêu cầu một đợt nâng cấp lớn về hình ảnh và giao diện và tiếp tục thực hiện toàn bộ 31 issue. Tài liệu này là hợp đồng triển khai mới, không phải biên bản nghiệm thu.

Giữ ngôn ngữ hình ảnh đã chọn: isometric pixel art, diorama 2.5D, góc nhìn 3/4, công trình khoa học viễn tưởng lắp ghép, bảng màu giới hạn, ánh sáng khí quyển. “Khớp thực tế” được hiểu là tỷ lệ tương đối, cấu trúc cơ thể và đặc điểm nhận diện hợp lý trong phong cách pixel art. Không đổi sang ảnh chân thực hoặc trộn nhiều phong cách.

## Vấn đề đã xác minh trong mã

`LivingWorldOverlay` dùng cùng một khung 32×32 cho mọi loài và cây. Hình cây chủ yếu khác màu, thiếu lá, hoa, quả và cấu trúc riêng. Vị trí DOM được chiếu tương đối với camera rồi cập nhật mỗi 50 ms, trong khi địa hình dùng một world stage chuyển động mỗi khung hình. Hai phép làm tròn và hai nhịp cập nhật làm vật thể tĩnh trượt so với đất. Động vật thay đổi vị trí mô phỏng theo nhịp chậm; giao diện chưa nội suy chuyển động. Đây là vấn đề trình bày; không được sửa bằng cách ghi tọa độ camera vào trạng thái thế giới.

## Yêu cầu nghiệp vụ

1. Nhìn thấy đặc điểm của từng loài trước khi mở bảng thông tin. Tên loài vẫn có tooltip và nhãn hỗ trợ tiếp cận; tooltip không thay thế hình ảnh.
2. Lấy nhân vật làm chuẩn tỷ lệ. Gà và thỏ nhỏ hơn dê, lợn rừng và sói; con non nhỏ hơn con trưởng thành. Cây lương thực, bụi quả, thảo mộc, vỉa đất sét và tinh thể muối có hình dáng khác nhau.
3. Vật thể tĩnh bám đúng ô đất khi đi chéo, chạy, đổi hướng, zoom, thay đổi độ phân giải và vào toàn màn hình. Chuyển động của động vật phản ánh vị trí thế giới thật, không rung theo camera.
4. Đọc được cây mới mọc, đang phát triển, trưởng thành, tái sinh, héo và xác động vật. Không chỉ đổi màu để phân biệt trạng thái.
5. Giao diện solo và co-op dùng chung thứ bậc thông tin, biểu tượng, khoảng cách, nút, trạng thái khóa và phản hồi lỗi. HUD dành chỗ cho thế giới; thông tin chuyên sâu nằm trong panel, tooltip hoặc trạng thái nhân vật.
6. Bản cập nhật phải có ảnh trước/sau, bảng mẫu loài/cây và kiểm tra chuyển động thật. Không dùng ảnh đẹp riêng lẻ để chứng minh gameplay đã hoàn thiện.

## Hợp đồng hình ảnh

| Nhóm | Đặc điểm bắt buộc | Chuẩn tỷ lệ và điểm neo |
|---|---|---|
| Gà | Mào đỏ, mỏ, đuôi, cánh, chân nhỏ | Thấp nhất nhóm gia súc; chân chạm mặt đất |
| Thỏ | Tai dài, chân sau, đuôi ngắn, mõm | Nhỏ; khối thân sát đất; bóng tách khỏi tai |
| Dê | Sừng, tai, râu, móng và bốn chân | Cao hơn gà; chân làm điểm neo; con non thu nhỏ đồng đều |
| Lợn rừng | Mõm dài, ngà, sống lưng, chân ngắn | Thân nặng và thấp, không giống dê đổi màu |
| Cáo | Mõm nhọn, tai tam giác, đuôi dài chóp sáng | Nhỏ và mảnh hơn sói |
| Sói | Vai, mõm, chân, đuôi và lông nhiều lớp | Cao và dài hơn cáo, không dùng chung silhouette |
| Grain | Bó thân, lá hẹp, bông hạt | Từng mốc mọc có lượng bông khác nhau |
| Flax | Thân mảnh, nhiều nhánh, hoa xanh | Phân biệt với grain bằng lá và hoa, không chỉ palette |
| Root crop | Cụm lá thấp, phần củ ở mặt đất | Củ lộ khi trưởng thành; không vẽ như cây thân cao |
| Herb | Cụm lá, hoa nhỏ, phân nhánh | Bụi thấp; lá và hoa khác flax |
| Berry bush | Cành gỗ, cụm lá, chùm quả | Bụi lớn hơn crop; quả vắng khi đã thu hoạch |
| Clay/salt | Lớp trầm tích/tinh thể có cạnh và highlight | Neo dưới chân khối; không dùng icon item phóng lớn |

Mỗi sprite cần có kích thước native, điểm neo chân/gốc, phạm vi hình ảnh, bóng và vùng bấm riêng. Độ lớn hình không được quyết định vùng tương tác; nút nhỏ vẫn phải bấm được ở độ phân giải thông thường. Palette chung gồm outline tối, bóng, midtone, highlight và accent riêng của loài. Không thêm âm thanh: chỉ giữ file mưa Owner đã duyệt ở #233/#234.

## Hợp đồng kỹ thuật

- Chia presentation thành dữ liệu mẫu hình ảnh, bộ chiếu/neo thế giới dùng chung và overlay tương tác. Sprite DOM được giữ theo ID, chỉ thay art khi loài hoặc mốc trưởng thành đổi.
- Gắn vật thể vào world stage của renderer chính; cùng raster origin và transform camera. Không đo bounding rectangle cho từng cây ở mỗi khung hình; không dùng lớp screen-space riêng cho cây tĩnh.
- Cập nhật transform camera ở nhịp render. Cập nhật nội dung panel và tra cứu trạng thái ở nhịp thấp hơn. Không tái tạo toàn bộ DOM mỗi khung hình.
- Nội suy vị trí động vật giữa mẫu authority; không nội suy tọa độ cây. Di chuyển chuồng, teleport, hồi sinh và thay thế thế giới phải reset mẫu để không bay xuyên map.
- Sắp độ sâu bằng chân vật thể trong world coordinates, cùng quy ước của nhân vật và công trình. Không đặt toàn bộ cây lên trên tất cả động vật bằng z-index cố định. Vật thể chưa khám phá không được lộ qua sương mù.
- Culling phải chừa mép cho chiều cao sprite; giữ giới hạn DOM và không tăng số cây vô hạn để tạo cảm giác đẹp. Mẫu hình phải có cache; không fetch một tài nguyên mạng cho mỗi vật thể.
- Solo/co-op nhận cùng bộ mẫu art. Không thay đổi collision, năng suất, RNG, quyền sở hữu, save schema hoặc giới hạn quần thể chỉ để điều chỉnh hình.
- Nếu mở rộng dữ liệu art: ID ổn định, fallback được nhận diện, validation khi thiếu sprite. Save cũ không cần chứa sprite hoặc vị trí màn hình.

## Công việc và giao phẩm

1. Audit sprite hiện hữu, kích thước nhân vật, projection, culling, y-sort và vòng lặp solo/co-op. Lưu nguyên nhân rung và ca tái hiện.
2. Tạo registry hình ảnh cây/thú có kích thước/pivot rõ ràng; triển khai các loài và cây hiện có trước khi thêm biến thể trang trí.
3. Thay cơ chế neo screen-space bằng world stage dùng chung; thêm nội suy động vật và reset khi đổi vị trí lớn.
4. Hoàn thiện palette, silhouette, chi tiết theo trạng thái, ánh sáng và bóng; liên kết với #215, #222, #224, #230, #235, #236, #237.
5. Đồng bộ HUD/panel/icon/tip với #220, #225, #227, #228, #239; đảm bảo tiếng Việt không làm tràn nút và có keyboard focus.
6. Tạo trang mẫu/contact sheet trong test harness, ảnh thực tế ở 640×360 và 1280×720, ảnh solo/co-op, ảnh trạng thái trưởng thành/héo/con non.
7. Kiểm tra chuyển động ít nhất bốn hướng và đường chéo, DPR 1/2, resize, fullscreen, đổi skin, mở/đóng panel, tới mép viewport và đi vào vùng chưa khám phá.
8. Đo frame pacing toàn cảnh với mưa và vật thể mới. Giữ tiêu chí hiện hữu ≥50 FPS và P95 ≤34 ms; ghi riêng môi trường Linux CI và máy Windows tester. Không suy ra Internet hoặc Windows từ CI Linux.

## Tiêu chí nghiệm thu

- [ ] Sáu loài có hình dáng và tỷ lệ khác nhau, thể hiện con non/trưởng thành/xác; mỗi mẫu có định nghĩa pivot và kích thước.
- [ ] Bốn cây trồng và sáu nhóm forage có hình riêng, hiển thị trạng thái phù hợp với authority.
- [ ] Cây tĩnh và ô đất giữ nguyên khoảng cách qua một hành trình camera liên tục, sai số không tích lũy; không giật theo nhịp 50 ms.
- [ ] Động vật di chuyển mượt và không đổi tọa độ authority do nội suy hình ảnh; teleport/reset không kéo bóng dài.
- [ ] Occlusion, fog, click và E không bị hỏng; cây nhỏ vẫn chọn được mà không chặn nút HUD.
- [ ] Có ảnh đối chiếu, test hồi quy, đo hiệu năng và bản ghi giới hạn còn lại.
- [ ] Owner xem bản thật và đánh giá độ nhận diện/chỉnh chu; bot không tự ký thay Owner.

## Thứ tự tích hợp

Ưu tiên P1: sửa rung + tỷ lệ + mẫu nhận diện. Tiếp theo art địa hình/thời tiết và UI chuyên sâu đi cùng các issue chức năng, tránh làm lại panel hai lần. Issue này theo dõi toàn bộ đợt đại tu, không đóng ngay khi chỉ sửa projection. PR phải liệt kê phần hoàn tất, phần còn lại và bằng chứng cho từng tiêu chí.
