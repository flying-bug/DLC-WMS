-- Mỗi tài khoản chỉ có một phiên đăng nhập: JWT mang claim "sid" phải khớp cột này.
-- Đăng nhập mới ghi đè giá trị (phiên cũ mất hiệu lực); NULL = mọi phiên đã bị thu hồi (đổi mật khẩu).
ALTER TABLE `USERS`
    ADD COLUMN `current_session_id` VARCHAR(64) NULL;
