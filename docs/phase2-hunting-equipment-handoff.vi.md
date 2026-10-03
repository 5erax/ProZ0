# S4 checkpoint — vũ khí dùng đúng khi săn wildlife

## Hành vi

Hunt đọc stack vũ khí thực sự đang trang bị từ CombatAuthority: damage, reach, stamina, cooldown và wear của catalog. Giáo thường gây 4 damage trên thang HP wildlife; Mythic gây 8, tốn 20 stamina và 1 condition mỗi hit thành công. Các tier còn lại dùng cùng phép chuyển damage/6 làm tròn. Target là animal ID authoritative; client không gửi profile hoặc damage.

Ledger kiểm tra inventory revision, ownership và condition trước khi trả transaction. Wear và stamina chỉ commit cùng hit hợp lệ; receipt replay không trả thêm tài nguyên hay tốn lại stamina. Cooldown theo người chơi dùng chung với combat trực tiếp, chặn đổi animal để bỏ qua thời gian chờ. `livingWorld.huntCooldowns` version 1 lưu cooldown và khôi phục CombatAuthority sau reopen. Animal `attackTick` chỉ thuộc predator AI, không chặn đòn người chơi nữa.

Save cũ thiếu extension vẫn mở được. Save có version lạ, tick sai/ngoài giới hạn, player không tồn tại hoặc số bản ghi quá cap bị từ chối. Không sửa fingerprint catalog hoặc generation seed trong checkpoint này. Không thêm âm thanh.

## Kiểm chứng

- Typecheck/lint/build PASS; 221 unit, 216 integration (+3 skip sẵn có), 13 determinism PASS.
- Integration mới kiểm tra damage/stamina/wear exact, replay, cooldown đổi target, broken/exhausted/range rejection không đổi state, save/reopen và corrupt extension.
- E2E sau rebuild PASS 38.3 giây: click wildlife thật→Hunt→right-click kiểm tra HP→save→tự đi theo animal đang di chuyển→kill→loot→save/reopen không hồi sinh loot. Fixture cấp Mythic và vị trí ban đầu để kiểm tra kiểm soát, không được tính là playtest người mới.

## Giới hạn và phần tiếp tục

Đây chỉ là phần hunting của #239. #220 vẫn cần các slot wearable có tác dụng, craft, avatar/world layers và migration. Chưa đóng issue hoặc phát hành checkpoint này. Cooldown combat trực tiếp trước khi có một Hunt vẫn theo cơ chế save cũ; không tuyên bố đã persist mọi cooldown trong game. E2E/browser/performance toàn bản phải chạy lại sau các mốc còn lại.
