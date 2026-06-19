# Feature Specification: Warehouse Management (Quản lý Danh mục Kho)

**Feature Branch**: `feature-warehouse-management`

**Created**: 2026-06-16

**Status**: Done

## Lịch sử sửa đổi (Document Control)

| Phiên bản | Ngày cập nhật | Người thực hiện | Nội dung thay đổi (Changelog) |
| :---: | :--- | :--- | :--- |
| **1.0.0** | 16/06/2026 | [HungPVC] | Khởi tạo tài liệu đặc tả cho US1, US2, US3, US4. |
| **1.1.0** | 17/06/2026 | [HungPVC] | Bổ sung US5 (Audit Logs) và chốt cơ chế RBAC Global cho Manager. |
| **1.2.0** | 18/06/2026 | [HungPVC] | Thêm US6 (Export Excel) và định dạng hiển thị các cột báo cáo tồn kho. |

**Input**: User description: "Tạo Kho, Sửa kho, Xóa kho và Xem chi tiết kho kèm các thông số thống kê tồn kho và Audit Logs dựa trên cấu trúc cơ sở dữ liệu có sẵn"

## Clarifications

### Session 2026-06-17
- Q: Cơ chế phân quyền và gán quyền tự động (Data-level Access) đối với chức năng quản lý kho là gì? → A: Manager mặc định có quyền thao tác trên TẤT CẢ các kho (Global access). Việc tự động insert vào `USER_WAREHOUSE_ROLES` khi tạo kho chỉ mang tính chất ghi nhận "Người tạo (Owner)" chứ không phải cấp quyền truy cập. Staff không có quyền CRUD kho.
- Q: Trường `type` của kho có được phép chỉnh sửa sau khi tạo không? → A: Không. Hệ thống mới nên ưu tiên thiết lập mặc định kho là 'STANDARD' và trường `type` bị khóa (Read-only) sau khi tạo, tương tự như trường `code`.

---

## User Scenarios & Testing

### User Story 1 - Tạo Kho Mới (Priority: P1)

Manager cần tạo ra các kho hàng mới để thiết lập hệ thống lưu trữ linh kiện máy tính ban đầu.

**Why this priority**: Dữ liệu danh mục kho (Warehouse Master Data) là cấu hình nền tảng tối cần thiết. Nếu không có thực thể kho, các phân hệ Nhập kho (IN_PO), Xuất kho (EX_SO) và Điều chuyển (TRANSFERS) hoàn toàn không thể thực hiện giao dịch hay ghi nhận số dư.

**Independent Test**: Có thể kiểm thử độc lập hoàn toàn bằng cách truy cập màn hình Tạo kho, nhập các trường thông tin hợp lệ, nhấn "Lưu" và xác thực bản ghi mới xuất hiện chính xác trong danh sách hiển thị lẫn bảng dữ liệu `WAREHOUSES` trong DB.

**Acceptance Scenarios**:

1. **Given** Người dùng đăng nhập với quyền Manager và đang ở giao diện `[WH_Create_UI]`, **When** nhập đầy đủ trường bắt buộc gồm Mã kho (`code`) không trùng lặp, Tên kho (`name`), chọn loại kho (`type`), trạng thái kho (`status` = 'APPROVED') và bấm "Lưu", **Then** hệ thống thực hiện thêm bản ghi thành công vào bảng `WAREHOUSES`, đồng thời tự động thêm 1 dòng vào bảng `USER_WAREHOUSE_ROLES` để ghi nhận user này là "Người tạo" (Owner), sau đó hiển thị thông báo "Tạo kho thành công" và điều hướng về trang danh sách.
2. **Given** Người dùng đang ở giao diện tạo kho `[WH_Create_UI]`, **When** nhập một mã kho (`code`) trùng khớp với một mã kho đã tồn tại sẵn trong database (không phân biệt chữ hoa, chữ thường), **Then** hệ thống chặn hành động lưu, hiển thị thông báo lỗi bằng chữ màu đỏ ngay phía dưới ô nhập liệu: *"Mã kho này đã tồn tại trong hệ thống. Vui lòng nhập mã khác."*

