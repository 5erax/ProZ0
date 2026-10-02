# Living World / Homesteads — kế hoạch nghiệp vụ, kỹ thuật và bàn giao

Owner mở rộng sáu yêu cầu sau release #212. Baseline main 4220521. Nhánh product/living-world-and-homesteads. Tiếp tục phạm vi single-player; không gán các cơ chế mới vào co-op server đang có nếu chưa có protocol/authority tương ứng. Giữ save đang chơi và generation version.

## Kết quả cần đạt

1. Công trình do người chơi dựng có thao tác Move/rotate, kiểm tra nơi cũ và nơi mới, giữ nguyên ID/container/đồ/tiến độ. Lab khởi đầu là landmark cố định; habitat nối lab phải đổi sang connector hợp lệ, không cắt liên kết trên giấy. Di dời không tiêu hao kit hoặc nhân đôi nội dung kho. Hoàn tất lệnh phải kiểm tra revisions, alive, quyền sở hữu và khoảng cách hai đầu. Preview không mutate state. Blueprint cũ vẫn di chuyển như trước.
2. Chicken, rabbit, goat, boar có tuổi non/trưởng thành khác, thức ăn/nước, sinh sản cần cặp trưởng thành và đủ điều kiện; fox săn chicken/rabbit, wolf săn goat/boar. Động vật có tọa độ/movement/health/corpse/loot thật. Wild graze và predator hunt theo thời gian, giới hạn sức tải vùng và toàn thế giới. Domestication bằng animal feed vào pen gần đó; nuôi cần feed/water, sản phẩm egg/milk/wool, sinh con có cooldown. Săn/slaughter dùng công cụ và giao dịch loot chỉ một lần; túi đầy giữ xác/sản phẩm. Không gọi đàn vô hạn là cân bằng tự nhiên.
3. Bốn mùa dựa authority clock: một mùa 12 phút active-time, năm 48 phút, bắt đầu xuân; không chạy khi đóng game. Xuân growth +35%; hạ khô nhanh, cây chết sau thời gian thiếu nước; thu yield cao hơn, seed/forage thuận lợi nhưng có gió/khô; đông growth giảm, lạnh ngoài shelter, campfire cần nạp nhiên liệu để sưởi. Biome/soil làm thay đổi hiệu ứng. Rain tưới thật, frost/drought biểu hiện bằng hình và HUD; thermal integration dùng survival authority, không trừ máu từ UI.
4. Soil theo seed/tile và vùng đất riêng (không thay generator/biome cũ): loam, sand, clay, peat, rocky có fertility/moisture và hệ số khác. Canh tác có moisture, fertilizer, progress, wilt/dead/ready, greenhouse/irrigation tác dụng thật. Thực vật tự nhiên cũng dùng seasonal/soil modifier khi đặt lịch hồi mới; giữ deadline đã lưu.
5. Chọn bất kỳ đất khô đã khám phá hợp lệ trong tầm thao tác, không khóa theo lab/biome/toạ độ farm. Chỉ hạn chế vật lý (nước, collider, plot/công trình chồng nhau) và ngân sách bounded. Farm/pen đặt ngoài base, trạng thái và sản phẩm lưu ở toạ độ thật. Không yêu cầu về lab để gieo/tưới/gặt/feed/thu sản phẩm. Cơ chế farm/pen cố định trước đây giữ nguyên cho compatibility nhưng luồng solo mới dùng plots/animals tại chỗ.
6. Mở rộng chuỗi nguyên liệu/seed/cây trồng/thịt/trứng/sữa/lông/da/đất sét/salt/than/compost/feed; công cụ hoe/watering can và food/processing recipes. Facilities mới phải có công dụng thật: livestock pen, coop, greenhouse, irrigation, compost, kiln, smoker, mill, tannery. Chi phí địa phương hợp lý; không thêm nút rỗng. World forage/deposits seed-based có depletion/renewal để nguyên liệu không chỉ xuất hiện qua test grants.

## Hợp đồng thực hiện và dependencies

| Task | Đầu ra / trách nhiệm | Acceptance / kiểm tra | Dependency |
|---|---|---|---|
| LW-01 Product/content | Kế hoạch này, bảng species/soil/season/cost/crafting và save contracts | Mỗi yêu cầu có cơ chế + UI + persistence + test | Baseline |
| LW-02 Building authority | Relocate canonical/custom; giữ container/máy; footprint ignore-self; connector handling | Full crate move giữ đồ, collider chuyển, fail không mutate, stale/replay, save-reopen | LW-01 |
| LW-03 Living content/state | Dữ liệu mới + optional livingWorld version 1; nhận dạng content compatibility có upgrade cũ minh bạch | Unknown fingerprint vẫn fail; old save vật liệu/seed giữ nguyên; corrupt clocks/species/crossrefs fail | LW-01 |
| LW-04 Seasons/soil/farming | Deterministic seasons/soil, plots tùy ý, watering/fertilizer/rain/wilt/death/harvest, heat/fire | Spring đúng +35%, summer thiếu nước chết, winter lạnh và fuel fire có tác dụng; plot xa lab; harvest exactly once | LW-03 |
| LW-05 Wildlife/husbandry | Spawn seeded explored patches, 6 species, movement/lifecycle/reproduction/predation, tame/feed/products/hunt | Differing growth, pair requirements, carrying capacity, predator diet, animals/death/loot saved, no duplicate loot | LW-03/LW-04 |
| LW-06 Production/UX | Facilities/recipes functional; field markers/cards/status, season visuals, contextual actions | Costs/stations real, no remote grant; visual animal/crop/season motion; normal inputs and small viewport | LW-02/LW-04/LW-05 |
| LW-07 QA/release | Domain + integration + natural browser journey; compatibility + full CI/frame gate; PR/release/notice | Public flow verified, existing worlds preserved, report failures/skips honestly; no invented acceptance | Tất cả |

