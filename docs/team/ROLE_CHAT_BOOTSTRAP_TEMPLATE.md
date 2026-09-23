# Nạp contract và kỹ năng qua chat

**Role pack:** 2.0.0. Bộ này là hướng dẫn vận hành/chuyên môn có kiểm chứng, không phải huấn luyện lại model hoặc lời bảo đảm mọi thành viên đã thành chuyên gia.

## Lần đầu hoặc chat chưa có danh tính

Mở prompt riêng trong [MEMBER_REGISTRY](MEMBER_REGISTRY.md), copy phần text vào đúng chat. Chỉ thay PACK_REF nếu PO chủ động áp dụng một candidate commit. Mỗi chat một MEMBER_ID; PM-A và PM-B dùng prompt khác nhau.

## Chat đã được bind đúng thành viên

Copy nguyên đoạn sau:

```text
PROZ0 SYNC — giữ nguyên MEMBER_ID/ROLE_ID/HOME_COMPANY đã xác nhận trong chat này. Từ https://github.com/5erax/ProZ0, resolve latest approved main thành commit cố định; đọc .github/PROZ0_AGENT_BOOTSTRAP.md và docs/team/ROLE_PACK_MANIFEST.json. Theo ROLE_RUNTIME_PROTOCOL, nạp các contract chung, context sản phẩm, contract role, skill và specialist playbook mới của đúng thành viên; hiểu lại quyền quyết định và vai trò của đồng đội. Trả load receipt có version/commit thật, thay đổi chính và task/next action. Tiếp tục task đã được giao hợp lệ; dùng COMMUNICATION_PROTOCOL khi báo tiến độ và trả lời hoàn tất. Nếu thiếu danh tính hoặc không đọc được tài liệu, nói rõ phần thiếu, không giả vờ đã apply.
```

Đoạn này là câu lệnh bằng ngôn ngữ tự nhiên được bộ hướng dẫn định nghĩa, không phải tính năng slash command có sẵn. Chat cần công cụ truy cập GitHub hoặc checkout chứa đúng phiên bản. Nếu chưa đọc được, cung cấp file/bundle hoặc quyền truy cập phù hợp trước khi yêu cầu apply.

## Sau này cập nhật bộ kỹ năng

Sửa đúng contract/playbook và shared protocol liên quan; tăng version cho thay đổi phát hành; cập nhật manifest bằng validator; review/adopt; gửi lại đoạn PROZ0 SYNC vào các chat cần áp dụng. Không cần copy lại toàn bộ job description. Việc gửi một chat không tự cập nhật các chat khác; cần từng chat hoặc một cơ chế dispatch thật sự đã cấu hình.

## Kiểm tra họ đã nạp đúng

Receipt phải có MEMBER_ID, role/company khớp registry, version và commit truy xuất thực tế, trách nhiệm, cộng sự/authority và task/lock. Hỏi một tình huống trong ROLE_PACK_EVALUATION để kiểm tra cách dùng; nhắc lại khẩu hiệu “expert” không phải bằng chứng.

Với Codex chạy trong repo, skill nằm trong `.agents/skills/`. Với chat đọc GitHub, đọc trực tiếp SKILL.md và playbook là đường dùng thay thế, không cần giả định skill đã được cài toàn máy. Tham chiếu về cấu trúc/discovery: [tài liệu OpenAI](https://learn.chatgpt.com/docs/build-skills).