---

### User Story 2 - Xem Chi Tiết Kho & Thống Kê Tồn Kho (Priority: P1)

Manager cần xem thông tin chi tiết cấu hình của một kho cụ thể cùng các chỉ số tài chính, số lượng linh kiện đang nằm trong kho đó theo thời gian thực (Real-time). (Staff bị từ chối truy cập do chỉ Manager mới có quyền CRUD/View kho).

**Why this priority**: Giúp thủ kho và quản lý nắm bắt ngay lập tức tình trạng sức khỏe của kho (Đang giữ bao nhiêu loại sản phẩm, số lượng tổng là bao nhiêu và tổng giá trị vốn quy đổi ra tiền mặt là bao nhiêu) mà không cần phải chạy các báo cáo kế toán phức tạp.

**Independent Test**: Có thể kiểm thử bằng cách chọn một kho đã phát sinh giao dịch nhập xuất, bấm vào xem chi tiết và đối chiếu trực tiếp 3 chỉ số thống kê hiển thị trên màn hình với kết quả truy vấn tính toán (SUM/COUNT) từ bảng số dư `INVENTORY_BALANCES` trong DB.

**Acceptance Scenarios**:

1. **Given** Một kho hàng đã có sẵn dữ liệu hàng hóa lưu trữ, **When** người dùng có thẩm quyền truy cập màn hình Xem chi tiết kho `[WH_Detail_UI]`, **Then** hệ thống hiển thị chính xác thông tin tĩnh (Mã, Tên, Địa chỉ) và tự động tính toán, hiển thị 3 thẻ thông số (Metrics Cards):
    * **Tổng số loại sản phẩm (Total SKUs)**: `COUNT(DISTINCT variant_id)` trong bảng `INVENTORY_BALANCES` nơi `warehouse_id = [ID kho]` và `quantity_on_hand > 0`.
    * **Tổng số lượng tồn kho (Total Quantity)**: `SUM(quantity_on_hand)` trong bảng `INVENTORY_BALANCES` nơi `warehouse_id = [ID kho]`.
    * **Tổng giá trị tồn kho (Total Value)**: `SUM(quantity_on_hand * average_cost)` trong bảng `INVENTORY_BALANCES` nơi `warehouse_id = [ID kho]`, định dạng theo tiền tệ VNĐ (`#,##0 đ`).
2. **Given** Một kho hàng vừa mới được tạo lập hoặc hiện tại hoàn toàn trống rỗng (không có hàng tồn), **When** người dùng mở màn hình Xem chi tiết kho `[WH_Detail_UI]`, **Then** hệ thống hiển thị giá trị cả 3 thẻ thông số thống kê tồn kho bằng số **`0`** (Zero-state), không hiển thị giá trị `Null`, `Blank` hoặc văng lỗi giao diện `NaN`.

---

### User Story 3 - Chỉnh Sửa Thông Tin Kho (Priority: P2)

Manager cần cập nhật các thông tin vật lý của kho hoặc tạm thời ngừng kích hoạt kho khi kho sửa chữa, đóng cửa.

**Why this priority**: Đảm bảo dữ liệu danh mục kho luôn phản ánh đúng thực tế doanh nghiệp (ví dụ kho đổi địa chỉ hoặc đổi tên gọi). Cho phép chuyển đổi trạng thái hoạt động để kiểm soát luồng nhập xuất linh kiện linh hoạt.

**Independent Test**: Có thể kiểm thử bằng cách mở form chỉnh sửa một kho, thực hiện thay đổi dữ liệu trường Tên hoặc Trạng thái, lưu lại và kiểm tra thông tin cập nhật trong DB, đồng thời xác thực xem kho đó có bị ẩn khỏi dropdown tạo phiếu kho mới hay không nếu chuyển thành `INACTIVE`.

**Acceptance Scenarios**:

