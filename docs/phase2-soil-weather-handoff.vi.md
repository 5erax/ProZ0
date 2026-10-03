# Bàn giao S3 — đất ẩm, cỏ và gió khô cho single player

Mốc này tiếp nối `b363342` trên PR #245. Có code runtime, persisted state và kiểm chứng giao dịch; chưa thay thế các mốc gear/hang/EN-VI hoặc nghiệm thu toàn Phase 2.

## Mô hình nghiệp vụ và kỹ thuật

Đất chưa có can thiệp dùng hàm active-time theo seed, biome, loại đất, mùa và chu kỳ mưa. Đất ướt sau mưa có đuôi thoát nước, không đổi ngay về màu khô khi mưa dừng. Badlands có nền khô hơn. Trạng thái hiển thị dùng cùng ngưỡng `dry <2500`, `wet >=7000`, còn lại normal; wet tối hơn dry. Không lấy ngày giờ hệ điều hành để tăng trưởng hoặc khô đất.

Tưới plot/forage ghi `LivingWorldState.soil:{version:1,patches:[{key,moisture}]}`. Ô đất 4m được nhận diện bằng tọa độ nguyên chuẩn; terrain raster của game là **2m**, nên renderer ánh xạ vị trí sang soil key, không dùng chung chỉ số hai lưới. Patch vừa tưới có moisture 10000. Mỗi bước sống một giây thoát nước theo retention/evaporation và nhận mưa. Các cây cùng ô có thể sử dụng nước đó. Plot giữ dữ liệu độ ẩm riêng cho greenhouse/irrigation; độ ẩm rễ cây hoang không tự biến toàn ô đất thành đất ướt.

Giới hạn 512 patch; chỉ loại bỏ patch đã về gần cân bằng tự nhiên. Không evict ô xa còn ướt để cấp chỗ cho người chơi. Tưới thủ công khi đầy patch từ chối trước publish, giữ nguyên nước trong túi, plot và các ô khác. Replay trả receipt cũ và không mất thêm nước. Tank vẫn giữ độ ẩm plot trong state plot khi field patch hết chỗ. Save cũ thiếu `soil` mở bình thường; không reroll resource hoặc đổi catalog fingerprint. Unknown version, key không chuẩn, moisture ngoài range và duplicate key bị reject.

Renderer cache trường nền theo authority second, tối đa 4096 vị trí tạm; không hash mọi ô mỗi frame. Palette soil/biome vẫn giữ màu chủ đạo; biến thể texture theo nhóm 3×3 và micro variation. Sáu silhouette cỏ có blade/seedhead khác nhau, mật độ early/growing/mature khác nhau, chọn từ entity ID. Kích thước và pivot cố định; không dùng camera/tick để chọn hình.

Gió khô có `warning→rise→peak→fall→calm`; hướng gió lấy từ namespace RNG hình ảnh độc lập theo seed/cycle. Không sửa thời gian thời tiết hoặc nhiệt độ gameplay. Các hạt dùng một hướng chung với turbulence nhỏ, hai lớp độ sâu. Bụi sát đất chỉ lấy từ ground đã khám phá và dry, không nước/fog; tối đa 12 anchor, reduced motion 4. Hai raster 640×360 chạy 30Hz, không tạo RAF riêng, không tạo DOM particle. Ground layer theo world stage và project camera thống nhất. Mưa giữ density/màu/alpha trước đó và file âm thanh Owner; không thêm SFX khác.

## Kiểm chứng và giới hạn

Typecheck/lint/build đạt. 221 unit, 213 integration (+3 skip cũ), 13 determinism đạt. Tests mới kiểm tra draining tail, mùa, cap/không evict, watering ledger/replay/full field, save/reopen/future-profile, sáu silhouette/pivot và các pha gió. Browser kiểm tra pixel thay đổi, common direction, reduced density, bound và clear cả hai raster khi calm.

E2E saved-world fixture tiến authority thật tới tick 12000 ở badlands rồi dùng chuột tưới, kiểm tra terrain wet, save/reopen và gió tiếp tục động: đạt. Đã xem ảnh thực tế `test-results/soil-wind/wet-ground-wind.png`; artifact tạm được giữ ngoài test-results để các lần chạy sau không xóa. Fixture không được mô tả là kết quả 3–5 tester mới. Lần đầu phát hiện lẫn chỉ số lưới soil 4m với terrain 2m và đã sửa; không force click hay bỏ dust assertion để vượt QA.

Canonical plant từ S2 vẫn dùng matureTick khóa duration tại lúc cut; local watering ở mốc này thuộc plot và living forage, chưa phải mô phỏng moisture từng giây cho canonical tree. Thay đổi background field qua mùa là mô hình analytic; không lưu một moisture record cho mọi ô trên map. Final populated-scene FPS và whole natural expedition được kiểm tra riêng trước tích hợp. #242 big visual review và #222 canonical moisture còn có phần riêng; không đóng toàn bộ bằng ảnh một scene này.
