# Thông tin Bản phát hành Release v1.0.1 (DLC-WMS)

**Ngày phát hành:** 10/08/2026  
**Phiên bản:** `v1.0.1`  
**Nhánh Git:** `release/v1.0.1`  
**Dự án:** Duy Long Computer - Warehouse & Inventory Management System (DLC-WMS)

---

## 🚀 Các tính năng & Cải tiến mới

### 1. In PDF & Xuất báo cáo Excel (`feat/print-pdf`)
- Hoàn thiện tính năng in phiếu nhập kho, phiếu xuất kho, phiếu bảo hành và phiếu sửa chữa dưới dạng file PDF chuẩn form.
- Hỗ trợ xuất dữ liệu ra file Excel phục vụ kiểm kê, báo cáo và lưu trữ.
- Tối ưu giao diện xem trước và cấu hình máy in cho người dùng.

### 2. Tối ưu Giao diện UI & Responsive (`fix/responsive-ui`)
- Nâng cấp giao diện Dashboard với các chỉ số trực quan và bố cục hiện đại hơn.
- Cải thiện tính năng và phân quyền màn hình Super Admin.
- Tối ưu hóa hiển thị responsive trên các thiết bị màn hình nhỏ, máy tính bảng và màn hình lớn.
- Chuẩn hóa các thành phần bảng (table), form nhập liệu và các badge trạng thái theo thiết kế hệ thống.

### 3. Quản lý Sửa chữa & Bảo hành (`feature/backend/repair-management`)
- Cập nhật luồng xử lý phiếu sửa chữa cả ở Frontend và Backend (Lifecycle linh kiện/Serial).
- Tinh chỉnh danh sách phiếu bảo hành, hỗ trợ quản lý quy trình bảo hành chính xác hơn.
- Cập nhật lịch sử sửa chữa thiết bị chi tiết.

### 4. Cập nhật Tài liệu & Cấu trúc hệ thống (`docs`)
- Cập nhật và tinh chỉnh tài liệu phân tích thiết kế SRS và SDS.
- Gom nhóm và tổ chức lại thư mục `docs/` để dễ truy cập và bảo trì.

---

## 🛠 Thay đổi kỹ thuật (Technical Changes)
- **Frontend (`frontend/package.json`)**: Cập nhật `version` lên `1.0.1`.
- **Backend (`backend/pom.xml`)**: Cập nhật `version` lên `1.0.1`.
- **Root (`package.json`)**: Cập nhật `version` lên `1.0.1`.
- Đảm bảo 100% kiểm tra Lint và Build thành công không có lỗi.

---

## 📋 Hướng dẫn Cài đặt & Kiểm thử
1. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. **Backend**:
   ```bash
   cd backend
   ./mvnw clean package -DskipTests
   ```