1. **Given** Người dùng đang ở màn hình Chỉnh sửa thông tin kho `[WH_Edit_UI]`, **When** thực hiện sửa trường Tên kho (`name`), Địa chỉ (`address`), chuyển trạng thái (`status`) từ 'APPROVED' sang 'INACTIVE' và nhấn "Lưu", **Then** hệ thống thực hiện cập nhật bản ghi trong bảng `WAREHOUSES` và ghi nhận lịch sử đổi trạng thái thành công.
2. **Given** Người dùng đang ở giao diện `[WH_Edit_UI]`, **When** quan sát ô nhập liệu Mã kho (`code`) và Loại kho (`type`), **Then** hệ thống bắt buộc phải khóa các trường này ở chế độ chỉ đọc (Read-only / Disabled input), chặn hoàn toàn mọi hành vi cố tình thay đổi mã định danh duy nhất cũng như phân loại của kho sau khi đã tạo lập.

---

### User Story 4 - Xóa / Vô Hiệu Hóa Kho (Priority: P2)

Manager cần xóa bỏ các kho tạo sai hoặc ngừng hoạt động hoàn toàn ra khỏi hệ thống danh mục.

**Why this priority**: Dọn dẹp các dữ liệu rác, lỗi trong quá trình thiết lập. Tuy nhiên đối với hệ thống ERP điện tử, việc xóa phải đi kèm ràng buộc chặt chẽ để bảo toàn tính toàn vẹn dữ liệu (Data Integrity) lịch sử kế toán kho.

**Independent Test**: Có thể kiểm thử bằng cách cố gắng xóa một kho mới tạo (chưa giao dịch) xem hệ thống cho phép Hard Delete không, và cố gắng xóa một kho đã có phiếu nhập/xuất để xác thực tính năng chặn lỗi từ phía hệ thống.

**Acceptance Scenarios**:

1. **Given** Một kho hàng vừa mới tạo ra và **chưa từng** phát sinh bất kỳ ràng buộc khóa ngoại nào (chưa có hàng tồn trong `INVENTORY_BALANCES`, chưa có phiếu nhập/xuất trong `INVENTORY_DOCUMENTS` hoặc đơn hàng `PURCHASE_ORDERS`/`SALES_ORDERS`), **When** Manager chọn hành động "Xóa vật lý", **Then** hệ thống thực hiện lệnh Hard Delete (`DELETE FROM WAREHOUSES`) thành công ra khỏi cơ sở dữ liệu.
2. **Given** Một kho hàng đã có dữ liệu lịch sử hoặc đang chứa linh kiện máy tính bên trong (tồn kho vật lý > 0), **When** Manager cố tình bấm "Xóa", **Then** hệ thống tự động chặn hành động xóa vật lý, không gửi lệnh DELETE trực tiếp để tránh văng lỗi cơ sở dữ liệu, hiển thị popup cảnh báo thân thiện: *"Không thể xóa kho đã phát sinh giao dịch hoặc đang chứa linh kiện. Hệ thống đã tự động chuyển trạng thái kho này về ngừng hoạt động (INACTIVE)."*, đồng thời tự động cập nhật trường `status = 'INACTIVE'` (Soft Delete).

---

### User Story 5 - Truy Vết Nhật Ký Chỉnh Sửa (Audit Logs) (Priority: P3)

Manager cần truy vết lịch sử tác động dữ liệu xem "Ai đã làm gì, vào thời điểm nào trên cấu hình kho này" để phục vụ mục đích bảo mật và hậu kiểm.

**Why this priority**: Đây là tính năng hộp đen bắt buộc trong quản trị doanh nghiệp, giúp ngăn ngừa các hành vi gian lận dữ liệu, sửa đổi tên kho hoặc cấu hình kho bất hợp pháp gây sai lệch báo cáo kế toán.

