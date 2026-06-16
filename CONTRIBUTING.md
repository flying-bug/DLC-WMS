# Contributing Guide

## Quy trình làm việc
- Tạo issue hoặc task rõ ràng.
- Chia nhánh theo tính năng.
- Mỗi pull request cần mô tả nghiệp vụ.

## Quy ước code
- Đặt tên rõ ràng, nhất quán.
- Code chuẩn SOLID, Clean Code.
- Tách service, controller, repository, UI component.
- Ưu tiên code dễ đọc hơn code ngắn.
- Frontend tham khảo giao diện của MISA
- Code phải có validate chuẩn, có bảo mật, để đúng các pakage.
- Code swagger API
- **Quản lý System Message / Error Code**: Không viết text cứng (hardcode) thông báo trong code. Phải tập trung các thông báo lỗi/hệ thống vào một `Enum` duy nhất (VD: `SystemMessage.java` ở Backend) gồm mã lỗi và câu thông báo (Ví dụ: `MSG01` - `No search results`).