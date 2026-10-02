# Hoàn thiện single-player — kế hoạch, nghiệp vụ và hợp đồng bàn giao

Baseline: main fbad288 (PR #210, đã phát hành trên Vercel/Pages). Nhánh product/single-player-completion. Đây là vòng đóng các thiếu sót thực tế của 12 yêu cầu Owner, không viết lại những chức năng đang hoạt động.

## Mục tiêu và ranh giới
Người chơi dùng được trọn vòng khám phá → dựng tiền đồn → góp đồ → sử dụng công trình → chỉnh/hủy blueprint → thu hồi công trình dã chiến → lưu/tải tiếp. UI phải thể hiện cùng trạng thái với authority, hình ảnh giúp phân biệt facility, và vật liệu không mất/nhân đôi khi thất bại hoặc thử lại. Tiếp tục giữ co-op/legacy độc lập, seed/generator và world save đang tồn tại.

Ngủ/nghỉ đã có, vì vậy giữ cơ chế nghỉ an toàn 8 giây hiện hành; không thêm một hệ thống ngủ trùng hoặc âm thầm nhảy giờ. Đột biến là tổ hợp có seed từ vùng/thời gian/khai thác/thời tiết với giới hạn và khả năng tái hiện để sửa lỗi. Không thể bảo đảm một phần mềm tự tạo mọi quy luật mà tác giả cũng không thể biết; mục tiêu nghiệp vụ là mỗi chuyến khám phá có diễn biến khác nhau, tránh thuộc lòng vị trí/lịch ở mọi seed.

## Đối chiếu cả 12 yêu cầu
| # | Nghiệp vụ và thực hiện ở baseline | Việc chốt trong vòng này | Bằng chứng bắt buộc |
|---|---|---|---|
| 1 | Rest ở lab/bed có hồi phục, điều kiện an toàn, ngắt, cooldown | Giữ lại; kiểm tra regression và công bố thời gian/cost rõ | Rest completion/cancel/hostile/reopen tests |
| 2 | Solo 32 kg inbound, trần 40 kg, volume 48, transaction enforcement | Tách số nguyên liệu đang mang khỏi escrow; sửa chỉ dẫn kho cũ; ghi rõ volume không là số ô trống | Carry domain/save và browser material counts |
| 3 | Hòm/bàn tiền đồn ngoài radius base, kiểm tra khoảng cách/đất | Preview footprint và thu hồi facility custom; không cấp storage/shelter cho ghost | Remote placement, collider, save tests |
| 4 | 7 facility choices có chức năng, 6 field recipes ngoài canonical | Asset riêng dễ nhận biết; availability thể hiện thật, chỉ dẫn station | Browser art/recipe/functional integration |
| 5 | New World fresh seed, nhập seed, Continue giữ version | Kiểm tra launcher, deterministic generation và old save | Seed E2E + determinism + upgrade regression |
| 6 | Renewal active-time nhanh hơn, giữ deadline cũ | HUD hiện renewing/countdown và không mời gather khi node đã cạn | Deplete/regen/save và browser contextual prompt |
| 7 | Bốn họ event, pressure/weather/seed/region, bounded saved history | Kiểm tra schedule/replay/effects và giải thích phạm vi emergent | Ecology/renewal/save determinism |
| 8 | Rain drift presentation-time, splash world-relative | Kiểm tra A/B và ngân sách frame; không đổi engine | Existing rain/frame suite |
| 9 | Plan/deposit/move/rotate/refund/complete có escrow | Preview đất hợp lệ, số paid rõ, tương tác bản dựng không mất vật liệu | Construction conservation/stale/replay/E2E |
| 10 | Lab nghỉ/supplies một lần/research | Bấm marker tới mục facility liên quan thay vì đọc cả danh sách | Natural lab/rest/save E2E |
| 11 | Patrol/chase/return/collision, position persisted | Giữ và kiểm tra lại chuyển động/attack/leash/reopen | Predator motion/save/combat tests |
| 12 | Đề xuất mở rộng có thứ tự | Công bố task API, commit, bằng chứng, migration và ưu tiên tiếp | Hồ sơ cuối + PR + thông báo release |

## Task và đường găng
SC-01 → SC-02 → SC-03/SC-04 → SC-05. Làm tuần tự trong chat này, commit sau mỗi phần có kiểm tra phù hợp. Không giả danh nhân sự hoặc tự giao chat khác.

| Task | Năng lực giao việc | Đầu vào | Đầu ra/API | Acceptance và cách kiểm tra |
|---|---|---|---|---|
| SC-01 | Product/System | Baseline PR #210, 12 phản hồi | Kế hoạch này; audit và phạm vi; sổ commit | Mỗi phản hồi có nghiệp vụ, đường code và test; không gọi feature cũ là newly implemented |
| SC-02 | Building/Transactions | ExpeditionAuthority/State, ItemAuthority | Read-only assessPreview; command dismantle cho custom facility; refund cost | Near/alive/owner/revisions/capacity; không mất vật liệu khi fail; ID replay; collector còn nước phải thu trước; canonical dùng dismantle hiện hành |
| SC-03 | Presentation/Art | SC-02 + projection + content | Atlas SVG pixel/isometric riêng; ghost preview; row material availability; marker focus/navigation | World/UI cùng phép chiếu, R rotate, màu + chữ chỉ hợp lệ; live marker/data không giả container; không allocation mỗi frame cho art |
| SC-04 | Gameplay/UI | ResourceState/deadline và contextual HUD | Renewing countdown; chỉ dẫn storage đúng solo/canonical | Node cạn không hiển thị Available; countdown authority tick; game time/offline giữ nguyên |
| SC-05 | QA/Release | Tất cả task trước | Test mới + regression; ledger; PR; main/public verification | CI chuẩn; 640/1280/1920; gather thật/build/storage/save/rest; hash source/assets; preserve saves |

## Hợp đồng giao dịch và dữ liệu
- execute command gồm id/playerId/expectedRevision/expectedInventoryRevision/action/target, position/orientation khi cần. UI chỉ gửi command, không sửa item ledger.
- assessPreview là read-only: xét definition, terrain, collisions/plan overlap, orientation, range/alive. Preview hợp lệ không phải cam kết thành công; complete phải kiểm tra lại.
- Custom dismantle: gần trong 4 wu, đúng owner, còn sống, đúng revisions; trả đúng chi phí xây vào inventory bằng transaction trước khi xóa facility. Túi không đủ thì giữ cả facility và đồ. Rain collector có nước phải harvest trước. Không mất buffer do tháo nhầm. Cancel rest trước khi tháo; không cấp XP mới. Thử lại cùng operation ID trả kết quả cũ, không trả đồ lần hai.
- Canonical crate/workbench giữ dismantle authority sẵn có: cần kho trống và checks hiện hành. Không thêm đường bypass container/canonical references.
- Không đổi Save V2 schema hay generator version trong vòng này. Action mới không đòi migrate save. Field facility state/receipts vẫn optional extension version 1; save cũ không bị reroll.
- Atlas mới thuộc presentation, hình riêng cho từng công dụng (bed, fire, collector, field lab, beacon, cache, bench). Không tự thay footprint authority chỉ vì hình đẹp hơn.
- Material card dùng have/required từ inventory; plan dùng paid/required từ escrow. Số có trong kho xa không được tính là đồ đang mang. Stations/range giải thích tại thao tác.

## Kiểm thử, triển khai và bàn giao
Domain: refund conservation/capacity/idempotency/owner/range; preview không thay revisions. Browser: có asset riêng, blueprint ghost đổi theo chuột/hướng, inventory cost đúng, depleted hint; keyboard Escape không để sót overlay. Regression sleep, seeds, renewal/events, rain, combat, old-save upgrade. Full npm run ci và unchanged frame gates ≥50 FPS/P95≤34 ms trước merge. Live journey chạy riêng trên Vercel và Pages, không dùng tài khoản hoặc IndexedDB của người chơi.

Handoff mỗi task: input commit, paths, API, rules/invariants, test command/results, output commit, save impact và limitations. Nhân sự sau tách nhánh từ một commit đã bàn giao, ví dụ sp/sc-03-presentation. Không sửa đồng thời authority/composer/runtime khi chưa có người tích hợp rõ. Logic mới cần invariant test; sửa text/asset đơn thuần kiểm tra bằng ảnh/browser phù hợp.

Sau release, cập nhật issue/PR/coordination notice bằng source SHA và links. Giữ Owner/novice/co-op gates riêng với technical completion của solo. Tài liệu baseline SP-01–SP-10 là lịch sử trước release; kế hoạch này tiếp nối, không xóa bằng chứng cũ.

## Đề xuất tiếp theo
Sau vòng này ưu tiên đo chuyến solo 20–30 phút: thời gian travel/gather, số lần bag-full, thời gian dựng outpost, cooldown/renewal và tỷ lệ phải quay lab. Tiếp đó đặt tên outpost, quick-transfer/split-stack, journal mục tiêu bằng hình, tuning độ khó. Power networks độc lập, công nghiệp, NPC/xe và đào địa hình vô hạn cần scope/save/AI/performance riêng; không đóng trên giấy chỉ để gọi game complete.

## Sổ thực hiện
| Task | Trạng thái | Commit / bằng chứng |
|---|---|---|
| SC-01 | COMMITTED | `1a5616f`; audit baseline fbad288 và hợp đồng thực hiện |
| SC-02 | VERIFIED / COMMITTED | `402f977`; assessPreview/previewFootprint read-only; custom dismantle/refund; 8 construction/completion tests PASS, typecheck/lint PASS |
| SC-03 | VERIFIED / COMMITTED | `d8e069a`; atlas 7 hình riêng, preview footprint/rotation, have/required, marker focus; natural journey PASS |
| SC-04 | VERIFIED / COMMITTED | `5349a40`; HUD renewing, storage guidance, 3 E2E PASS (natural journey, seeds, depletion) |
| SC-05 | VERIFIED CI / DELIVERY TRACKED | Head `53cf7fc`: GitHub CI/CodeQL/dependency review PASS; 41 E2E PASS, 2 conditional skips. Trạng thái merge/main/public cuối cùng tại #211/#212 và release evidence |

## Đường code cho nhân sự tiếp nhận

| Hệ thống | Nguồn / điểm mở rộng | Kiểm tra chính |
|---|---|---|
| Carry/item transactions | src/simulation/items/ItemLedger.ts, ItemTransactionAuthority.ts; src/content/singleplayer/ExpeditionContent.ts | tests/unit/single-player-carry.test.ts; inventory/storage integration |
| Plans/facilities/rest | src/simulation/expedition/ExpeditionAuthority.ts, ExpeditionState.ts; src/integration/Phase1AuthorityBundle.ts | tests/unit/single-player-construction.test.ts, single-player-completion.test.ts, single-player-facilities.test.ts |
| UI/art/placement | src/client/presentation/ExpeditionOverlay.ts, ExpeditionAssets.ts; assets/singleplayer/expedition_facilities.svg; Phase1HudOverlay.ts | tests/e2e/single-player-expedition.spec.ts (keyboard/gather thật, không teleport/cấp đồ) |
| Generation/renewal/events | src/world/phase1/Phase1ChunkGenerator.ts, src/world/phase2/ColonyRegions.ts, src/content/singleplayer/ExpeditionEcology.ts; world store integration | tests/determinism; single-player ecology/renewal integration |
| AI/rain/HUD runtime | src/client/runtime/Phase1ProductReviewRuntime.ts; Phase1ProductReviewWorldRenderer.ts và compositor liên quan | predator/combat/save integration; phase2 frame pacing A/B rain |
| Save compatibility | src/persistence và src/integration/Phase1SaveV2Composer.ts; optional ExpeditionState trong Save V2 | single-player save/reopen; save upgrades và future-clock validation |

Đọc thêm [nghiệp vụ, bảng giá và hành vi cụ thể](single-player-expedition-handoff.vi.md) cùng [kế hoạch SP-01–SP-10](single-player-expedition-plan.md). Các tài liệu đó ghi lịch sử trước khi merge #210; vòng hiện tại bổ sung UX/thu hồi công trình và xác nhận lại toàn bộ phạm vi. Chạy rg --files trước khi giao task để đối chiếu đường file chính xác, không sửa tên giả định.

Theo dõi triển khai: [issue #211](https://github.com/5erax/ProZ0/issues/211), [PR #212](https://github.com/5erax/ProZ0/pull/212). Nhánh tách riêng từ main, commit theo từng phần, không đổi engine hoặc dữ liệu thế giới cũ.

## Kết quả QA và giới hạn đo trên máy Owner

CI chính thức [36979981004](https://github.com/5erax/ProZ0/actions/runs/36979981004) tại head 53cf7fc: typecheck/lint/build PASS; 134 unit, 180 integration (3 conditional skips), 13 determinism, 31 browser, 41 E2E PASS (2 public/environment skips). Ba lần lặp test co-op UI PASS riêng. [CodeQL](https://github.com/5erax/ProZ0/actions/runs/36979981021) và dependency review PASS. Tám mẫu Phase 2 có minimum 59.868 FPS, maximum P95 16.8 ms; không đổi gate 50 FPS/34 ms.

Local full CI: các kiểm tra trước E2E đều PASS; 39 E2E PASS, 2 conditional skips, 2 frame-pacing failures. Rerun riêng frame-pacing: hosted tick budget PASS, Phase 1 32.64 FPS và Phase 2 marsh-rain 33.96 FPS, không đạt gate. Đối chứng cùng fixture trên production baseline fbad288 cũng không đạt (34.77 FPS); asset baseline xác nhận index-CgMxvnP7.js. Không khẳng định nguyên nhân chỉ do nhánh mới hay mọi máy đều chạy 60 FPS. Giữ số đo lỗi cùng bằng chứng CI/live release; hiệu năng thiết bị thực tế cần tiếp tục đo, không hạ gate để đổi failure thành PASS. Các failure này không ảnh hưởng kiểm tra giao dịch, save, UI và 12 hành vi chức năng đã đối chiếu.

Bản release cuối phải ghi source SHA, asset hash, public journey và CI/main links ở tracker/release. Đây là hồ sơ stage của branch; trạng thái triển khai cuối lấy từ thông báo release thay vì suy diễn từ một bảng task.