**Independent Test**: Có thể kiểm thử bằng cách thực hiện chuỗi hành động CRUD kho dưới một tài khoản nhân viên, sau đó vào Tab "Lịch sử thay đổi" trong màn hình chi tiết kho để kiểm tra danh sách log tự động sinh ra có khớp chính xác hay không.

**Acceptance Scenarios**:

1. **Given** Người dùng có quyền Manager (hoặc được cấp quyền qua `USER_WAREHOUSE_ROLES`) truy cập vào Tab "Lịch sử thay đổi" nằm bên trong màn hình `[WH_Detail_UI]`, **When** hệ thống tải trang, **Then** hệ thống thực hiện kết nối bảng `AUDIT_LOGS` JOIN với bảng `USERS` lọc theo điều kiện `entity_name = 'WAREHOUSES'` và `entity_id = [ID kho]`, hiển thị danh sách dòng thời gian (có phân trang Server-side để đảm bảo hiệu năng) rõ ràng gồm: Ngày giờ (`created_at`), Tên người thực hiện (`full_name`), Thao tác hiển thị ngôn ngữ tự nhiên (Tạo mới / Cập nhật / Xóa) và cột Chi tiết bóc tách trực tiếp từ trường JSON `detail` (Ví dụ: *"Thay đổi Tên kho từ [Kho cũ] thành [Kho mới]"*).

### User Story 6 - Xuất dữ liệu kho ra Excel (Priority: P2)

Manager (và Kế toán) cần xuất danh sách các kho hàng kèm theo các chỉ số tồn kho hiện tại ra file Excel để phục vụ việc làm báo cáo tổng tài sản hoặc đối soát offline.

**Why this priority**: Excel là công cụ làm việc bắt buộc của kế toán và vận hành. Việc xuất được file Excel định dạng chuẩn giúp tiết kiệm hàng giờ đồng hồ copy/paste và tính toán thủ công.

**Independent Test**: Có thể kiểm thử bằng cách áp dụng bộ lọc trên màn hình danh sách kho, bấm nút "Xuất Excel" và kiểm tra file tải về xem số lượng dòng, định dạng cột và dữ liệu có khớp với lưới hiển thị trên UI hay không.

**Acceptance Scenarios**:

1. **Given** Người dùng đang ở màn hình danh sách kho `[WH_List_UI]` và đang áp dụng bộ lọc (Ví dụ: Chỉ xem kho `APPROVED`), **When** click nút "Xuất Excel", **Then** hệ thống xử lý và tải xuống 1 file `.xlsx` chỉ chứa các kho thỏa mãn điều kiện lọc.
2. **Given** File Excel đã được tải về, **When** người dùng mở file, **Then** quan sát thấy:
    * 3 dòng đầu tiên chứa Meta-data (Tiêu đề báo cáo, Người xuất, Thời gian xuất realtime).
    * Dòng số 5 là Header của bảng và được cố định (Freeze Panes).
    * Cột "Tổng giá trị tồn" được định dạng chuẩn Số/Tiền tệ (Number format: `#,##0`) để có thể dùng hàm `SUM()` trực tiếp mà không bị lỗi chuỗi text.
    * Cột Trạng thái (`status`) được dịch sang tiếng Việt (Đang hoạt động, Ngừng hoạt động...).

### Edge Cases

