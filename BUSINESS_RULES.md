# 5. Requirement Appendix
## 5.1 Business Rules

Dưới đây là danh sách các Quy tắc Nghiệp vụ (Business Rules) được chọn lọc và chuẩn hóa sát nhất với các Use Case thực tế của dự án DLC-WMS (Bao gồm Quản lý Danh mục, Nhập/Xuất kho, Chuyển/Kiểm kê, Lắp ráp BOM, và Bảo hành).

| ID | Rule Definition |
| :--- | :--- |
| **I. Quản lý Hệ thống & Phân quyền (System & Access)** | |
| BR-01 | Tài khoản bị khóa (Inactive) hoặc chưa được phê duyệt không được phép đăng nhập vào hệ thống. |
| BR-02 | Mã OTP (One-Time Password) cấp lại mật khẩu qua email chỉ có hiệu lực tối đa trong vòng 5 phút. |
| BR-03 | Nếu người dùng nhập sai thông tin đăng nhập 5 lần liên tiếp, hệ thống sẽ tự động khóa tài khoản trong 30 phút. |
| BR-04 | Chỉ có người dùng mang vai trò `SUPER_ADMIN` mới có quyền tạo mới, khóa, hoặc thiết lập quyền truy cập cho tài khoản khác. |
| BR-05 | Các quyền truy cập động theo module (Phân quyền chi tiết Xem/Thêm/Sửa/Xóa) chỉ được áp dụng cho tài khoản thuộc nhóm `STAFF`. |
| BR-06 | Mọi thao tác thay đổi dữ liệu (CUD - Thêm/Sửa/Xóa) và Đăng nhập/Đăng xuất đều bắt buộc phải được tự động ghi nhận vào Nhật ký hệ thống (Audit Log). |
| BR-07 | Audit Log hoạt động theo nguyên tắc ghi nối thêm (Append-only). Bất kỳ ai, kể cả `SUPER_ADMIN`, cũng không có quyền sửa đổi hay xóa lịch sử log. |
| BR-08 | Mật khẩu tài khoản phải được mã hóa một chiều (Băm - Hashing) trước khi lưu vào cơ sở dữ liệu. Không ai được biết mật khẩu dạng nguyên bản. |
| **II. Quản lý Danh mục (Master Data: Product, Category, Supplier, Customer)** | |
| BR-09 | Mã sản phẩm (Product Code), Mã danh mục, Mã đối tác phải là định danh duy nhất (Unique) trên toàn hệ thống. |
| BR-10 | Một sản phẩm khi tạo mới bắt buộc phải được gắn vào chính xác 1 Danh mục (Category) đang hoạt động và 1 Đơn vị tính (Unit) đang hoạt động. |
| BR-11 | Không được phép Xóa (Delete) vĩnh viễn một Sản phẩm/Khách hàng/Nhà cung cấp nếu đã phát sinh lịch sử giao dịch. Chỉ được phép Đổi trạng thái sang Ngừng hoạt động (Inactive). |
| BR-12 | Giá bán và Giá nhập định mức của sản phẩm không bao giờ được mang giá trị âm. |
| BR-13 | Khi khởi tạo, sản phẩm có thể cấu hình quản lý theo Serial hoặc chỉ theo Số lượng. Cấu hình này không thể thay đổi sau khi đã có giao dịch nhập kho đầu tiên. |
| BR-14 | Các linh kiện điện tử cốt lõi (CPU, GPU, Mainboard, Laptop) bắt buộc phải kích hoạt cờ quản lý theo Serial (Serial Tracking). |
| **III. Quản lý Kho bãi & Tồn kho (Warehouse & Inventory Management)** | |
| BR-15 | Mã Kho hàng (Warehouse Code) là duy nhất. Không được tạo 2 kho có chung mã. |
| BR-16 | Không được xóa một Kho hàng nếu tổng số lượng tồn kho thực tế (Quantity On Hand) của bất kỳ mặt hàng nào trong kho đó vẫn lớn hơn 0. |
| BR-17 | Không được xóa Kho hàng nếu đang có các phiếu Nhập/Xuất/Chuyển kho chưa hoàn thành (Pending) gắn với kho đó. |
| BR-18 | Cảnh báo tồn kho (Low Stock Alert) tự động kích hoạt khi số lượng tồn kho của một sản phẩm chạm hoặc dưới mức Tồn kho tối thiểu (Min Stock). |
| **IV. Quản lý Nhập kho (Import Management)** | |
| BR-19 | Mỗi Phiếu nhập kho (Import Slip) bắt buộc phải có ít nhất một dòng thông tin sản phẩm (Line Item) với số lượng và đơn giá > 0. |
| BR-20 | Đối với sản phẩm quản lý theo Serial, Phiếu nhập kho không thể chốt nếu số Serial quét vào không bằng chính xác số lượng hàng khai báo nhập. |
| BR-21 | Hệ thống tự động từ chối nhập một số Serial nếu serial đó đã và đang tồn tại ở trạng thái "In Stock" (Đang trong kho) trên hệ thống. |
| BR-22 | Phiếu nhập kho ở trạng thái "Lưu nháp" (Draft) có thể chỉnh sửa mọi thông tin. Khi chuyển sang trạng thái "Hoàn thành" (Completed), nó trở thành bất khả xâm phạm. |
| BR-23 | Ngay khi Phiếu nhập hoàn thành, hệ thống lập tức cộng dồn số lượng vào Tồn kho (On-hand) và tính toán lại Giá vốn trung bình nếu áp dụng MAC, hoặc ghi nhận lớp giá FIFO. |
| **V. Quản lý Xuất kho (Export Management)** | |
| BR-24 | Hệ thống chặn thao tác tạo Phiếu xuất kho nếu Số lượng yêu cầu vượt quá Số lượng Tồn kho thực tế khả dụng tại Kho xuất. |
| BR-25 | Tồn kho không bao giờ được phép mang giá trị âm (Tuyệt đối không có Negative Inventory). |
| BR-26 | Khi xuất sản phẩm quản lý theo Serial, bắt buộc phải quét và xác định chính xác số Serial vật lý được lấy đi. |
| BR-27 | WMS phải đối chiếu Serial xuất kho: Serial được xuất phải có trạng thái đang nằm trong đúng kho mà phiếu yêu cầu xuất. Báo lỗi nếu sai kho. |
| BR-28 | Khi Phiếu xuất kho chuyển trạng thái "Hoàn thành", số lượng tồn kho bị trừ đi và các Serial tương ứng chuyển sang trạng thái "Đã xuất/Đã bán" (Sold). |
| BR-29 | Thời hạn bảo hành của các sản phẩm có số Serial bắt đầu được tính đồng hồ (Warranty Start Date) từ ngày Phiếu xuất kho được ghi nhận Hoàn thành. |
| **VI. Chuyển Kho & Kiểm Kê (Stock Transfer & Stocktake)** | |
| BR-30 | Phiếu chuyển kho nội bộ (Transfer Slip) bắt buộc phải có Kho Nguồn và Kho Đích khác nhau hoàn toàn. |
| BR-31 | Trong thời gian một kho vật lý đang được gắn với một Phiếu Kiểm kê (Stocktake) đang mở, không được phép phát sinh hoặc hoàn thành bất kỳ phiếu nhập/xuất nào đối với kho đó. |
| BR-32 | Phiếu kiểm kê kho bắt buộc phải ghi nhận Số lượng trên phần mềm (System Quantity) và Số lượng thực tế đếm được (Actual Quantity) tại thời điểm kiểm. |
| BR-33 | Khi chốt Phiếu kiểm kê, nếu có chênh lệch, hệ thống tự động sinh ra Phiếu Nhập Điều Chỉnh (nếu thực tế > hệ thống) hoặc Phiếu Xuất Điều Chỉnh (nếu thực tế < hệ thống). |
| **VII. Quản lý Lắp ráp & Tháo dỡ (BOM - Assembly/Disassembly)** | |
| BR-34 | Lệnh lắp ráp (Assembly Order) chỉ được phê duyệt nếu Kho chứa đủ số lượng tất cả các linh kiện thành phần cấu tạo theo như Định mức vật tư (BOM) quy định. |
| BR-35 | Khi Lệnh lắp ráp hoàn tất, hệ thống tự động sinh phiếu Xuất các linh kiện thành phần và sinh phiếu Nhập cho sản phẩm Thành phẩm (Finished Good). |
| BR-36 | Khi lắp ráp máy tính (PC) có các linh kiện quản lý theo Serial, hệ thống tạo mối quan hệ Cha-Con (Parent-Child) để khóa Serial linh kiện vào Serial của vỏ Case thành phẩm. |
| BR-37 | Lệnh tháo dỡ (Disassembly Order) sẽ làm ngược lại: Tự động trừ tồn kho máy thành phẩm, và cộng dồn lại tồn kho của các linh kiện rời lẻ rã ra. |
| **VIII. Quản lý Bảo hành & Sửa chữa (Warranty & Repair)** | |
| BR-38 | Phiếu yêu cầu bảo hành (Repair Ticket) chỉ được tạo thành công cho các sản phẩm hợp lệ: Serial có tồn tại trên hệ thống và còn trong Thời gian bảo hành. |
| BR-39 | Bất kỳ trường hợp phát hiện tem bảo hành gốc bị vỡ/rách (Void Seal), hệ thống yêu cầu nhân viên đổi trạng thái sang "Từ chối bảo hành" do lỗi người dùng. |
| BR-40 | Khi xử lý bảo hành cần thay thế linh kiện, các linh kiện dự phòng xuất ra sẽ được hạch toán trừ tồn kho bình thường, nhưng Đơn giá tính cho khách hàng có thể điều chỉnh về 0 VND. |
| BR-41 | Đối với chính sách "Đổi mới 100%" (Replacement), thiết bị mới xuất cho khách sẽ kế thừa (inherit) đúng số ngày bảo hành còn lại của thiết bị lỗi, KHÔNG thiết lập lại chu kỳ bảo hành mới. |
| BR-42 | Nếu khách hàng yêu cầu thay linh kiện không đúng theo chuẩn cấu hình BOM ban đầu, hệ thống từ chối áp dụng bảo hành miễn phí đối với các linh kiện bên thứ ba đó. |
