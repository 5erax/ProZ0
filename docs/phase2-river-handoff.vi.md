# D1 — sông theo seed và địa hình generation 5

Liên quan #221, #237, #242. Đây là checkpoint triển khai trên nhánh `feat/phase2-owner-completion`, chưa phải nghiệm thu hay bản production. #216/#226/#232 còn các phần tàn tích, câu cá, núi/hang riêng.

## Luồng và phạm vi đã triển khai

Thế giới Colony single-player mới dùng generation 5. Dòng chính có khúc uốn theo seed, hai nhánh hợp lưu, bề rộng thay đổi và ba đoạn nước nông. Người chơi đi qua nước theo luật wading hiện có (70% tốc độ); không thêm bơi hoặc chết đuối. Công trình/ô trồng dùng kiểm tra đất chính thức, không đặt được trên nước. Vùng khởi đầu và các anchor thu thập gần lab giữ an toàn; hồ nguồn nước khởi đầu vẫn tồn tại.

Sông chính nằm trong vùng khám phá từ -512 đến +512 m theo trục xoay của seed. Hai nhánh bắt đầu ở trục ngang -384/+448 m và hợp lưu ở -208/+224 m. Đây là một mạng nước hữu hạn trong phạm vi nội dung hiện tại, chưa phải hệ thủy văn vô hạn cho mọi vùng thế giới. Dòng nước luôn là nước ngọt; chưa có nước lợ, lũ theo mùa, lượng mưa tạo dòng chảy hoặc mô phỏng cân bằng nước.

Art nước có bốn frame, hướng dòng, viền bờ theo bốn ô lân cận và màu sáng ở đoạn nông. Mặt nạ bờ chỉ đọc ô đã khám phá để không lộ bờ phía sau fog. Sprite/cache hữu hạn theo biome × mask × frame × direction × shallow; không tạo texture theo tọa độ hoặc theo từng tick. Nước vẫn là grid 2 m raster hóa đường cong, không cam kết đường cong vector mịn ngoài phong cách pixel.

## Hợp đồng dữ liệu

- `COLONY_RIVER_GENERATION_VERSION = 5`. V3/V4 vẫn giữ generator, fingerprint, terrain, entity IDs và luật marsh overlay cũ. V5 có fingerprint `generation-5`; namespace/IDs của các resource candidate hiện hữu được tái dùng, chỉ lọc cây/đá/quặng nằm trong nước trong **thế giới mới**.
- `ColonyHydrology.ts`: RNG namespace `colony-hydrology:v1`, stable identifier `river-network`; seed quyết định hướng xoay, offset, hai pha meander và bề rộng. Query toàn cục không phụ thuộc load order, đồng hồ, `Math.random` hoặc chunk RNG.
- `colonyWaterAt(seed, position)` trả kind, freshwater, depth, flow, crossing, shoreDistance hoặc null. Độ sâu dòng chính tối đa 0.7 m, nhánh tối đa 0.4 m, crossing 0.25 m; depth hiện dùng cho trình bày/contract, chưa tạo luật tốc độ riêng cho mỗi độ sâu.
- `colonyRiverTerrainAt` quantize về cùng cell center 2 m với generator. Generated terrain là nguồn ground/water cho adapter, map và render. `colonyLandscapeTerrainAt(..., generationVersion)` bỏ marsh stripes khi V5, giữ nguyên ở V3/V4.
- Save V2 không thêm persisted river graph: lưu seed và generationVersion hiện có đủ để dựng lại cùng raster. Compatibility loader solo nhận [3,4,5], generator migration fingerprint resolver nhận V5. `upgradeColonyEcosystem` chỉ additive V3→V4; V4/V5 trả nguyên trạng, không tự nâng V4→V5. Muốn sông mới phải tạo thế giới mới, không mất/reset thế giới cũ.
- Hosted scene/map đọc version của generated base để không phủ stripes lên V5 nếu có scene đó; hosted production mặc định vẫn V4. Chưa mở khả năng import world solo V5 vào phòng Internet hoặc sửa fingerprint/network contract để hứa parity mới.

## Source map và điểm tiếp nhận

1. `src/world/phase2/ColonyHydrology.ts`: trường nước/landmarks, cache tham số tối đa 16 seed.
2. `src/world/phase1/Phase1ChunkGenerator.ts`: raster V5, lọc resource trên sông, fingerprint V5.
3. `src/client/runtime/Phase1ProductReviewPersistence.ts` và `src/persistence/migrations/ColonyEcosystemUpgrade.ts`: fresh/default và giữ save cũ.
4. `src/world/phase1/Phase1VerticalSliceWorldAdapter.ts`, `src/integration/ColonyHostedScene.ts`: placement/speed/scene đọc version thật.
5. `src/client/presentation/ColonyWaterArt.ts`, `src/client/runtime/Phase1ProductReviewWorldRenderer.ts`: mặt nạ bờ, frame nước và metadata depth.
6. Map solo đọc generated terrain qua `Phase1ProductReviewMapProjection.ts`, không tạo query nước riêng.

## Kiểm tra và công việc tiếp

20 seed: khác hình mạng, cùng seed/load order cho cùng chunk, crossing nông, vùng landing khô, cây/đá không nằm trong dòng. Integration: đứng trên nước → tốc độ 0.7 → reject nền công trình → map và hosted scene cùng water → Save V2/reopen giữ version/seed/nước; cache resource invalidate khi activate/release chunk. V3/V4 terrain equality và golden determinism vẫn là gate bắt buộc.

UI Save V2 fixture đã đạt: preview nước invalid → click bị từ chối → bank plan không cần vật liệu → map mở → save/reopen giữ river và plan. Ảnh bờ thật đã xem, sửa box-shadow thành mặt cạnh SVG. Benchmark cuối 12 mẫu/sáu cảnh đạt min 60.21 FPS/P95 max 16.8 ms, Windows HeadlessChrome153 1280×720; chưa thay headed/Internet playtest. Toàn suite và exact-head CI cần đạt trước đóng issue. Nút nước còn lấy qua potable-water resource như trước; chưa có action lấy trực tiếp ở mọi river tile. D2 câu cá sẽ dùng `colonyWaterAt`/canonical raster, không suy luận nước từ màu UI; phải có rod/bait/catalog/migration, ledger capacity/replay, kết quả theo seed và thời gian authority, save/reopen và đường hủy.

POI và hang không được đặt trên nước chỉ vì ảnh đẹp. Cần tăng density quanh bờ có kiểm tra collision/ground chính thức, thêm lối khám phá có phần thưởng thật và không lộ vị trí chưa khám phá. Không thêm âm thanh ngoài rain loop được Owner duyệt.