- **Xử lý lỗi ràng buộc dữ liệu sâu tại tầng DB khi Hard Delete thất bại**: Nếu có lỗi phát sinh bất ngờ do các ràng buộc khóa ngoại tầng sâu chưa kiểm soát hết, hệ thống phải bắt (catch) exception `Foreign Key Constraint Fails`, chặn đứng màn hình lỗi kỹ thuật (white screen) và trả ra mã lỗi nội bộ kèm câu thông báo hướng dẫn người dùng chuyển đổi trạng thái kho thủ công sang `INACTIVE`.
- **Thao tác đồng thời (Concurrent Updates)**: Trường hợp 2 Manager cùng mở form chỉnh sửa 1 kho tại một thời điểm. Người A đổi tên kho thành "Kho A" và lưu trước, người B đổi tên kho thành "Kho B" và lưu sau. Hệ thống áp dụng cơ chế *Optimistic Locking* (Khóa lạc quan) thông qua trường `@Version` trên Entity. Bản ghi của người lưu sau (Người B) sẽ bị từ chối với mã lỗi HTTP `409 Conflict`, đồng thời giao diện hiển thị thông báo yêu cầu tải lại trang để thấy dữ liệu mới nhất, tránh việc vô tình ghi đè dữ liệu.
- **Truy cập trái phép vùng dữ liệu (Role-level Access Violation)**: Nếu một nhân viên (Staff) cố tình thay đổi ID trên URL để truy cập vào màn hình chi tiết của một kho, hệ thống lập tức chặn ở tầng API do thiếu quyền Manager, trả về mã lỗi HTTP `403 Forbidden` và điều hướng người dùng về trang chủ kèm cảnh báo: *"Bạn không có quyền truy cập chức năng này."*

---

## Requirements

### Functional Requirements

- **FR-001**: Hệ thống PHẢI hỗ trợ phân quyền theo mô hình RBAC: Chỉ những người dùng có quyền `MANAGER` (hoặc `SUPER_ADMIN`) mới có quyền thực hiện thao tác xem chi tiết và CRUD trên danh mục kho. Manager mặc định có quyền trên tất cả các kho (Global access). Việc lưu thông tin vào bảng `USER_WAREHOUSE_ROLES` khi tạo kho chỉ mang mục đích ghi nhận "Người tạo" (Owner). Staff bị từ chối truy cập hoàn toàn vào các tính năng này.
- **FR-002**: Hệ thống PHẢI tự động kiểm tra tính duy nhất của trường Mã kho (`code`) trên phạm vi toàn cục hệ thống (kể cả với các kho đã bị xóa mềm/`INACTIVE`), không phân biệt chữ hoa hay chữ thường (Case-insensitive) trước khi cho phép ghi xuống DB.
- **FR-003**: Hệ thống PHẢI thiết lập cấu hình trường Mã kho (`code`) và Loại kho (`type`) thành chỉ đọc (Read-only) và không cho phép thay đổi giá trị dưới mọi hình thức sau khi bản ghi đã lưu thành công lần đầu tiên.
- **FR-004**: Hệ thống PHẢI tính toán động 3 chỉ số tồn kho (Total SKUs, Total Quantity, Total Value) thời gian thực bằng cách quét và gộp dữ liệu từ bảng số dư `INVENTORY_BALANCES` ngay khi người dùng kích hoạt mở trang chi tiết kho hàng.
- **FR-005**: Hệ thống PHẢI tự động kích hoạt cơ chế trigger sinh nhật ký lưu vết (Insert record) vào bảng `AUDIT_LOGS` mỗi khi có hành động thêm mới, cập nhật thông tin hoặc đổi trạng thái kho thành công, ghi nhận cụ thể cấu trúc JSON bao gồm trạng thái cũ (`old`) và trạng thái mới (`new`) của các trường dữ liệu bị thay đổi.
- **FR-006**: Hệ thống PHẢI ngăn chặn tuyệt đối hành động Hard Delete (xóa vật lý khỏi DB) đối với bất kỳ kho hàng nào đã phát sinh dữ liệu liên kết kế toán hoặc nghiệp vụ, đồng thời tự động chuyển hướng hành động đó thành Soft Delete (cập nhật `status = 'INACTIVE'`).
- **FR-007**: Hệ thống PHẢI hỗ trợ tính năng xuất danh sách kho ra định dạng `.xlsx`. Dữ liệu xuất ra PHẢI phản ánh chính xác các điều kiện tìm kiếm/lọc hiện tại trên giao diện người dùng (WYSIWYG) và PHẢI định dạng chuẩn các cột số liệu để hỗ trợ tính toán trực tiếp trên Excel.

### Key Entities

