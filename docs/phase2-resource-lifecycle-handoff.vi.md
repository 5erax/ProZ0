# Checkpoint vòng đời tài nguyên canonical — single-player

## Hợp đồng đã triển khai

Thế giới solo mới có `environment.resourceLifecycleVersion: 1`. Save thiếu trường này giữ hành vi cũ, kể cả khi config mở lại yêu cầu phiên bản mới. Không đổi generation, seed, ID, content fingerprint hoặc dữ liệu túi.

Mỗi resource lưu `lifecycle` tùy chọn. Đá/quặng dùng `{version:1,kind:'mineral'}`: số lượt còn lại giảm qua gather transaction hiện có; cạn thì `regenerationReadyTick:null` và không hồi, kể cả unload/reopen. Nước giữ nguồn không giới hạn cũ. Fiber/food/timber mới dùng `{version:1,kind:'plant',stage,cutTick,matureTick}`. Ban đầu mature để có nguyên liệu khởi đầu. Sau lượt thu cuối, early bị chặn thu; nửa chu kỳ chuyển growing, sản lượng mỗi lượt là `max(1,floor(matureYield/2))`; hết chu kỳ mature cho sản lượng đầy đủ. Kích cỡ ×1/2/3 và work/wear vẫn có hiệu lực.

Chu kỳ dùng simulation tick; duration tại lúc cắt áp dụng recovery multiplier của ecology, outpost, mùa và đất. Đây là dự báo khóa tại lúc cắt, chưa phải mô phỏng độ ẩm canonical biến thiên từng bước. Unload giữ mốc thời gian; load cập nhật tới world tick hiện tại. Không dùng wall-clock/offline catch-up. Stage boundary tăng revision: channel stale bị từ chối thay vì cấp sản lượng khác giữa lượt. Rendering/inspection chỉ đọc, không tiến simulation.

## Nguồn và kiểm chứng

- State/validation: `ResourceLifecycle.ts`, `Phase1WorldTypes.ts`, `Phase1WorldStore.ts`; bản portable và materialized-base cùng kiểm tra version/kind/stage/clock. Lifecycle không được khai báo trên world legacy, cutTick không vượt persisted authority clock.
- Gather: `ResourceNodeView.growthStage` → `resourceHarvestDefinition` → `ItemTransactionAuthority`; giảm sản lượng thật trong ledger. Full-bag/replay/stale vẫn dùng giao dịch đã có.
- UI: sprite growing nhỏ hơn silhouette mature, depleted có gốc/cụm cắt thấp; right-click hiển thị stage/ETA/sản lượng tối đa hoặc deposit hữu hạn. Hit shape theo cùng stage.
- Typecheck/lint/build đạt; 208 integration + 3 skip có sẵn, 13 determinism đạt; E2E resource right-click/harvest/save và living root transplant đạt. Tests mới kiểm tra stage boundaries, unloaded catch-up, finite exhaustion/reload, actual yield/replay, legacy reopen và dữ liệu version sai.

## Phần còn lại

Đã bổ sung checkpoint đào gốc canonical: timber/fiber/food sau khi khai thác cạn có thể đào bằng Field Hoe trong Homestead. `uprootedVersion:1` là tombstone riêng, hoạt động cả trên save legacy không bật growth profile. Gốc mới có item theo loài và khối lượng/thể tích riêng; trồng lại trên ground hợp lệ trong 4m, bắt đầu từ mầm. Transplant được lưu ở LivingWorld, không sửa bảng spawn/ID canonical. Timber transplant đòi field tool còn condition và trừ 2 condition cùng giao dịch thu hoạch; lấy gốc, trồng, compost đều có ledger thật.

`commitColonyExchange` chuẩn bị toàn bộ capacity/input/output/tool wear rồi mới gọi callback world đồng bộ. Uproot stale/full bag không thay tombstone; replay dựa receipt LivingWorld không cấp lại item. Candidate LivingWorld được validate trước ledger. Portable/materialized validation reject tombstone sai version/kind/state. Catalog nhận thêm ba root item, giữ đúng fingerprint catalog của release trước qua `createEquipmentV1ContentCatalog`; không nhận fingerprint tùy ý.

Kiểm tra checkpoint mới: typecheck/lint, 215 unit, 211 integration (+3 skip có sẵn), 13 determinism đạt. Integration kiểm tra fresh/legacy uproot→replant→save/reopen, replay/stale/full-bag, exact previous catalog preservation; unit kiểm tra timber tool và wear. E2E fixture dùng thao tác bàn phím/chuột thật: inspect stump bằng Shift-F10, uproot, đặt root, right-click sapling, save/reopen; ảnh `test-results/canonical-root/replanted.png` đã xem. Đây là fixture kiểm soát, không phải playtest người mới.

Local soil moisture/watering canonical thuộc S3. Đồ họa các stage cần review trong scene nhiều thực thể của #242. Hai lần E2E thử click stump phát hiện grove/mine diorama và living sprite có vùng pointer lớn che stump nằm phía sau; không force click hoặc đổi z-index để vượt kiểm tra. Keyboard focused-target inspection hoạt động; vùng hit cần được xử lý cùng routing canonical object trong #244/#242. Chưa đóng issue bằng checkpoint này; closure chờ đầy đủ acceptance, CI, merge và deploy.
