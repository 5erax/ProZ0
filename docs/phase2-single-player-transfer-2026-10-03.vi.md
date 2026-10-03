# Bàn giao single-player — 03/10/2026

Checkpoint lịch sử bên dưới được nối tiếp bởi [release handoff](phase2-solo-release-handoff-2026-10-03.vi.md): hang/núi đã bật trong fresh solo, growth v2 và locale đã có code; final QA được Owner giao người khác. Đọc hồ sơ mới để biết phạm vi release và phần còn lại.

Owner yêu cầu chốt commit công việc đang làm để giao người khác, đóng issue khi đã hoàn thành. Đây là checkpoint bàn giao, không phải nghiệm thu Phase 2 hay phát hành lên production.

## Điểm bắt đầu cho người tiếp nhận

- Repository: `5erax/ProZ0`; nhánh `feat/phase2-final-completion`; [PR #245](https://github.com/5erax/ProZ0/pull/245) OPEN/DRAFT, base main `78f50a85d11264f17958cea9df03aa8055232e30`.
- Lấy HEAD mới nhất của nhánh/PR này. Không bắt đầu chỉ từ main rồi làm lại S1–S5. Kiểm tra `git status`, `git log -12`, PR checks và main trước khi sửa.
- Không có nhân sự mới được gán, không gửi yêu cầu sang các chat A-PM/A-GE, không chiếm hoặc suy diễn khóa vai trò cũ. Owner sẽ giao người tiếp nhận.
- Phạm vi Owner hiện là single-player. Co-op Internet, human playtests #199, Owner acceptance #187 và điều phối #67 chưa được nghiệm thu thay bằng test tự động.
- Các thư mục `.agents/skills/redis-*` và `skills-lock.json` chưa tracked là công việc ngoài đợt này; không đưa vào commit, xóa hay reset.
- Production Vercel/Pages vẫn ở phiên bản main trước PR này. Chưa merge, deploy, tạo release mới hoặc đóng issue bằng việc hoàn tất helper.

## Các commit đã có trước checkpoint cuối

| Commit | Thay đổi và hồ sơ |
|---|---|
| `fdbaf9e` | Stat chủ động một card, giữ left/E cho tương tác. [Handoff input](phase2-object-input-handoff.vi.md). |
| `e323b9a` | Canonical resource sinh trưởng nhiều mốc; khoáng hữu hạn. [Lifecycle](phase2-resource-lifecycle-handoff.vi.md). |
| `a42a294` | Cắt/đào gốc và trồng lại qua item ledger, không mint đồ. |
| `b363342` | Targeted object input và giữ focus khi tương tác building. |
| `4da3ed8` | Đất ẩm local persisted, grass/soil variants, gió động. [Soil/weather](phase2-soil-weather-handoff.vi.md). |
| `e68c313` | Hunt đọc vũ khí đang trang bị, stamina/wear/cooldown được lưu. [Hunting](phase2-hunting-equipment-handoff.vi.md). |
| `3aba05a` | Sáu ô equipment, bốn wearable có modifier thực, avatar/world layers và save compatibility. [Wardrobe](phase2-wearable-equipment-handoff.vi.md). |
| `344a5dc` | Footprint riêng công trình mới, rotate/move/conservation và hoàn vật liệu sang hòm thật khi túi đầy. [Construction](phase2-field-construction-handoff.vi.md). |
| `a59b874` | Nền tảng cave authority/collision/item routing, scoped drops/cache, bounded state. [D4.2](phase2-cave-query-handoff.vi.md). |

Checkpoint cuối nối cave authority vào Bundle/Save V2 bằng **cờ thử nghiệm tắt mặc định**, không bật hang vào trình chơi. Commit chính xác của checkpoint đọc ở HEAD PR và thông báo GitHub, tránh ghi hash tự tham chiếu trong file cùng commit.

## D4.3 — mã hang đã nối ở checkpoint này

### Contract và source

- `src/world/phase2/SoloCaveRegistry.ts`: registry ba cửa hang theo seed + generation 3/4/5, namespace RNG riêng. Approach ở vòng khám phá đầu, ground được kiểm tra cho generation 5; không đổi base terrain/entity IDs/fingerprint bề mặt. Chưa phải địa hình núi cao thấp.
- `src/simulation/worldspaces/SoloCaveState.ts`: version1, một actor/location/return anchor, ba spaces, fog/depleted node IDs, 32 drops và 32 caches mỗi hang, 64 receipts. Layout/portal không nhận từ save mà dựng từ seed tin cậy.
- `src/simulation/worldspaces/SoloCaveAuthority.ts`: collision toàn thân, sweep chống xuyên tường, LOS/fog, finite mining dùng resource/tool/stamina/wear/yield thật, enter/exit CAS/idempotency, drop/cache scope.
- `src/integration/worldspaces/SoloWorldspaceWorldAdapter.ts`: item/collision/survival router. Trong hang không fallback resource/station/container/predator bề mặt. Trên bề mặt từ chối entity/container/resource thuộc hang trước khi gọi surface port. Unknown interior player bị từ chối.
- `src/integration/Phase1AuthorityBundle.ts`: optional `soloCavesEnabled`, `caves`, `interactionWorld`, `playerWorldspace()` và `getSurfacePlayerIds()`. Config phải single-player expedition. Movement/items/combat/death dùng router. Sync pose/fog sau movement, giữ streaming quanh return anchor; không reveal/discover surface từ tọa độ local hang; thermal cave 40 và sheltered, không áp lại seasonal/fire surface. Surface AI/living không target actor trong hang.
- `src/world/phase1/Phase1VerticalSliceWorldAdapter.ts` và `src/world/building/BuildingTypes.ts`/`Phase1BuildingWorld.ts`: surface player guard cho range/storage/station/placement; `canStandAt` dùng footprint được integration truyền xuống. World layer không import simulation.
- `ExpeditionActor.spaceId?` và các actor callback của living/colony/sustenance/fishing: surface actions trả `WRONG_WORLDSPACE`. Gather/consume/rest/fishing đang chạy bị hủy trước chuyển không gian; không hoàn bait đã tiêu hay lấy kết quả câu sau chuyển.
- `WorldManifestV2.soloCaves?` version1 là extension optional, không đổi IndexedDB key/schema của save cũ. Composer lưu actor/spaces và đưa cave containers vào durable ledger/owner resolution; cave entities **không** giả thành createdEntities của surface chunks.
- `SaveValidatorV2.ts`: đối chiếu registry seed, sole PlayerRecord và movement position; cave entity/container phải đúng kind và owner hai chiều; không mượn inventory/storage surface, không trùng entity surface, không nhận unknown/future version. Reopen phải bật cờ có chủ ý nếu save chứa extension.

### Death recovery khi đầy hang

Hang giữ tối đa 32 cache. Router chỉ khi registry thực đã đạt cap mới lấy trusted surface reservation tại Landing 0,0; WeakSet lưu đúng object reservation và tiêu thụ khi commit, không nhận token do save/client giả. Canonical DeathAuthority chuyển toàn bộ cargo sang cache đó, player vẫn hồi sinh bình thường. Cache overflow thuộc surface và được lưu qua surface chunk/owner như trước. Không xóa cache cũ, không xóa item để nhường chỗ, không mở cap vô hạn.

### Đã kiểm chứng ở subsystem

- Năm test D4.2: transition/replay/fallback, actual movement runtime chặn tường, snapshot/scope/cargo, mining ledger/stamina/tool/finite/full bag, strict worldspace routing.
- `tests/unit/solo-cave-registry.test.ts`: 100 seed × 3 generation, registry ổn định và ba cửa dry/separate; không dùng RNG chunk bề mặt.
- `tests/integration/solo-cave-save.test.ts`: Bundle thật → drop → movement → Save V2 → reconstruct/reopen giữ nguyên actor/ledger; forged owner/container/player position/version bị từ chối; surface fingerprints giữ nguyên.
- Canonical damage/death → cache trong hang → save khi pending respawn → reopen → hồi Landing → không truy cập cache từ surface → reenter/transfer đúng → empty cache được dọn và save vẫn hợp lệ.
- Capacity fixture tạo 32 cache **có container ledger thực**, sau đó death thật lần kế tiếp giữ cargo tại Landing và portable validation PASS.
- Fixture có relocation/material cấp bằng authority để kiểm tra biên. Đây không phải browser exploration tự nhiên hay tester mới.
- Tại checkpoint: `npm run typecheck`, `npm run lint`, domain (unit/integration/determinism) **470 PASS / 3 skip đã có từ trước**, `npm run build` và **49 browser tests PASS**. Build còn cảnh báo chunk lớn; không coi warning là số đo FPS.

### Chưa bật / người tiếp nhận phải làm tiếp

1. `soloCavesEnabled` hiện tắt mặc định; browser entrypoint chưa truyền true. Không bật cờ chỉ để gọi hang đã hoàn tất. Chưa có portal input/render, cave map/fog/HUD, art interior, tắt weather/rain trong hang hoặc natural browser journey.
2. #232 còn yêu cầu **hai elevation profiles, ramp/cliff/collision/placement/art dùng cùng nguồn**, ba cave interiors trong luồng chơi. Registry cửa đơn thuần không thay thế núi. Đọc [preflight D4](phase2-mountain-cave-preflight.vi.md).
3. Trước bật UI, rà các read/preview surface còn đọc local actor coords: remote lab access, placement previews, expedition event region trong tick, HUD/map/renderer. Commands chính đã guard nhưng query/presentation vẫn cần scope đầy đủ; không coi tên hàm tương tự là đã route.
4. Khoáng cave đang dùng `CaveNode.yieldQuantity` (1–3) như size tier trong harvest profile: stone base × tier, ore base × tier. Chốt/đổi tên contract và kiểm tra stat/art/yield trước UI; không hiển thị số này như tổng yield nếu logic khác.
5. Rà `activatePlayersOnCreate:false` nếu muốn dùng cave flag ở composition khác: cave foundation hiện dành cho local one-player activated runtime, không admission co-op. Không bật hoặc replicate flag cho hosted rooms.
6. Rà performance fog LOS mỗi tick, validation/callback bounds, exit blockage/fallback, transition cancellation cùng HUD ephemeral state. Không thêm RAF riêng. Final gate ≥50FPS/P95≤34ms giữ nguyên.
7. Browser thật: đi đến cửa → vào → mining → drop → save/reopen → death → respawn → quay lại lấy đồ → exit; terrain/fog/save cũ/unknown-space/replay/full bag/overflow phải có coverage. Chỉ sau đó bật runtime và close #232 nếu núi/art cũng đạt.

## Issue matrix để giao người tiếp nhận

Không issue mở nào dưới đây được đóng tại checkpoint này: các feature chưa đạt integration/release gate cuối; các phần chưa làm được ghi riêng, không reset toàn bộ về “chưa có gì”.

| Issue | Mã đã có trên nhánh | Việc còn lại trước đóng |
|---|---|---|
| #244 | Card chủ động, right/left/E, input/focus/providers/teardown; targeted browser flows có evidence | Sửa hit interception CI bên dưới, full E2E/co-op regression/FPS, tích hợp và deployment. |
| #215 | Ba size tiers/yield/finite minerals và lifecycle | Final art/stat/yield nhận diện, scenes đông và release. |
| #222 | Growth stages/ETA/stat inspect | Canonical duration hiện khóa tại cut: tưới đất trong thời gian hồi chưa thay tốc độ. Thiết kế rate/work progress theo active tick, unloaded catch-up deterministic, giữ legacy/save compatibility. |
| #223 | Uproot/transplant canonical roots qua ledger; save/replay/capacity | Final head regression, tích hợp/release. |
| #238 | Grass/forage fiber harvest/regrowth | Balance harvest/pressure/labor và final QA/release. |
| #224 | Sáu grass silhouettes, pivot/variants | Dense-camera/fog/resize art review cùng #242; final release. |
| #230 | Soil 3 trạng thái/patch nước/save/terrain mapping | Final scene consistency/FPS và release. |
| #236 | Dry wind hướng/depth/warning-rise-peak-fall | Populated/weather final FPS + visual review/release. |
| #237 | Coherent tile variants/soil palette | Seam/biome edge/camera final review/release. |
| #220 | Sáu slot, drag/button avatar/world; bốn wearable có gameplay effect | Full E2E/CI/FPS/release; wearable mới solo, co-op chưa replicate theo scope Owner. |
| #239 | Sáu rarity token/tên/viền, equipment/hunt cost/range/wear/cooldown/save | Final integration/CI/release; không tự hứa drop balancing chưa đo. |
| #240 | 20 blueprint; escrow/footprint/move/rotate/replace/full-bag refund/save | Final regression/FPS/art facility; release. Footprint mới không tự scale mọi sprite facility. |
| #242 | Một phần UI/art/pivot/soil/grass/equipment sửa | Big art toàn thể vẫn chưa xong, nhất là facility tỷ lệ/orientation và review thú/cây trong camera thực. |
| #232 | Layout + scoped authority + optional Bundle/Save plumbing | Mountains + portal/renderer/map/input + actual browser journey và bật luồng chơi. |
| #225 | Lobby có EN/VI | Gameplay dictionaries/content/reasons/timers/accessibility/settings persisted, font/narrow/fallback/key parity. Không fuzzy DOM translate, không đổi gameplay IDs/RNG. |
| #204 | Các kiểm tra FPS cũ và cải thiện trước đó | Exact final solo scenes ≥50/P95≤34, Internet/co-op latency ngoài ưu tiên hiện tại. |
| #166 | Handoff từng hệ thống | Gameplay master contract còn cũ; cập nhật theo source sau khi feature cuối ổn định. |
| #167 | Handoff authority/save seams | Architecture master contract còn cũ; matrix owner/intent/time/RNG/save/network và giới hạn cuối. |
| #199 | Một số natural automated journeys | 3–5 người mới và hồ sơ balance thật; không thay bằng fixtures. |
| #187 | Chưa nghiệm thu bản cuối này | Owner xác nhận sau bản phát hành đúng SHA; không suy từ nghiệm thu Phase 1. |
| #67 | Điều phối chung | Permanent project coordination, không close vì chốt nhánh solo. |

## CI còn đỏ, phải xử lý trước merge

[Run 37125976721](https://github.com/5erax/ProZ0/actions/runs/37125976721) tại `344a5dcc7254a70530444cf0a757844607bfe24a`: type/domain/build/browser và một phần E2E đã qua, nhưng `quality` FAIL trong E2E. Đừng gọi required CI hiện tại là PASS.

- `tests/e2e/living-world.spec.ts:176`: click `.lw-object[data-living-id="plot:27"]` bị `.p1-product-sprite[data-world-role="resource"]` Stone Outcrop intercept.
- Resource cụ thể: `generated:resource:7149399be24b111606806c70c2b4c4ba`, size medium, focused true. Plot là root, wet, stable; resource vùng bấm che plot.
- Đây là gap giữa hit shape/depth/target routing các renderer, không xử lý bằng `force:true`, bỏ assertion hoặc nới timeout. Cần reproduce actual input, thống nhất depth/pivot/interactive hit region và giữ pointer cho entity hợp lệ. Rà `LivingWorldOverlay`, `Phase1ProductReviewWorldRenderer`, `ResourceSizeArt`, world target dispatch.
- CI dừng sau 31 tests PASS; 38 chưa chạy, một interrupted và một skip tại lúc dừng. Không dùng số 31 làm full-suite acceptance hoặc khẳng định các bài chưa chạy sẽ qua.
- Checkpoint mới có thể kích hoạt CI mới sau push; người nhận đọc checks của **HEAD mới nhất**, không dùng kết quả revision cũ. Chưa chạy full functional/FPS trên checkpoint D4.3.

## Lệnh kiểm tra và tích hợp

Node 24 theo `package.json`, lockfile giữ nguyên. Không chạy browser khác hoặc tác vụ render nặng đồng thời với FPS.

```powershell
npm ci
npm run typecheck
npm run lint
npx vitest run tests/unit tests/integration tests/determinism --config vitest.config.ts
npm run build
npm run test:browser
npx playwright test tests/e2e/living-world.spec.ts --project=functional --workers=1
npm run test:e2e -- --max-failures=1
```

Final full E2E có thể mất nhiều phút vì natural journeys. `P0_TEST_HEAD_SHA` phải là HEAD kiểm tra; frame-pacing dùng cảnh thật, không hạ gate. Các handoff từng mốc phân biệt fixture với natural flow và ghi ảnh trong `work/outputs`; ảnh local không thay evidence CI/public. Chỉ khi code + required checks + review/integration xong mới merge/deploy đúng SHA, verify production save/reopen, cập nhật delivery receipt và close các issue thực sự đạt. PR vẫn draft để người nhận tiếp tục.
