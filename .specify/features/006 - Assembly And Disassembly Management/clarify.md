# Clarification Notes (Critical Reviews)

## Các Quyết Định Thiết Kế Chuyên Sâu (Deep Dive Review)

Dựa trên đặc thù nghiệp vụ quản lý kho linh kiện điện tử (quản lý khắt khe theo Serial), chuẩn mực kế toán (MISA), và các bài toán thực tế, dự án đã thống nhất các quyết định (Decisions) sau cho module Lắp ráp/Tháo dỡ:

### 1. Bài toán Quản lý Số Serial / IMEI (Genealogy Tracking)
- **Vấn đề:** Các thiết bị điện tử, máy tính cần theo dõi Serial chặt chẽ để phục vụ quy trình Bảo hành (Warranty). Khi có sự biến đổi hình thái (lắp ráp/tháo dỡ), hệ thống dễ bị mất dấu vết gốc của linh kiện.
- **Quyết định:** Áp dụng cơ chế **"Genealogy Tracking" (Truy vết phả hệ)** thông qua hệ thống Phiếu Nhập/Xuất kho.
- **Giải pháp:**
    - **Lắp ráp:** Khi tạo Phiếu Xuất kho linh kiện, thủ kho bắt buộc phải scan/chọn chính xác các mã Serial của linh kiện mang đi lắp. Khi tạo Phiếu Nhập thành phẩm, thủ kho cấp 1 mã Serial mới cho thành phẩm. Hệ thống tự động map Serial thành phẩm này với danh sách Serial linh kiện đã xuất.
    - **Tháo dỡ:** Ngược lại, khi xuất tháo dỡ một máy tính Serial cũ, hệ thống yêu cầu thủ kho sinh mã Serial mới (hoặc tái sử dụng) cho các linh kiện thu hồi khi nhập kho.

### 2. Bài toán Giá vốn (Costing & Accounting)
- **Vấn đề:** Nếu chỉ quản lý số lượng thuần túy, giá vốn của thành phẩm sau khi lắp ráp sẽ bằng 0, dẫn đến sai lệch toàn bộ báo cáo tài chính Lãi/Lỗ.
- **Quyết định:** Tuân thủ chuẩn ERP, hệ thống tự động **kế thừa và tính toán giá vốn** ngay tại thời điểm Lắp ráp/Tháo dỡ.
- **Giải pháp:**
    - **Khi Lắp ráp:** Đơn giá vốn của thành phẩm (nhập kho) = Tổng [Số lượng xuất * Đơn giá vốn xuất] của tất cả các linh kiện tương ứng.

### 3. Bài toán Tỷ lệ Phân bổ Giá vốn khi Tháo dỡ (Cost Allocation)
- **Vấn đề:** Khi Tháo dỡ 1 thành phẩm thành nhiều loại linh kiện khác nhau (VD: PC tháo thành CPU, RAM, Nguồn), không thể chia đều giá trị PC cho các linh kiện vì giá trị thực tế của chúng khác biệt rất lớn.
- **Quyết định:** Bắt buộc khai báo **Tỷ lệ phân bổ giá vốn (`cost_allocation_pct`)** ngay từ lúc lập BOM.
- **Giải pháp:** Bổ sung trường `cost_allocation_pct` vào cấu trúc chi tiết của Định mức (BOM Lines) với điều kiện tổng tỷ lệ của tất cả linh kiện phải = 100%. Khi tháo dỡ, Đơn giá vốn linh kiện thu hồi = Tổng giá vốn thành phẩm tháo dỡ * `cost_allocation_pct`.

