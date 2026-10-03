# Bàn giao S5 — footprint và hoàn vật liệu single player

## Hành vi đã triển khai

20 loại blueprint vẫn có thể đặt trước khi có đủ nguyên liệu; nộp dần, di chuyển, xoay, đổi loại, hoàn thiện và hủy dùng ExpeditionAuthority cùng item/building authority hiện có. Không tăng giá nguyên liệu hoặc yêu cầu quay về Landing Lab.

Công trình mới lưu `footprintVersion:1`. 15 loại field có footprint riêng trong ExpeditionFootprints.ts: chuồng 3×2.5m, nhà kính/cabin 2.5×2m, coop 2×1.5m, các công trình nhỏ theo kích thước chức năng. Năm loại canonical giữ kích thước/cap/connector/container của building authority. Preview xoay dùng cùng footprint với kiểm tra nền, chồng lấn blueprint/công trình, di chuyển và vùng cấm trồng. Kiểm tra nền lấy mẫu mọi cell terrain bị footprint phủ để không bỏ qua dải nước hoặc fog ở giữa mép. Clearance Landing giữ quy tắc inclusive cũ.

Save cũ không có footprintVersion giữ footprint theo shape cũ; move/complete/reopen không tự nâng kích thước. Version tương lai/null bị từ chối. Không đổi schema, seed, generation, catalog fingerprint hoặc vị trí base đã lưu. World adapter đọc footprint qua một port chỉ đọc; canonical kit placement cũng không thể chồng lên field facility đã xây.

Khi hủy/đổi blueprint hoặc dỡ field facility, hoàn toàn bộ nguyên liệu vào túi trước. Nếu capacity không đủ, thử một hòm `storage-crate` thật, truy cập được theo ItemInteractionWorldPort và bán kính tương tác hiện hành (bản gameplay mặc định 1.25m). Hòm có tên container nhỏ nhất được thử trước; không phải hòm từ xa hay inventory người khác. Mỗi phương án dùng ledger draft độc lập. Nếu không nơi nào đủ chỗ, giữ nguyên blueprint/công trình và escrow; không rơi đồ hoặc xóa vật liệu. Nếu một hòm chứa đủ toàn bộ, publish duy nhất hòm đó, không tăng revision túi. Không chia một khoản hoàn qua nhiều hòm.

Receipt của ExpeditionAuthority giữ kết quả replay qua save/reopen. Hòm không được tạo giả; container/state của supply-cache canonical tiếp tục dùng building authority. Dỡ canonical chứa đồ vẫn dùng đường dismantle riêng để bảo toàn contents; field chứa nước yêu cầu lấy nước trước.

UI báo rõ vật liệu đã tới hòm khi túi đầy, đưa thông báo vào vùng nhìn sau thao tác; tooltip đổi blueprint giải thích cả hai phương án. Outline footprint lớn không bị SVG 64×64 cắt.

## Nguồn và kiểm tra

- Content: ExpeditionFootprints.ts; optional field và validator: ExpeditionState.ts.
- Placement/move/overlap/legacy: ExpeditionAuthority.ts, Phase1BuildingWorld.ts, Phase1VerticalSliceWorldAdapter.ts, Phase1AuthorityBundle.ts.
- Hoàn vật liệu: ItemTransactionAuthority.commitColonyRefund; quyền access do BuildingItemWorldAdapter kiểm tra.
- UI: ExpeditionOverlay.ts; không đổi controls và terrain generation.
- Typecheck/lint/build PASS. 461 domain PASS, 3 skip integration có sẵn.
- Matrix unit của cả 20 blueprint: plan không trừ đồ, thiếu vật liệu không hoàn thiện, deposit/complete tạo đúng building/container. Ground edge, overlap sau xoay, malformed version và footprint legacy PASS.
- Integration: mép chuồng thực sự chặn player sweep sau reopen; save cũ không bị phóng to. Hoàn vật liệu khi túi đầy vào hòm thật ở 1.25m, replay/reopen không mint, stale/distant/both-full không publish từng phần PASS.
- E2E ba flow PASS 22.5s: đổi funded blueprint, outline chuồng xoay 3×2.5 → 2.5×3, hủy khi túi đầy → thông báo hòm → save/reload → kiểm tra contents thật. Đây là fixture kiểm soát, không phải playtest người mới. Ảnh đã xem tại work/outputs/solo-field-construction.

## Giới hạn và việc sau

Footprint là dữ liệu ground authoritative; bộ hình facilities còn cần art/orientation review toàn thể trong #242. Không tính bằng checkpoint này là mọi hình đã polished. Chưa thêm hoàn vào ground drop hoặc chia qua nhiều hòm; khi cả hai đầy, hành vi giữ escrow được kiểm tra.

Natural expedition dài và FPS cuối sẽ chạy lại trên head tích hợp ở S8. #240 vẫn OPEN đến CI/merge/deploy và đối chiếu acceptance. Các phần cave, EN/VI gameplay, canonical watering/growth vẫn là việc riêng; không đóng Phase 2 hoặc human/co-op gates bằng mốc này.