- **WAREHOUSES**: Thực thể dữ liệu master chứa các thuộc tính cốt lõi của kho hàng: mã định danh (`id`), mã code (`code`), tên kho (`name`), địa chỉ (`address`), loại cấu hình (`type`), trạng thái hoạt động (`status`).
- **USER_WAREHOUSE_ROLES**: Thực thể trung gian dùng để phân quyền dữ liệu chi tiết, liên kết người dùng (`user_id`), mã kho (`warehouse_id`), và vai trò cụ thể (`role_id`) đi kèm cờ kích hoạt quyền (`is_active`).
- **INVENTORY_BALANCES**: Thực thể lưu trữ trạng thái số dư tồn kho thời gian thực của từng mã biến thể linh kiện, số lượng thực tế (`quantity_on_hand`) và giá vốn bình quân (`average_cost`) dùng để tính toán các chỉ số tài chính kho.
- **AUDIT_LOGS**: Thực thể lưu vết bảo mật hệ thống, lưu trữ mã người dùng thực hiện (`user_id`), hành động (`action`), tên thực thể tác động (`entity_name` = 'WAREHOUSES'), ID thực thể (`entity_id`) và chi tiết biến động định dạng JSON (`detail`).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Thời gian xử lý ghi dữ liệu và hoàn tất tạo mới một kho hàng từ lúc nhấn nút "Lưu" đến khi hoàn tất lưu DB và điều hướng trang phải dưới **0.5 giây**.
- **SC-002**: Tốc độ tải và tính toán động các chỉ số tồn kho (Aggregation queries) tại giao diện chi tiết kho `[WH_Detail_UI]` bắt buộc phải đạt dưới **1.5 giây** (mức p95) đối với các kho hàng lớn có quy mô lên đến 50,000 bản ghi số dư trong bảng `INVENTORY_BALANCES`.
- **SC-003**: Đạt tỷ lệ chính xác **100%** trong việc ghi nhận vết dữ liệu: Bất kỳ thay đổi cấu hình kho nào trên UI cũng phải tạo ra 1 bản ghi tương ứng trong bảng `AUDIT_LOGS` không được sai sót hay có độ trễ dữ liệu.
- **SC-004**: Tỷ lệ xảy ra lỗi văng mã code SQL thô hoặc lỗi treo kết nối hệ thống khi người dùng cố tình thực hiện các thao tác xóa lỗi, nhập trùng dữ liệu tại giao diện ứng dụng đạt mức **0%** (tất cả phải được xử lý qua bẫy lỗi exception và hiển thị thông báo nghiệp vụ).
- **SC-005**: Chức năng xuất Excel phải trả về file tải xuống thành công trong vòng **dưới 3 giây** cho tập dữ liệu danh sách kho tiêu chuẩn.
---

## Assumptions

- Người dùng hệ thống (Manager/Staff) đã được xác thực danh tính hoàn tất thông qua module phân quyền đăng nhập chung trước khi tiếp cận phân hệ quản lý kho này.
- Giá vốn bình quân (`average_cost`) lưu giữ trong bảng số dư `INVENTORY_BALANCES` luôn được cập nhật chính xác và liên tục bởi Engine tính toán giá vốn tự động (luồng phân hệ FIFO kế toán) của hệ thống mỗi khi một chứng từ nhập kho (`IN_PO`) được phê duyệt (`POSTED`).
- Hệ thống cơ sở dữ liệu và hạ tầng máy chủ ứng dụng hoạt động ổn định, kết nối mạng giữa thiết bị đầu cuối của người dùng và hệ thống API không bị gián đoạn diện rộng trong quá trình thao tác lưu trữ chứng từ master data.
- Bảng nhật ký dữ liệu `AUDIT_LOGS` sẽ được hệ thống chạy ngầm tự động một Background Job (Scheduler) để dọn dẹp định kỳ các bản ghi cũ (VD: trên 1 năm) nhằm đảm bảo hiệu năng tối ưu cho câu lệnh truy vấn lịch sử thay đổi thông tin kho.