Làm trong chat này, commit từng increment sau kiểm tra phù hợp. Không tự gửi chat khác. Nhân sự tiếp nhận nhận input/output SHA, paths, API, invariants, test command + kết quả và giới hạn.

## Authority / save / hiệu năng

- Các command id/player/expected world + inventory revisions/action/target/position có cached receipts lưu bounded. Repeated ID không loot/craft/góp đồ hai lần. Sai owner/range/alive/terrain/capacity giữ cả inventory và entity.
- Building relocation giữ structure ID và linked container ID; tự tính lại network. Các custom facility references và living pen refs đồng bộ, từ chối move nếu sẽ strand captive animals/crops chưa di chuyển.
- LivingWorld là extension optional; absent khởi tạo tại clock đã lưu, không giả lập hàng giờ trước đó cho save cũ. Mùa là pure clock-derived. State lưu animals/plots/forage/fuel/receipts/spawn-region cursors; validation finite/range/caps/timestamps/refs. Không reroll terrain hoặc reset inventory.
- Content thêm item cần fingerprint compatibility/upgrade cũ được kiểm chứng; không bỏ toàn bộ fingerprint guard để mở save.
- Tick ecology theo giây, movement bounded, index/culling theo vùng, cap plots 256 / animals 96 / forage regions bounded. Caps kỹ thuật không khóa vị trí quanh base. Không render/sort toàn bộ động vật mỗi simulation tick nếu không cần. Frame gates ≥50 FPS/P95≤34ms giữ nguyên; máy Owner đã có baseline timing failure, phải ghi số đo thực thay vì gọi mọi máy 60 FPS.
- Fixture accelerated season/animal ages chỉ dùng domain/integration và labelled visual QA; browser nghiệp vụ phải gather/craft/build/plant/feed/transfer thật. Rare whole-year verification có thể step authority trong test, không bắt user chờ một năm.

## Sổ thực hiện

| Task | Trạng thái | Commit / evidence |
|---|---|---|
| LW-01 | PLANNED / audit complete | Cơ chế hiện tại: farm -6,4; pen 6,4; 7 facilities / 6 field recipes; không relocate completed buildings |
| LW-02–LW-07 | PENDING | Triển khai và ghi evidence từng increment |

## Nhật ký triển khai

- LW-01: 1cf1efe — hợp đồng nghiệp vụ/kỹ thuật/QA.
- LW-02: 903be11 — di dời công trình và connector, unit/domain 8 PASS; browser kho có Plant Fiber + di dời + reopen PASS.
- LW-03: 9475676 — 29 items bổ sung; season/soil/crop/species/station/recipe metadata; V3/V4 dùng chính identity catalog cũ cho generation. Catalog mới có fingerprint mới, không giả mạo fingerprint cũ.
- LW-04/05 và save: ed84786 — authority crops/water/wilt/soil, wildlife movement/maturation/reproduction/predation/taming/production, station buffers, cold/fire, known-catalog upgrade. Domain + integration mới 10 PASS.
- LW-06: giao diện và sprite đang kiểm tra. Đã sửa marker chặn click di dời, thứ tự panel bị HUD che, details/scroll bị reset do refresh dữ liệu.
- Regression trước kiểm tra hành trình mới: typecheck/lint PASS, 147 unit PASS, 181 integration PASS (3 skip), 13 determinism PASS, 31 browser PASS. Hành trình expedition 3 PASS. Hành trình canh tác đang kiểm tra; chưa coi số này là kết quả CI cuối.

### Giới hạn rõ ràng

Mùa dựa 60 Hz active tick; 12 phút/mùa, 48 phút/năm. Không catch-up khi đóng game. Đây là hệ sinh thái hữu hạn với quy tắc, seed và feedback môi trường; không tự sáng tạo species/terrain/genetics ngoài catalog. Giới hạn 256 plots, 96 animals, 128 vùng spawn, 768 forage, 64 stations và tối đa 64 marker DOM nhìn thấy. Di dời habitat vẫn giữ kết nối lab; field cabin độc lập có thể đặt ngoài base. Co-op không được gán các authority mới trong lần này. #204 đo hiệu năng máy Owner và co-op vẫn mở; không tuyên bố 60 FPS mọi thiết bị.

- LW-06: 39d204e — panel Homestead [F], E contextual/world markers, 10 sprite công trình và 29 icon vật phẩm. Craft details và scroll giữ ổn định qua refresh; soil tint cache theo tile, snow/leaves drift theo active clock và camera.
- Rà soát sinh học bổ sung: trứng/sữa chỉ do con cái sản xuất; shearing có cooldown riêng, không dùng chung breedTick. Giới tính migration không phụ thuộc parity loài. Vật nuôi di chuyển trong pen với collision của pen được bỏ qua riêng; không bỏ qua công trình khác. Bricks dùng xây cabin; bone compost bổ sung, tổng 15 recipes mới. Spawn khi chưa khám phá phải retry; lịch sử spawn tránh nhân đôi sau săn.
