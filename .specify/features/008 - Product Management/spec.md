# 008 - Product Management (Quản lý hàng hóa, dịch vụ)

## 1. Yêu cầu chung
Tại màn hình danh sách hàng hoá, dịch vụ:
- Cung cấp chức năng **Thêm** trên thanh công cụ.
- Khi người dùng click **Thêm**, hệ thống cho phép chọn tính chất của hàng hóa/dịch vụ cần khai báo:
  - Hàng hóa
  - Thành phẩm
  - Dịch vụ

---

## 2. Khai báo Hàng hóa thông thường
Khi chọn tính chất là **Hàng hóa**, hiển thị form khai báo với các thông tin sau:

### 2.1. Thông tin chung
- **Tên hàng hoá**: (Bắt buộc) Nhập tên của hàng hóa.
- **Mã hàng hoá**: (Bắt buộc) Nhập mã của hàng hóa.
- **Nhóm VTHH (Vật tư hàng hóa)**: Khoá mặc định theo tính chất tương ứng khi chọn khai báo hàng hóa.
- **Đơn vị tính**: (Bắt buộc) Đơn vị tính chính của hàng hóa (ví dụ: Can, Chai, Hộp...).
- **Thời hạn bảo hành**: Nhập thời gian bảo hành (nếu có).
- **Mô tả**: Nhập thông tin diễn giải thêm.

### 2.2. Tab Đơn vị chuyển đổi
Cho phép khai báo các đơn vị chuyển đổi được áp dụng đối với VTHH so với đơn vị chính. Gồm các trường:
- **Đơn vị chuyển đổi**: Nhập tên đơn vị quy đổi (ví dụ: Gói, Thùng, Lốc…).
- **Phép tính**: Được sử dụng để quy đổi số lượng giữa đơn vị chuyển đổi và đơn vị chính.
  - Chọn **Phép chia**: Áp dụng nếu *Đơn vị chuyển đổi nhỏ hơn đơn vị chính*.
    - *Ví dụ*: Đơn vị tính chính: Can, Đơn vị chuyển đổi: kg, 1 can = 25kg -> Chọn Phép chia, tỷ lệ 25 (hoặc nếu dùng phép nhân thì tỷ lệ là 1/25).
  - Chọn **Phép nhân**: Áp dụng nếu *Đơn vị chuyển đổi lớn hơn đơn vị chính*.
    - *Ví dụ*: Đơn vị tính chính: Chai, Đơn vị chuyển đổi: Thùng, 1 thùng = 24 chai -> Chọn Phép nhân, tỷ lệ 24 (hoặc nếu dùng phép chia thì tỷ lệ là 1/24).
- **Tỷ lệ chuyển đổi**: Nhập tỷ lệ quy đổi so với đơn vị chính theo phép tính đã chọn.
- **Mô tả**: Nhập diễn giải để dễ theo dõi.

---

## 3. Khai báo Thành phẩm (Lắp ráp/ Tháo dỡ)
Khi chọn tính chất là **Thành phẩm**, hiển thị form khai báo phục vụ cho việc lắp ráp/tháo dỡ hoặc sản xuất.

### 3.1. Thông tin chung
Khai báo các thông tin chung của thành phẩm tương tự hàng hóa thông thường (Tên, Mã...).

### 3.2. Tab Định mức nguyên vật liệu
Thực hiện khai thông tin về định mức nguyên vật liệu để lắp ráp, tháo dỡ hoặc sản xuất.
- **Mã nguyên vật liệu**: Chọn mã của vật tư, nguyên liệu cấu thành nên thành phẩm.
- **Tên linh kiện**: Hệ thống tự động hiển thị danh sách các linh kiện cố định (fix cứng cột bên trái cho người dùng chọn các linh kiện phù hợp bên phải), bao gồm:
  - Main
  - CPU
  - RAM
  - VGA
  - Nguồn
  - Vỏ
  - Ổ cứng (SSD hoặc HDD)
  - *Lưu ý: Có thể thêm dòng để điền các linh kiện khác nếu muốn.*
- **Đơn vị tính**: Là đơn vị sử dụng cho nguyên vật liệu (ví dụ: chiếc, kg, mét…).
- **Số lượng**: Nhập số lượng cần dùng để tạo ra 1 đơn vị thành phẩm.

---

## 4. Khai báo Dịch vụ
Khi chọn tính chất là **Dịch vụ**, hiển thị form khai báo với các thông tin sau:
- **Tên dịch vụ**: (Bắt buộc) Nhập tên của dịch vụ.
- **Mã dịch vụ**: (Bắt buộc) Nhập mã của dịch vụ.
- **Nhóm VTHH**: Sẽ khoá sẵn theo tính chất hàng hoá là "Dịch vụ".
- **Đơn vị tính**: (Bắt buộc) Đơn vị tính của dịch vụ.
- **Mô tả**: Nhập thông tin diễn giải về dịch vụ.
