# C2 — kích cỡ tài nguyên, sản lượng và giữ save cũ

Phạm vi #215 và phần hình ảnh #242. Single-player Colony mới bật `environment.resourceProfileVersion = 1`. Save thiếu field giữ hoàn toàn yield/work/art cũ khi mở lại, kể cả client đang bật tính năng cho thế giới mới. Không đổi seed, entity ID, generation V3/V4, fingerprint terrain/content hoặc số lượt khai thác còn lại. Version khác 1 bị validator từ chối.

## Hành vi và cân bằng

Năm loại được phân cỡ: Fiber Plant, Food Plant, Timber Source, Stone Outcrop, Metal Ore Node. Nguồn nước không có kích cỡ. RNG namespace `resource-size:v1`, world seed + canonical entity ID + definition ID, tỷ lệ 30% nhỏ / 45% vừa / 25% lớn. Kích cỡ không phải mốc sinh trưởng và không thay đổi khi tải chunk, chọn object hoặc reload.

| Cỡ | Yield/lượt × base | Thời gian × base | Hao mòn × base |
|---|---:|---:|---:|
| Small | 1 | 1 | 1 |
| Medium | 2 | 1.5 | 2 |
| Large | 3 | 2 | 3 |

| Resource | Sản lượng nhỏ/vừa/lớn | Thời gian nhỏ/vừa/lớn | Độ bền mất nhỏ/vừa/lớn | Lượt/vòng đời |
|---|---|---|---|---:|
| Fiber | 2 / 4 / 6 fiber | 0.6 / 0.9 / 1.2 s | 0 | 4 |
| Food | 1 / 2 / 3 edible plant | 0.6 / 0.9 / 1.2 s | 0 | 3 |
| Timber | 1 / 2 / 3 timber | 1 / 1.5 / 2 s | 2 / 4 / 6 | 5 |
| Stone | 2 / 4 / 6 stone | 1 / 1.5 / 2 s | 2 / 4 / 6 | 4 |
| Ore | 1 / 2 / 3 ore | 1 / 1.5 / 2 s | 2 / 4 / 6 | 6 |

Tổng vòng đời bằng yield/lượt × số lượt. Mass/bulk/stack-limit từng item giữ catalog hiện hành; inventory kiểm tra **toàn bộ** lượt đầu ra trước channel và trước commit. Không thu một phần rồi mất phần còn lại. Công cụ/tầm với/collision nguồn, chi phí stamina authority và renewal timers hiện hữu giữ nguyên. Đây là tuning ban đầu: tăng hiệu quả lao động ở nguồn lớn nhưng hao mòn tỷ lệ sản lượng. Không tự thay đá/quặng thành cây sinh trưởng.

## Source và hợp đồng

- `ResourceSizeProfiles.ts`: định cỡ và effective harvest definition; chỉ world port authority cấp size. Request gather không nhận multiplier/size từ client.
- `Phase1WorldStore.getResourceSize`: cache tối đa 1024 ID, suy ra từ persisted profile version và seed. Chưa lưu bản sao size từng entity vì dữ liệu suy ra đầy đủ từ identity/version bất biến.
- `Phase1VerticalSliceWorldAdapter.getResource`: thêm size optional vào view nội bộ. `ItemTransactionAuthority.validateGatherStart` đóng băng effective output/time/wear trong channel; stale/replay/capacity đi qua giao dịch cũ.
- Environment mapper/session persistence/reopen/schema/validator giữ field optional. Dữ liệu seed/chunk/entity/player/item ledger không reroll.
- `ResourceSizeArt.ts`: ba silhouette native riêng cho từng resource, cây lớn thêm tán/nhánh, đá có mặt sáng/tối và quặng có vân, depletion có gốc/mảnh còn lại. Cache tối đa 30 sprite. Hit shape bỏ sky trống; highlight theo silhouette, tránh khung chữ nhật trong suốt khổng lồ.
- Context/tooltip đọc cùng effective definition: cỡ, yield thực tế và giây khai thác. Native labels chỉ lộ object đã khám phá. Full EN/VI còn thuộc #225.

## Kiểm chứng và phần còn lại

Integration kiểm tra large stone mất 120 tick, được 6 stone, tool 100→94, source 4→3; full bag không đổi source/wear; replay không nhân đôi. Save V2 giữ profile 1; absent vẫn absent khi client bật config mới; unknown version reject; cùng seed/order giữ size, seed khác thay distribution; base chunks và item ledger giữ nguyên. 18 gather/save integration đạt; 13 determinism đạt.

Journey mới không grant: fresh world → đi tới fiber → tooltip yield → gather thật → quantity tăng đúng yield → L save/reopen → size và quantity giữ nguyên (13.9 s). Năm presentation E2E đạt. Gallery và world screenshot đã xem ở `work/outputs/checkpoint-C2`. Handoff không thay Owner nghiệm thu hình ảnh.

Chưa đóng #215/#242: cần QA/art toàn bộ bản tích hợp và network profiling. Canonical tree multi-stage growth/uproot ở #222/#223 chưa nằm trong C2; cây lớn hiện vẫn depletion/renewal timer cũ. Stone/ore hiện giữ renewal timer legacy, chưa thiết kế mỏ hữu hạn/dynamic geological expansion. Footprint/tầm khai thác dùng anchor cũ, không mở rộng collision theo tán; không tuyên bố đã hoàn thành mọi yêu cầu mô phỏng sinh thái.
