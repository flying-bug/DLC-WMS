# 5. Requirement Appendix
## 5.2 System Messages

| # | Message code | Message Type | Context | Content |
| :--- | :--- | :--- | :--- | :--- |
| 1 | MSG00 | Toast message | A general action is completed successfully | Success. |
| 2 | MSG01 | In line | There is not any search result | No search results. |
| 3 | MSG02 | In red, under the text box | Input-required fields are empty | The * field is required. |
| 4 | MSG03 | Toast message | Updating an entity successfully | Update data successfully. |
| 5 | MSG04 | Toast message | Adding a new entity successfully | Add data successfully. |
| 6 | MSG05 | Toast message | Deleting an entity successfully | Delete data successfully. |
| 7 | MSG06 | In red, under the text box | Input email address is invalid | Invalid email format. |
| 8 | MSG07 | In red, under the text box | Input phone number is invalid (Vietnam format) | Invalid phone number. |
| 9 | MSG08 | In red, under the text box | Input value length > max length | Exceed max length. |
| 10 | AUTH01 | In line / Popup | Username or password is not correct when clicking sign-in | Incorrect user name or password. Please check again. |
| 11 | AUTH02 | In line / Popup | Requesting a user that does not exist in database | User not found. |
| 12 | AUTH03 | In line / Popup | Account is locked due to failed attempts or unapproved | Account is locked or not approved. |
| 13 | AUTH04 | In red, under the text box | Entering a wrong OTP | Invalid OTP. |
| 14 | AUTH05 | In red, under the text box | Entering an expired OTP | Expired OTP. |
| 15 | AUTH06 | In red, under the text box | Passwords do not match in change password form | Wrong old password. |
| 16 | AUTH07 | Toast message | Google SSO login token is invalid | Invalid Google Token. |
| 17 | AUTH08 | Toast message | Trying to assign dynamic permissions to a non-staff | Only staff can have dynamic permissions. |
| 18 | UNIT01 | Toast message | Requesting a unit that does not exist | Unit not found. |
| 19 | UNIT02 | Toast message | Trying to create a unit with an existing name | Unit name already exists. |
| 20 | PROD01 | Toast message | Requesting a product that does not exist | Product not found. |
| 21 | PROD02 | Toast message | Trying to create a product with an existing unique code | Product code already exists. |
| 22 | PROD03 | Toast message | Trying to delete a product that has related transactions | Cannot delete product because it is in use. |
| 23 | INV01 | Toast message | Trying to create an inventory document with an existing code | Inventory document code already exists. |
| 24 | INV02 | Toast message | Requesting an inventory document that does not exist | Inventory document not found. |
| 25 | INV03 | Toast message | Trying to edit a completed inventory document | Invalid inventory document state. |
| 26 | INV04 | Toast message | Submitting an export slip but quantity exceeds stock | Not enough stock to perform this transaction. |
| 27 | INV05 | Toast message | System cannot find enough cost layers for FIFO calculation | Insufficient cost layers for FIFO export. |
| 28 | INV06 | Toast message | Missing required data for inventory document | Inventory document data is required. |
| 29 | INV07 | Toast message | Scanning a duplicate serial number during import | Serial number already exists in the system. |
| 30 | INV08 | Toast message | Scanning a wrong serial number during export | Serial number not found in the specified warehouse. |
| 31 | INV09 | In red, under the text box | Forgetting to input serials for serial-tracked products | Required serial numbers are missing. |
| 32 | INV10 | Toast message | Source and destination warehouse are the same in a transfer | Source and destination warehouse must be different. |
| 33 | INV11 | Toast message | Modifying warehouse inventory during an active stocktake | Warehouse is locked due to active stocktake. |
| 34 | BOM01 | Toast message | Approving assembly order without enough components | Insufficient component materials to assemble. |
| 35 | WARR01 | Toast message | Requesting warranty for a serial that is out of warranty date | Product is out of warranty. |
| 36 | SYS401 | In line / Popup | Token or session is expired | Your session has expired. |
| 37 | SYS403 | In line / Popup | User tries to access a page without sufficient permissions | Access Denied. You do not have permission. |
| 38 | SYS500 | Toast message | System internal error (500) | An unexpected error occurred. Please contact the administrator. |
| 39 | ASM01 | Toast message | Invalid BOM cost allocation | Tổng tỷ lệ phân bổ giá vốn của các linh kiện phải bằng 100%. |
| 40 | ASM02 | Toast message | BOM locked by active orders | Không thể sửa Định mức lắp ráp vì đang có Lệnh đang sử dụng định mức này. |
| 41 | ASM03 | Toast message | Insufficient target or components | Không đủ tồn kho thành phẩm hoặc linh kiện để thực hiện lệnh. |
| 42 | ASM04 | Toast message | Order has posted docs | Không thể Hủy lệnh vì đã có chứng từ kho (Phiếu Nhập/Xuất) liên quan. |
| 43 | MSG09 | Toast message | INVALID_FULL_NAME | Họ và tên phải có 2-100 ký tự và không chứa số hoặc ký tự đặc biệt. |
| 44 | AUTH09 | Toast message | INVALID_USER_STATUS | Trạng thái tài khoản không hợp lệ. |
| 45 | AUTH10 | Toast message | CANNOT_LOCK_SELF | Không thể tự khóa tài khoản đang đăng nhập. |
| 46 | AUTH11 | Toast message | USERNAME_EXISTS | Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác. |
| 47 | AUTH12 | Toast message | EMAIL_EXISTS | Email đã tồn tại. Vui lòng sử dụng email khác. |
| 48 | AUTH13 | Toast message | PHONE_EXISTS | Số điện thoại đã được đăng ký cho tài khoản khác. Vui lòng sử dụng số điện thoại khác. |
| 49 | CAT01 | Toast message | CATEGORY_NOT_FOUND | Không tìm thấy danh mục. |
| 50 | CAT02 | Toast message | CATEGORY_CODE_EXISTS | Mã danh mục đã tồn tại trên hệ thống. |
| 51 | CAT03 | Toast message | CATEGORY_NAME_EXISTS | Tên danh mục đã tồn tại trên hệ thống. |
| 52 | CAT04 | Toast message | CATEGORY_HAS_PRODUCTS | Không thể xóa danh mục đang có hàng hóa liên kết. |
| 53 | CAT05 | Toast message | CATEGORY_PARENT_NOT_FOUND | Không tìm thấy danh mục cha. |
| 54 | CAT06 | Toast message | CATEGORY_INVALID_PARENT | Danh mục cha không hợp lệ. |
| 55 | SUP01 | Toast message | SUPPLIER_NOT_FOUND | Không tìm thấy nhà cung cấp. |
| 56 | SUP02 | Toast message | SUPPLIER_CODE_EXISTS | Mã nhà cung cấp đã tồn tại trên hệ thống. |
| 57 | SUP03 | Toast message | SUPPLIER_HAS_TRANSACTIONS | Nhà cung cấp đang có giao dịch liên kết, chỉ có thể vô hiệu hóa (chuyển sang Ngừng hoạt động). |
| 58 | SUP04 | Toast message | SUPPLIER_INVALID_TYPE | Loại nhà cung cấp không hợp lệ. Chỉ chấp nhận COMPANY hoặc INDIVIDUAL. |
| 59 | SUP05 | Toast message | SUPPLIER_INVALID_STATUS | Trạng thái nhà cung cấp không hợp lệ. Chỉ chấp nhận APPROVED hoặc INACTIVE. |
| 60 | SUP06 | Toast message | SUPPLIER_INVALID_GROUP_TYPE | Nhóm nhà cung cấp không hợp lệ. Chỉ chấp nhận: RETAIL, WHOLESALE, DISTRIBUTOR. |
| 61 | CUST01 | Toast message | CUST_NOT_FOUND | Không tìm thấy khách hàng. |
| 62 | CUST02 | Toast message | CUST_PHONE_EXISTS | Số điện thoại này đã được đăng ký cho khách hàng khác. |
| 63 | CUST03 | Toast message | CUST_HAS_REPAIRING_WARRANTY | Khách hàng đang có thiết bị sửa chữa tại trung tâm, không thể vô hiệu hóa. |
| 64 | CUST04 | Toast message | CUST_VIEW_SEED_DATA_DENIED | Không được phép xem chi tiết dữ liệu Khách vãng lai. |
| 65 | CUST05 | Toast message | CUST_ALREADY_ACTIVE | Khách hàng đang ở trạng thái hoạt động, không cần kích hoạt lại. |
| 66 | CUST06 | Toast message | CUST_CODE_EXISTS | Mã khách hàng đã tồn tại trên hệ thống. |
| 67 | WH01 | Toast message | WH_NOT_FOUND | Không tìm thấy kho lưu trữ. |
| 68 | WH02 | Toast message | WH_CODE_EXISTS | Mã kho đã tồn tại trên hệ thống. |
| 69 | WH03 | Toast message | WH_HAS_TRANSACTION | Không thể xóa kho đã phát sinh giao dịch hoặc đang chứa linh kiện. Hệ thống đã tự động chuyển trạng thái kho này về ngừng hoạt động (INACTIVE). |
| 70 | WH04 | Toast message | WH_OPTIMISTIC_LOCK | Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang để xem dữ liệu mới nhất. |
| 71 | WHS01 | Toast message | WH_STAFF_NOT_FOUND | Không tìm thấy nhân viên trong kho chỉ định. |
| 72 | WHS02 | Toast message | WH_STAFF_HAS_PENDING_DOCS | Nhân viên đang là người tạo chứng từ chưa hoàn tất. Vui lòng xử lý chứng từ trước khi thu hồi quyền. |
| 73 | WHS03 | Toast message | WH_STAFF_CANNOT_REVOKE_SELF | Không thể tự thu hồi quyền của chính mình tại kho đang làm việc. |
| 74 | WHS04 | Toast message | WH_STAFF_INVALID_ROLE | Vai trò gán không hợp lệ. Chỉ được phép gán các vai trò thuộc phân hệ kho. |
| 75 | BRND01 | Toast message | BRAND_NOT_FOUND | Không tìm thấy thương hiệu. |
| 76 | BRND02 | Toast message | BRAND_CODE_EXISTS | Mã thương hiệu đã tồn tại trên hệ thống. |
| 77 | BRND03 | Toast message | BRAND_CODE_NOT_MODIFIABLE | Mã thương hiệu không thể thay đổi sau khi tạo. |
| 78 | BRND04 | Toast message | BRAND_INVALID_STATUS | Trạng thái thương hiệu không hợp lệ. |
| 79 | REP01 | Toast message | REP_NOT_FOUND | Không tìm thấy lệnh sửa chữa. |
| 80 | REP02 | Toast message | REP_CODE_EXISTS | Mã lệnh sửa chữa đã tồn tại trên hệ thống. |
| 81 | REP03 | Toast message | REP_INVALID_STATUS_TRANSITION | Chuyển trạng thái lệnh sửa chữa không hợp lệ. |
| 82 | REP04 | Toast message | REP_PARTNER_REQUIRED | Lệnh sửa chữa phải có thông tin khách hàng. |
| 83 | REP05 | Toast message | REP_INSUFFICIENT_INVENTORY | Không đủ tồn kho linh kiện để xác nhận lệnh. |
| 84 | REP06 | Toast message | REP_LINE_NOT_FOUND | Không tìm thấy dòng linh kiện sửa chữa. |
| 85 | REP07 | Toast message | REP_FEE_NOT_FOUND | Không tìm thấy dòng phí dịch vụ. |
| 86 | REP08 | Toast message | REP_CANNOT_MODIFY | Lệnh sửa chữa không thể chỉnh sửa ở trạng thái này. |
| 87 | REP09 | Toast message | REP_CANNOT_CANCEL | Không thể hủy lệnh đã hoàn tất (DONE). |
| 88 | REP10 | Toast message | REP_WARRANTY_PRICE_INVALID | Linh kiện/phí dịch vụ bảo hành phải có giá bằng 0. |
| 89 | REP11 | Toast message | REP_SERIAL_REQUIRED | Linh kiện '%s' quản lý theo Serial Number nhưng chưa được quét mã serial. Vui lòng quét serial trước khi hoàn tất. |
| 90 | ASM_001 | Toast message | ASM_ERR_001 | Lệnh không có thành phẩm |
| 91 | ASM_002 | Toast message | ASM_ERR_002 | Tính năng thực thi quét mã vạch hiện tại chỉ hỗ trợ Lắp ráp và Tháo dỡ |
| 92 | ASM_003 | Toast message | ASM_ERR_003 | Chỉ có thể thực thi lệnh đã được duyệt |
| 93 | ASM_004 | Toast message | ASM_ERR_004 | Serial %s đang nằm trong cấu hình PC, không thể lắp vào PC khác. |
| 94 | ASM_005 | Toast message | ASM_ERR_005 | Serial linh kiện là bắt buộc |
| 95 | ASM_006 | Toast message | ASM_ERR_006 | Cấu hình serial đã có lịch sử sửa chữa, không thể ghi đè toàn bộ. |
| 96 | ASM_007 | Toast message | ASM_ERR_007 | Serial thành phẩm là bắt buộc |
| 97 | ASM_008 | Toast message | ASM_ERR_008 | Trạng thái lệnh không hợp lệ |
| 98 | ASM_009 | Toast message | ASM_ERR_009 | Trạng thái lệnh phải là DRAFT hoặc SUBMITTED |
| 99 | ASM_010 | Toast message | ASM_ERR_010 | Loại lệnh không hợp lệ |
| 100 | ASM_011 | Toast message | ASM_ERR_011 | Trạng thái cấu hình không hợp lệ |
| 101 | ASM_012 | Toast message | ASM_ERR_012 | Mã cấu hình đã tồn tại |
| 102 | ASM_013 | Toast message | ASM_ERR_013 | Mã lệnh lắp ráp/tháo dỡ đã tồn tại |
| 103 | ASM_014 | Toast message | ASM_ERR_014 | Chỉ có thể cập nhật lệnh DRAFT hoặc SUBMITTED |
| 104 | ASM_015 | Toast message | ASM_ERR_015 | Sản phẩm thành phẩm của cấu hình chưa có SKU |
| 105 | ASM_016 | Toast message | ASM_ERR_016 | ID lệnh là bắt buộc |
| 106 | ASM_017 | Toast message | ASM_ERR_017 | Cấu hình chưa có linh kiện |
| 107 | ASM_018 | Toast message | ASM_ERR_018 | Chỉ được tạo lệnh từ cấu hình đã duyệt |
| 108 | ASM_019 | Toast message | ASM_ERR_019 | Định mức dòng %s phải là số nguyên |
| 109 | ASM_020 | Toast message | ASM_ERR_020 | Định mức dòng %s phải lớn hơn 0 |
| 110 | ASM_021 | Toast message | ASM_ERR_021 | Linh kiện dòng %s là bắt buộc |
| 111 | ASM_022 | Toast message | ASM_ERR_022 | Cấu hình phải có ít nhất một linh kiện |
| 112 | ASM_023 | Toast message | ASM_ERR_023 | Phiên bản cấu hình phải lớn hơn 0 |
| 113 | ASM_024 | Toast message | ASM_ERR_024 | Sản phẩm thành phẩm là bắt buộc |
| 114 | ASM_025 | Toast message | ASM_ERR_025 | Dữ liệu Cấu hình là bắt buộc |
| 115 | ASM_026 | Toast message | ASM_ERR_026 | Người tạo là bắt buộc |
| 116 | ASM_027 | Toast message | ASM_ERR_027 | Ngày thực hiện là bắt buộc |
| 117 | ASM_028 | Toast message | ASM_ERR_028 | Số lượng phải lớn hơn 0 |
| 118 | ASM_029 | Toast message | ASM_ERR_029 | Kho là bắt buộc |
| 119 | ASM_030 | Toast message | ASM_ERR_030 | Cấu hình là bắt buộc |
| 120 | ASM_031 | Toast message | ASM_ERR_031 | Dữ liệu lệnh lắp ráp/tháo dỡ là bắt buộc |
| 121 | ASM_032 | Toast message | ASM_ERR_032 | Loại phiếu không hợp lệ |
| 122 | ASM_033 | Toast message | ASM_ERR_033 | Chỉ có thể tạo phiếu kho cho lệnh đã hoàn thành hoặc được duyệt |
| 123 | ASM_034 | Toast message | ASM_ERR_034 | Lệnh đã hoàn thành, không thể sửa ghi chú |
| 124 | ASM_035 | Toast message | ASM_ERR_035 | Chưa hoàn tất xuất/nhập đủ số lượng yêu cầu để hoàn thành lệnh. |
| 125 | ASM_036 | Toast message | ASM_ERR_036 | Chưa gắn đủ Serial thành phẩm. Vui lòng vào mục Cấu hình Serial để hoàn tất. |
| 126 | ASM_037 | Toast message | ASM_ERR_037 | Các phiếu xuất và nhập kho liên kết đang lưu nháp phải được ghi sổ hoặc hủy bỏ. |
| 127 | ASM_038 | Toast message | ASM_ERR_038 | Từ ngày không được lớn hơn đến ngày |
| 128 | ASM_039 | Toast message | ASM_ERR_039 | Cấu hình này trùng với cấu hình %s |
| 129 | AUTH_001 | Toast message | AUTH_ERR_001 | Google Login Failed: %s |
| 130 | BACKUP_001 | Toast message | BACKUP_ERR_001 | File không tồn tại trên disk: %s |
| 131 | BACKUP_002 | Toast message | BACKUP_ERR_002 | Restore thất bại (exit %s): %s |
| 132 | BACKUP_003 | Toast message | BACKUP_ERR_003 | File backup không tồn tại: %s |
| 133 | BACKUP_004 | Toast message | BACKUP_ERR_004 | File không tồn tại: %s |
| 134 | BACKUP_005 | Toast message | BACKUP_ERR_005 | mysqldump thất bại (exit %s): %s |
| 135 | BACKUP_006 | Toast message | BACKUP_ERR_006 | Lỗi khi khởi chạy tiến trình sao lưu: %s |
| 136 | BACKUP_007 | Toast message | BACKUP_ERR_007 | Lỗi: Không tìm thấy công cụ 'mysqldump' trên máy chủ. Vui lòng cài đặt MySQL/MariaDB Tools hoặc kiểm tra biến môi trường PATH. |
| 137 | CLOUD_001 | Toast message | CLOUD_ERR_001 | Chi ho tro anh (JPG, PNG, WEBP) hoac PDF. |
| 138 | CLOUD_002 | Toast message | CLOUD_ERR_002 | File khong duoc vuot qua 5MB. |
| 139 | CLOUD_003 | Toast message | CLOUD_ERR_003 | Vui long chon file de tai len. |
| 140 | CLOUD_004 | Toast message | CLOUD_ERR_004 | Chi ho tro anh JPG, PNG, WEBP hoac GIF. |
| 141 | CLOUD_005 | Toast message | CLOUD_ERR_005 | Anh khong duoc vuot qua 5MB. |
| 142 | CLOUD_006 | Toast message | CLOUD_ERR_006 | Vui long chon anh de tai len. |
| 143 | CLOUD_007 | Toast message | CLOUD_ERR_007 | Khong the tai tai lieu len Cloudinary. |
| 144 | CLOUD_008 | Toast message | CLOUD_ERR_008 | Khong the tai anh len Cloudinary. |
| 145 | CUST_001 | Toast message | CUST_ERR_001 | Không thể đọc file Excel: %s |
| 146 | CUST_002 | Toast message | CUST_ERR_002 | Lỗi khi tạo file Excel: %s |
| 147 | CUST_003 | Toast message | CUST_ERR_003 | Lỗi khi tạo file Excel Template: %s |
| 148 | CHK_001 | Toast message | CHK_ERR_001 | Khách nợ phải có đầy đủ thông tin khách hàng, không được dùng khách vãng lai |
| 149 | CHK_002 | Toast message | CHK_ERR_002 | Số tiền thanh toán vượt quá tổng đơn hàng |
| 150 | CHK_003 | Toast message | CHK_ERR_003 | Số tiền thanh toán không được âm |
| 151 | CHK_004 | Toast message | CHK_ERR_004 | Khách hàng đã ngừng hoạt động, không thể tạo đơn bán hàng |
| 152 | CHK_005 | Toast message | CHK_ERR_005 | Khách hàng không tồn tại |
| 153 | CHK_006 | Toast message | CHK_ERR_006 | Dòng %s: Đơn giá không được âm |
| 154 | CHK_007 | Toast message | CHK_ERR_007 | Dòng %s: Số lượng phải lớn hơn 0 |
| 155 | CHK_008 | Toast message | CHK_ERR_008 | Phải có ít nhất 1 dòng sản phẩm |
| 156 | CHK_009 | Toast message | CHK_ERR_009 | Dữ liệu bán hàng trực tiếp không hợp lệ |
| 157 | EMAIL_001 | Toast message | EMAIL_ERR_001 | Lỗi khi gửi email báo giá: %s |
| 158 | EMAIL_002 | Toast message | EMAIL_ERR_002 | Email người nhận không được để trống |
| 159 | EMAIL_003 | Toast message | EMAIL_ERR_003 | Lỗi khi gửi email tài khoản nhân viên: %s |
| 160 | EMAIL_004 | Toast message | EMAIL_ERR_004 | Lỗi khi gửi email: %s |
| 161 | DRIVE_001 | Toast message | DRIVE_ERR_001 | Thư mục Google Drive (ID: %s) chưa được Chia sẻ (Share) cho email Service Account: [%s]. Vui lòng mở Google Drive -> Chuột phải vào Thư mục -> Chia sẻ cho email [%s] quyền Editor. |
| 162 | DRIVE_002 | Toast message | DRIVE_ERR_002 | Chưa nhập Google Drive Folder ID. Vui lòng vào System Settings nhập Folder ID và nhấn 'Lưu tất cả'. |
| 163 | DRIVE_003 | Toast message | DRIVE_ERR_003 | Cần cấu hình Google Drive (Service Account JSON hoặc OAuth2 Refresh Token). |
| 164 | PAY_001 | Toast message | PAY_ERR_001 | Trạng thái phiếu thu/chi chỉ chấp nhận DRAFT hoặc POSTED |
| 165 | PAY_002 | Toast message | PAY_ERR_002 | Phương thức thanh toán chỉ chấp nhận CASH hoặc BANK_TRANSFER |
| 166 | PAY_003 | Toast message | PAY_ERR_003 | Số tiền thu/chi không được vượt quá số công nợ hiện tại |
| 167 | PAY_004 | Toast message | PAY_ERR_004 | Chỉ có thể ghi sổ phiếu ở trạng thái DRAFT |
| 168 | PAY_005 | Toast message | PAY_ERR_005 | Số tiền giao dịch phải lớn hơn 0 |
| 169 | PAY_006 | Toast message | PAY_ERR_006 | Đối tác là bắt buộc |
| 170 | ST_001 | Toast message | ST_ERR_001 | Lỗi định dạng Serial Numbers. |
| 171 | ST_002 | Toast message | ST_ERR_002 | Chỉ được phép sửa phiếu khi ở trạng thái Lưu nháp. |
| 172 | OCR_001 | Toast message | OCR_ERR_001 | Không có AI provider nào được bật. Hãy cấu hình OPENAI_ENABLED hoặc GEMINI_ENABLED. |
| 173 | OCR_002 | Toast message | OCR_ERR_002 | Không thể trích xuất dữ liệu từ chứng từ: %s |
| 174 | OCR_003 | Toast message | OCR_ERR_003 | Mã quét không hợp lệ hoặc đã hết hạn. |
| 175 | INV_001 | Toast message | INV_ERR_001 | Đơn bán hàng này đã xuất kho đủ toàn bộ sản phẩm |
| 176 | INV_002 | Toast message | INV_ERR_002 | Chỉ có thể tạo phiếu xuất kho cho đơn hàng ĐÃ DUYỆT |
| 177 | INV_003 | Toast message | INV_ERR_003 | Trạng thái phiếu kho không hợp lệ |
| 178 | INV_004 | Toast message | INV_ERR_004 | Trạng thái phiếu nhập kho phải là lưu tạm |
| 179 | INV_005 | Toast message | INV_ERR_005 | Trạng thái phiếu xuất kho phải là lưu tạm |
| 180 | INV_006 | Toast message | INV_ERR_006 | Thuế VAT phải nằm trong khoảng từ 0%% đến 10%% |
| 181 | INV_007 | Toast message | INV_ERR_007 | Phiếu nhập kho không được có quantityOut |
| 182 | INV_008 | Toast message | INV_ERR_008 | Serial %s đang nằm trong một phiếu xuất nháp khác, vui lòng kiểm tra lại |
| 183 | INV_009 | Toast message | INV_ERR_009 | Serial %s không có sẵn trong kho (trạng thái: %s) |
| 184 | INV_010 | Toast message | INV_ERR_010 | Phiếu xuất kho không được có quantityIn |
| 185 | INV_011 | Toast message | INV_ERR_011 | Mã phiếu nhập kho đã tồn tại |
| 186 | INV_012 | Toast message | INV_ERR_012 | Mã phiếu xuất kho đã tồn tại |
| 187 | INV_013 | Toast message | INV_ERR_013 | Số lượng xuất lớn hơn số lượng tồn kho khả dụng, không thể xuất kho. (Đã bỏ qua các mặt hàng đang bị giữ chỗ cho đơn khác) |
| 188 | INV_014 | Toast message | INV_ERR_014 | Chỉ có thể cập nhật phiếu lưu tạm |
| 189 | INV_015 | Toast message | INV_ERR_015 | lines[%s].variantId la bat buoc |
| 190 | INV_016 | Toast message | INV_ERR_016 | Phiếu %s kho phải có ít nhất một dòng chi tiết |
| 191 | INV_017 | Toast message | INV_ERR_017 | docDate là bắt buộc |
| 192 | INV_018 | Toast message | INV_ERR_018 | warehouseId là bắt buộc |
| 193 | INV_019 | Toast message | INV_ERR_019 | Dữ liệu yêu cầu phiếu %s kho là bắt buộc |
| 194 | INV_020 | Toast message | INV_ERR_020 | Người tạo phiếu (createdBy) là bắt buộc |
| 195 | INV_021 | Toast message | INV_ERR_021 | ID phiếu nhập kho là bắt buộc |
| 196 | INV_022 | Toast message | INV_ERR_022 | ID phiếu xuất kho là bắt buộc |
| 197 | INV_023 | Toast message | INV_ERR_023 | Serial đã tồn tại: %s |
| 198 | INV_024 | Toast message | INV_ERR_024 | Serial %s không ở trạng thái IN_TRANSIT |
| 199 | INV_025 | Toast message | INV_ERR_025 | Serial da ton tai tren SKU khac: %s |
| 200 | INV_026 | Toast message | INV_ERR_026 | Sản phẩm quản lý serial phải có đúng %s serial |
| 201 | INV_027 | Toast message | INV_ERR_027 | Serial %s không còn tồn kho |
| 202 | INV_028 | Toast message | INV_ERR_028 | Serial không khả dụng để xuất kho |
| 203 | INV_029 | Toast message | INV_ERR_029 | Serial không nằm trong kho xuất |
| 204 | INV_030 | Toast message | INV_ERR_030 | Serial không thuộc SKU trên dòng xuất |
| 205 | INV_031 | Toast message | INV_ERR_031 | Mỗi dòng xuất serial phải có số lượng bằng 1 |
| 206 | INV_032 | Toast message | INV_ERR_032 | Sản phẩm quản lý serial, vui lòng quét serial của từng sản phẩm |
| 207 | INV_033 | Toast message | INV_ERR_033 | Serial chưa gắn SKU sản phẩm |
| 208 | INV_034 | Toast message | INV_ERR_034 | Mã serial tồn tại trên nhiều sản phẩm |
| 209 | INV_035 | Toast message | INV_ERR_035 | Mã quét là bắt buộc |
| 210 | INV_036 | Toast message | INV_ERR_036 | Serial %s đang nằm trong cấu hình PC, không thể xuất như linh kiện rời. |
| 211 | INV_037 | Toast message | INV_ERR_037 | Serial không nằm trong kho đang chọn |
| 212 | INV_038 | Toast message | INV_ERR_038 | Serial không khả dụng để xuất kho: %s |
| 213 | INV_039 | Toast message | INV_ERR_039 | Mục đích xuất kho không hợp lệ. Chỉ chấp nhận: SALES (Bán hàng), USAGE (Xuất sử dụng) hoặc ASSEMBLY (Xuất lắp ráp) |
| 214 | INV_040 | Toast message | INV_ERR_040 | Chỉ phiếu nhập kho lưu tạm mới có thể ghi sổ |
| 215 | INV_041 | Toast message | INV_ERR_041 | Số lượng xuất lớn hơn số lượng tồn kho cho sản phẩm %s, vui lòng điều chỉnh |
| 216 | INV_042 | Toast message | INV_ERR_042 | Sản phẩm SKU: %s có quản lý Serial. Vui lòng quét/nhập đúng %s mã serial trước khi ghi sổ. |
| 217 | INV_043 | Toast message | INV_ERR_043 | Serial %s không thuộc SKU này |
| 218 | INV_044 | Toast message | INV_ERR_044 | Serial %s không nằm trong kho xuất |
| 219 | INV_045 | Toast message | INV_ERR_045 | Serial %s không có sẵn trong kho (trạng thái hiện tại: %s) |
| 220 | INV_046 | Toast message | INV_ERR_046 | Chỉ phiếu xuất kho lưu tạm mới có thể ghi sổ |
| 221 | INV_047 | Toast message | INV_ERR_047 | Số lượng nhập kho (%s) vượt quá số lượng còn lại trong đơn mua hàng %s (tối đa %s) cho sản phẩm SKU: %s |
| 222 | INV_048 | Toast message | INV_ERR_048 | Số lượng xuất kho (%s) vượt quá số lượng còn lại trong đơn bán hàng %s (tối đa %s) cho sản phẩm SKU: %s |
| 223 | INV_049 | Toast message | INV_ERR_049 | Mã serial tồn tại trên nhiều sản phẩm, vui lòng chọn mẫu sản phẩm trước |
| 224 | PROD_001 | Toast message | PROD_ERR_001 | Gia tri ton khong duoc am. |
| 225 | PROD_002 | Toast message | PROD_ERR_002 | So luong ton khong duoc am. |
| 226 | PROD_003 | Toast message | PROD_ERR_003 | Gia ban khong duoc am. |
| 227 | PROD_004 | Toast message | PROD_ERR_004 | Don vi tinh la bat buoc. |
| 228 | PROD_005 | Toast message | PROD_ERR_005 | Danh muc la bat buoc. |
| 229 | PROD_006 | Toast message | PROD_ERR_006 | Gia von khong duoc am. |
| 230 | PROD_007 | Toast message | PROD_ERR_007 | San pham khong ton tai. |
| 231 | PROD_008 | Toast message | PROD_ERR_008 | Không thể xóa SKU '%s' vì đã có dữ liệu giao dịch phát sinh. Bạn có thể chọn 'Ngừng sử dụng' SKU. |
| 232 | PROD_009 | Toast message | PROD_ERR_009 | Sản phẩm phải có ít nhất một SKU. |
| 233 | PROD_010 | Toast message | PROD_ERR_010 | SKU không thuộc sản phẩm này. |
| 234 | PROD_011 | Toast message | PROD_ERR_011 | Barcode da ton tai. |
| 235 | PROD_012 | Toast message | PROD_ERR_012 | SKU da ton tai. |
| 236 | PROD_013 | Toast message | PROD_ERR_013 | SKU khong thuoc san pham nay. |
| 237 | PROD_014 | Toast message | PROD_ERR_014 | Khong the sinh du serial khong trung. Vui long thu lai. |
| 238 | PROD_015 | Toast message | PROD_ERR_015 | San pham khong theo doi serial. |
| 239 | PROD_016 | Toast message | PROD_ERR_016 | So luong serial phai tu 1 den 1000. |
| 240 | PROD_017 | Toast message | PROD_ERR_017 | Khong the xuat Excel san pham. |
| 241 | PROD_018 | Toast message | PROD_ERR_018 | Không thể xóa hàng hóa '%s' vì đã có dữ liệu giao dịch phát sinh trong hệ thống. Bạn có thể chọn 'Ngừng sử dụng' để ẩn hàng hóa. |
| 242 | PROD_019 | Toast message | PROD_ERR_019 | Mã hàng hóa '%s' đã tồn tại trên hệ thống. |
| 243 | PROD_020 | Toast message | PROD_ERR_020 | Mã hàng hóa '%s' đã tồn tại. |
| 244 | PO_001 | Toast message | PO_ERR_001 | Không thể hủy đơn ở trạng thái: %s |
| 245 | PO_002 | Toast message | PO_ERR_002 | Chỉ được duyệt đơn ở trạng thái Nháp. Trạng thái hiện tại: %s |
| 246 | PO_003 | Toast message | PO_ERR_003 | Hạn công nợ không được nhỏ hơn ngày lập đơn |
| 247 | PO_004 | Toast message | PO_ERR_004 | Chỉ được sửa đơn ở trạng thái Nháp. Trạng thái hiện tại: %s |
| 248 | PO_005 | Toast message | PO_ERR_005 | Mã đơn hàng '%s' đã tồn tại |
| 249 | PO_006 | Toast message | PO_ERR_006 | Đối tác này không phải nhà cung cấp |
| 250 | REP_001 | Toast message | REP_ERR_001 | quantity phải lớn hơn 0 |
| 251 | REP_002 | Toast message | REP_ERR_002 | actionType phải là ADD, REPLACE hoặc REMOVE |
| 252 | REP_003 | Toast message | REP_ERR_003 | componentVariantId là bắt buộc |
| 253 | REP_004 | Toast message | REP_ERR_004 | Ngày dự kiến không thể nhỏ hơn ngày tiếp nhận. |
| 254 | REP_005 | Toast message | REP_ERR_005 | productId là bắt buộc |
| 255 | REP_006 | Toast message | REP_ERR_006 | Serial %s đã tồn tại trong cấu hình hiện tại của PC %s. |
| 256 | REP_007 | Toast message | REP_ERR_007 | Serial %s không nằm trong cấu hình hiện tại của PC %s. |
| 257 | REP_008 | Toast message | REP_ERR_008 | Lỗi khi ghi sổ phiếu Scrap: %s |
| 258 | REP_009 | Toast message | REP_ERR_009 | Lỗi khi ghi sổ phiếu xuất linh kiện: %s |
| 259 | SO_001 | Toast message | SO_ERR_001 | Số tiền thanh toán vượt quá tổng giá trị đơn hàng |
| 260 | SO_002 | Toast message | SO_ERR_002 | Số tiền thanh toán phải lớn hơn 0 |
| 261 | SO_003 | Toast message | SO_ERR_003 | Không thể ghi nhận thanh toán cho đơn hàng đã hủy |
| 262 | SO_004 | Toast message | SO_ERR_004 | Khách hàng là bắt buộc |
| 263 | SO_005 | Toast message | SO_ERR_005 | Không thể hủy đơn hàng ở trạng thái: %s |
| 264 | SO_006 | Toast message | SO_ERR_006 | Chỉ được duyệt đơn hàng ở trạng thái Nháp. Trạng thái hiện tại: %s |
| 265 | SO_007 | Toast message | SO_ERR_007 | Hạn thanh toán không được nằm trong quá khứ |
| 266 | SO_008 | Toast message | SO_ERR_008 | Hạn thanh toán không được nhỏ hơn ngày lập đơn |
| 267 | SO_009 | Toast message | SO_ERR_009 | Chỉ được sửa đơn hàng ở trạng thái Nháp (DRAFT). Trạng thái hiện tại: %s |
| 268 | STK_001 | Toast message | STK_ERR_001 | Mã kiểm kê đã tồn tại: %s |
| 269 | STK_002 | Toast message | STK_ERR_002 | Phiếu kiểm kê phải có ít nhất một dòng |
| 270 | STK_003 | Toast message | STK_ERR_003 | Kho kiểm kê là bắt buộc |
| 271 | STK_004 | Toast message | STK_ERR_004 | Dữ liệu không hợp lệ |
| 272 | STK_005 | Toast message | STK_ERR_005 | Chỉ phiếu lưu tạm mới có thể xử lý chênh lệch |
| 273 | STK_006 | Toast message | STK_ERR_006 | Mã phiếu kiểm kê đã tồn tại |
| 274 | SYS_SET_001 | Toast message | SYS_SET_ERR_001 | Đổi mã Google OAuth2 thất bại. |
| 275 | VOICE_001 | Toast message | VOICE_ERR_001 | Gemini chưa được bật hoặc chưa cấu hình API key. |
| 276 | VOICE_002 | Toast message | VOICE_ERR_002 | OpenAI chưa được bật hoặc chưa cấu hình API key. |
| 277 | WARR_001 | Toast message | WARR_ERR_001 | Ma bao hanh da ton tai |
| 278 | WARR_002 | Toast message | WARR_ERR_002 | Trang thai bao hanh khong hop le |
| 279 | WARR_003 | Toast message | WARR_ERR_003 | Ngay het han khong duoc truoc ngay bat dau |
| 280 | WARR_004 | Toast message | WARR_ERR_004 | Ngay bat dau va ngay het han bao hanh la bat buoc |
| 281 | WARR_005 | Toast message | WARR_ERR_005 | Khach hang bao hanh la bat buoc |
| 282 | WARR_006 | Toast message | WARR_ERR_006 | Phai cung cap Serial hoac SKU va so luong bao hanh cho moi mat hang |
| 283 | WARR_007 | Toast message | WARR_ERR_007 | Phieu bao hanh phai co it nhat mot mat hang |
| 284 | WARR_008 | Toast message | WARR_ERR_008 | Du lieu bao hanh la bat buoc |
| 285 | WARR_009 | Toast message | WARR_ERR_009 | ID bao hanh la bat buoc |