### 4. Bài toán Tính Hợp lệ của Hàng Hóa Tháo dỡ (Validation)
- **Vấn đề:** Quá trình tạo Lệnh tháo dỡ nếu không kiểm tra tồn kho, người dùng có thể tháo dỡ 1 sản phẩm không có thực trong kho hoặc sai Serial.
- **Quyết định:** Áp dụng ràng buộc tồn kho nghiêm ngặt tại thời điểm sinh Phiếu xuất kho tháo dỡ.
- **Giải pháp:** Khi sinh Phiếu Xuất kho cho Lệnh Tháo dỡ, bắt buộc phải chọn đúng Serial Thành phẩm đang có mặt trong kho vật lý đó. Tồn kho (Quantity) của thành phẩm và Serial tương ứng phải > 0 mới được phép xuất để tháo dỡ.

### 5. Bài toán Toàn vẹn Phiên bản BOM (Version Integrity)
- **Vấn đề:** Đổi công thức BOM khi đang có Lệnh sử dụng BOM đó sẽ làm sai lệch dữ liệu lập kế hoạch ban đầu.
- **Quyết định:** Áp dụng cơ chế **Khóa (Lock)** BOM.
- **Giải pháp:** Hệ thống sẽ chặn hành động Edit (Sửa đổi) một BOM nếu BOM này đang được gán cho bất kỳ Lệnh Lắp ráp/Tháo dỡ nào đang ở trạng thái `DRAFT` hoặc `APPROVED`. Người dùng buộc phải tạo phiên bản BOM mới (Tăng Version No) nếu muốn thay đổi công thức.

### 6. Bài toán Hao hụt và Phế phẩm (Waste & Scrap)
- **Vấn đề:** Quá trình tháo dỡ có thể phát sinh linh kiện gãy, hỏng, không đủ tiêu chuẩn để nhập lại vào "Kho Tốt".
- **Quyết định:** Cho phép ghi nhận thực tế tình trạng hàng hóa và xử lý ngoại lệ ngay trên Phiếu Nhập kho.
- **Giải pháp:**
    - Khi sinh Phiếu Nhập kho linh kiện thu hồi, hệ thống cho phép thủ kho sửa số lượng thực tế (`Quantity Actual`). 
    - Linh kiện hỏng được phép tách dòng và nhập vào vị trí "Kho Phế Liệu" để làm cơ sở xuất hủy. Lệnh vẫn sẽ được chốt hoàn tất (`POSTED`).

### 7. Bài toán Thực thi từng phần (Partial Completion)
- **Vấn đề:** Lệnh yêu cầu số lượng lớn, không thể làm xong hết mới nhập kho 1 lần.
- **Quyết định:** Hỗ trợ **Partial Fulfillment**.
- **Giải pháp:**
    - Một Lệnh có quyền sinh ra **Nhiều Phiếu Xuất/Nhập kho**.
    - Hệ thống cộng dồn số lượng thực tế từ các phiếu kho đã Ghi sổ. Lệnh chỉ chuyển sang `POSTED` khi thủ kho chủ động bấm "Hoàn thành Lệnh".

### 8. Xử lý "Dữ liệu rác" và Ràng buộc Hủy (Rollback Constraint)
- **Vấn đề:** Hủy Lệnh khi đã xuất kho nhưng chưa nhập kho sẽ làm thất thoát tài sản.
- **Quyết định:** Áp dụng **Hard Block (Chặn cứng)** đối với thao tác Hủy lệnh.
- **Giải pháp:** Hệ thống chặn nút "Hủy Lệnh" nếu Lệnh đó đã sinh ra bất kỳ Phiếu Nhập/Xuất nào. Muốn hủy lệnh, bắt buộc phải Un-post hoặc xóa các phiếu kho liên quan trước.

---

## 9. Assumptions (Các giả định & Giới hạn của Phase này)
- **Chi phí nhân công và gia công (Overhead/Labor Costs):** Trong giai đoạn này, hệ thống sẽ KHÔNG hỗ trợ phân bổ các chi phí ngoài lề (tiền lương, điện nước, bao bì phụ) vào giá vốn của thành phẩm. Giá vốn chỉ thuần túy dựa trên giá trị của **Nguyên vật liệu trực tiếp (Direct Materials)**.
