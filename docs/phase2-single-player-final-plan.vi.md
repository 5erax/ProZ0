# Đợt hoàn thiện single-player sau release 03/10/2026

Owner yêu cầu thêm #244 và giải quyết issue; sau đó xác định “chỉ cần làm task single play trước”. Baseline main `78f50a8`; nhánh `feat/phase2-final-completion`. Không gửi việc sang chat khác, không nhận danh tính/khóa nhân sự cũ. Skill Redis chưa tracked là công việc khác và được giữ nguyên.

## Phạm vi và cách ghi nhận

Đã phát hành 11 issue trong PR243. Còn 20 issue mở, cộng #244 là 21. #204 phần Internet/co-op không thuộc đợt solo này; #199/#187 không thể đóng bằng test tự động hoặc tự nhận nghiệm thu Owner. #67 là điều phối toàn dự án. Các mục này vẫn có hồ sơ bàn giao, không được tính đóng Phase2 bằng việc đóng các feature solo.

Mỗi mốc phải có code/content/save/UI tương ứng, kiểm tra tiêu chí và lỗi có ý nghĩa, ảnh thật khi thay art, commit có scope, handoff kèm source/evidence/limit. Chỉ đóng sau CI đạt, tích hợp và deployment đúng SHA. Không tính các helper chưa nối runtime là feature hoàn tất. Không thêm âm thanh ngoài rain loop Owner cung cấp.

## Thứ tự xử lý, seam và giao việc

| Mốc | Issue | Công việc chính và tiêu chí cuối |
|---|---|---|
| S1 Input/UX | #244 | Một stat card chủ động bằng right-click/Shift-F10. Hover không stat dài; left/E gather hoặc targeted action. Cancel placement ưu tiên trước inspect; stat không mutate ledger. Compact/narrow/fog/disappear/teardown có QA. |
| S2 Resource lifecycle | #215/#222/#223/#238 | Canonical resource organic có early/growing/mature, yield/ETA/cut-root consistent với living plants. Khoáng hữu hạn có state/cap rõ. Uproot/replant gốc cây qua ledger/tombstone, đất bất kỳ hợp lệ. 3 kích cỡ giữ seed/legacy. Partial/capacity/stale/save không mint/mất tài nguyên. Grass fiber và regrowth dùng cùng pressure/soil/season. |
| S3 Soil/landscape/weather | #224/#230/#236/#237/#242 | Soil moisture local bounded delta đồng bộ tưới/mưa/drain/mùa, palette 3 trạng thái. Variants/clump/seams không chessboard/flicker. Cỏ nhiều silhouette cùng pivot; wind warning/rise/peak/fall và camera-depth stable, rain động giữ approvedaudio. Review world/resize/fog thay vì chỉ gallery. |
| S4 Equipment | #220/#239 | Slot rõ và gear có purpose/cost/modifiers, migrate weapon/wrap. Avatar/world layers dùng cùng definitions; drag/button/capacity/ref validation. Sáu rarity tên/viền token thống nhất; attack/hunt đọc đúng gear profile, không 2D overlay lặp. Source/craft/station/acquisition cân bằng, save/reopen và tool ownership. Không tự gọi slot trang trí là gameplay. |
| S5 Building | #240 | Một entry xây blueprint/catalog 20 loại, place trước material, precise footprint/orientation. Legacy kit compatibility giữ conservation. Move/rotate/replace/cancel ID và escrow atomic, paid state persist. Container relocation giữ contents; full bag refund không mất input; cấp vật liệu/collision/replay có QA. |
| S6 Mountains/caves | #232 | D4 contract đã có nhưng unwired. Nối active worldspace/location, portal registry/dry route, scoped movement/resource/station/death/map/fog. Persist interior delta/position/return without reroll surface; finite real mining and safe exit. Hai elevation profile/ba cave layouts, frame/population bound, natural enter-explore-save-reopen-exit. Không teleport tới remote surface gọi là cave. |
| S7 EN/VI | #225 | Catalog/UI/reason/timer/accessibility dictionaries và formatter, preference persist, switch không đổi IDs/save/RNG. Không dịch bằng fuzzy replacement. Audit từ lobby→inventory→craft→build→living→map→POI→settings→death/cave. Vietnamese font/narrow/fallback/key parity. |
| S8 Contract/release | #166/#167/#242 + solo budget #204 | Gameplay/architecture phản ánh chính xác source cuối và limits. Matrix state-owner/intent/save/time/RNG/version; accepted vs human-pending phân biệt. Final populated/cave/weather/equipment FPS; exact-head type/lint/domain/browser/co-op regression/fullE2E, main/production hash + natural journeys. Clear completed issues và publish delivery notice, không đóng human/co-op gate thay Owner. |

S1 làm trước để thực thể nhiều state không lấn màn hình. S2 tạo dữ liệu cho S3; S4/S5 giữ authority và save compatibility. S6 cần worldspace contract/save/query xuyên hệ thống; S7 phải phủ những UI được thêm ở các mốc trước. S8 chốt sau mã cuối. Nếu phát hiện thiếu thực tế, mở rõ gap/recovery trong handoff chứ không giảm tiêu chí hoặc chỉ đổi status.

## Phân biệt lớp kiểm chứng

- Unit/integration kiểm tra giao dịch, namespace, boundary, replay/capacity/tombstone/old-save/future-version. Fixtures chỉ là kiểm tra kiểm soát, không phải tester thật.
- Browser kiểm tra UI/lifecycle/focus/gesture/state authority. E2E dùng keyboard/mouse thật; hành trình natural không grant/teleport/ghi clock. Dev server được xem với agent-browser và ảnh thực tế.
- Performance giữ ≥50FPS/P95≤34ms; ghi môi trường/viewport/load/scene và lần fail/sửa. Co-op regression kiểm tra shared input UI không hồi quy, không hứa replicate tính năng solo mới.
- Release chỉ sau exact head PASS và merge; xác nhận main CI, Vercel/Pages SHA và bundle, save/reopen trên bản public. Issue cần receipt source/test/artifact/deployment/handoff, không đóng theo số lượng commit.

## Checkpoint hiện tại

S1 có checkpoint code: right-click/Shift-F10 mở stat card bounded 4Hz, left-click/E harvest living forage trực tiếp, plot/animal chỉ mở targeted actions. Hover không tooltip stat dài. Desktop và 640×360 đã xem ảnh; typecheck/lint/build, 3 browser input tests, resource/root/camera/placement/fishing E2E và hành trình canh tác natural/save-reopen đạt. Natural farming phát hiện tên crop bị mất trong targeted panel và đã sửa; một lần chạy song song browser khác mất held key do blur, chạy cô lập đạt, không đổi movement authority. #244 vẫn mở tới khi hoàn tất routing canonical building/POI, CI và deploy. Các mốc S2–S8 là công việc cần thực hiện, không phải completed claims. Các yêu cầu human và Internet giữ ngoài phạm vi ưu tiên solo hiện tại.
