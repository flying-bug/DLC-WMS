package com.duylongtech.backend.constant;

import lombok.Getter;

@Getter
public enum SystemMessage {
    SUCCESS("MSG00", "Thành công"),
    NO_SEARCH_RESULT("MSG01", "Không tìm thấy kết quả tìm kiếm."),
    FIELD_REQUIRED("MSG02", "Trường thông tin là bắt buộc."),
    UPDATE_SUCCESS("MSG03", "Cập nhật dữ liệu thành công."),
    ADD_SUCCESS("MSG04", "Thêm mới dữ liệu thành công."),
    DELETE_SUCCESS("MSG05", "Xóa dữ liệu thành công."),
    INVALID_EMAIL("MSG06", "Email không đúng định dạng."),
    INVALID_PHONE("MSG07", "Số điện thoại không hợp lệ (phải đúng mạng viễn thông Việt Nam)."),
    EXCEED_MAX_LENGTH("MSG08", "Độ dài dữ liệu vượt quá giới hạn cho phép."),
    INVALID_FULL_NAME("MSG09", "Họ và tên phải có 2-100 ký tự và không chứa số hoặc ký tự đặc biệt."),
    
    // Auth & User
    LOGIN_FAILED("AUTH01", "Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại."),
    USER_NOT_FOUND("AUTH02", "Không tìm thấy tài khoản trong hệ thống."),
    USER_LOCKED("AUTH03", "Tài khoản đã bị khóa hoặc chưa được phê duyệt."),
    INVALID_OTP("AUTH04", "Mã OTP không chính xác."),
    EXPIRED_OTP("AUTH05", "Mã OTP đã hết hạn."),
    WRONG_PASSWORD("AUTH06", "Mật khẩu cũ không chính xác."),
    INVALID_GOOGLE_TOKEN("AUTH07", "Google Token không hợp lệ."),
    STAFF_ONLY_PERMISSION("AUTH08", "Chỉ tài khoản Nhân viên (STAFF) mới được phép phân quyền động."),

    INVALID_USER_STATUS("AUTH09", "Trạng thái tài khoản không hợp lệ."),
    CANNOT_LOCK_SELF("AUTH10", "Không thể tự khóa tài khoản đang đăng nhập."),
    USERNAME_EXISTS("AUTH11", "Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác."),
    EMAIL_EXISTS("AUTH12", "Email đã tồn tại. Vui lòng sử dụng email khác."),
    PHONE_EXISTS("AUTH13", "Số điện thoại đã được đăng ký cho tài khoản khác. Vui lòng sử dụng số điện thoại khác."),
    TOO_MANY_OTP_ATTEMPTS("AUTH14", "Bạn đã nhập sai OTP quá 5 lần. Mã OTP này đã bị vô hiệu hóa vì lý do bảo mật, vui lòng yêu cầu mã mới."),
    OTP_REQUEST_TOO_FAST("AUTH15", "Vui lòng chờ ít nhất 60 giây trước khi yêu cầu gửi lại mã OTP mới."),

    // Unit & Product
    UNIT_NOT_FOUND("UNIT01", "Không tìm thấy đơn vị tính."),
    UNIT_EXISTS("UNIT02", "Tên đơn vị tính đã tồn tại!"),
    PRODUCT_NOT_FOUND("PROD01", "Không tìm thấy hàng hóa."),
    PRODUCT_CODE_EXISTS("PROD02", "Mã hàng hóa đã tồn tại trên hệ thống."),
    PRODUCT_NOT_DELETEABLE("PROD03", "Không tìm thấy hàng hóa để xóa."),
    CATEGORY_NOT_FOUND("CAT01", "Không tìm thấy danh mục."),
    CATEGORY_CODE_EXISTS("CAT02", "Mã danh mục đã tồn tại trên hệ thống."),
    CATEGORY_NAME_EXISTS("CAT03", "Tên danh mục đã tồn tại trên hệ thống."),
    CATEGORY_HAS_PRODUCTS("CAT04", "Không thể xóa danh mục đang có hàng hóa liên kết."),
    CATEGORY_PARENT_NOT_FOUND("CAT05", "Không tìm thấy danh mục cha."),
    CATEGORY_INVALID_PARENT("CAT06", "Danh mục cha không hợp lệ."),

    // Inventory
    INV_DOC_EXISTS("INV01", "Mã phiếu xuất kho đã tồn tại"),
    INV_DOC_NOT_FOUND("INV02", "Không tìm thấy phiếu xuất kho"),
    INV_INVALID_STATE("INV03", "Trạng thái phiếu xuất kho không hợp lệ"),
    INV_NOT_ENOUGH_STOCK("INV04", "Không đủ tồn kho để thực hiện giao dịch"),
    INV_FIFO_ERROR("INV05", "Không đủ lớp giá trị tồn kho (cost layer) để xuất FIFO"),
    INV_MISSING_DATA("INV06", "Dữ liệu yêu cầu phiếu là bắt buộc"),
    INV_SERIAL_EXISTS("INV07", "Số Serial đã tồn tại trên hệ thống"),
    INV_SERIAL_NOT_FOUND("INV08", "Không tìm thấy số Serial trong kho chỉ định"),
    INV_SERIAL_MISSING("INV09", "Bắt buộc phải nhập danh sách Serial cho sản phẩm này"),
    INV_DIFF_WAREHOUSE_REQUIRED("INV10", "Kho nguồn và kho đích phải khác nhau"),
    INV_STOCKTAKE_ACTIVE("INV11", "Kho đang bị khóa do có phiếu kiểm kê đang xử lý"),

    // Supplier
    SUPPLIER_NOT_FOUND("SUP01", "Không tìm thấy nhà cung cấp."),
    SUPPLIER_CODE_EXISTS("SUP02", "Mã nhà cung cấp đã tồn tại trên hệ thống."),
    SUPPLIER_HAS_TRANSACTIONS("SUP03", "Nhà cung cấp đang có giao dịch liên kết, chỉ có thể vô hiệu hóa (chuyển sang Ngừng hoạt động)."),
    SUPPLIER_INVALID_TYPE("SUP04", "Loại nhà cung cấp không hợp lệ. Chỉ chấp nhận COMPANY hoặc INDIVIDUAL."),
    SUPPLIER_INVALID_STATUS("SUP05", "Trạng thái nhà cung cấp không hợp lệ. Chỉ chấp nhận APPROVED hoặc INACTIVE."),
    SUPPLIER_INVALID_GROUP_TYPE("SUP06", "Nhóm nhà cung cấp không hợp lệ. Chỉ chấp nhận: RETAIL, WHOLESALE, DISTRIBUTOR."),

    // Customer
    CUST_NOT_FOUND("CUST01", "Không tìm thấy khách hàng."),
    CUST_PHONE_EXISTS("CUST02", "Số điện thoại này đã được đăng ký cho khách hàng khác."),
    CUST_HAS_REPAIRING_WARRANTY("CUST03", "Khách hàng đang có thiết bị sửa chữa tại trung tâm, không thể vô hiệu hóa."),
    CUST_VIEW_SEED_DATA_DENIED("CUST04", "Không được phép xem chi tiết dữ liệu Khách vãng lai."),
    CUST_ALREADY_ACTIVE("CUST05", "Khách hàng đang ở trạng thái hoạt động, không cần kích hoạt lại."),
    CUST_CODE_EXISTS("CUST06", "Mã khách hàng đã tồn tại trên hệ thống."),

    // BOM & Warranty
    BOM_INSUFFICIENT_COMPONENTS("BOM01", "Không đủ số lượng linh kiện thành phần để lắp ráp"),
    WARR_OUT_OF_WARRANTY("WARR01", "Thiết bị đã hết hạn bảo hành"),

    // Warehouse
    WH_NOT_FOUND("WH01", "Không tìm thấy kho lưu trữ."),
    WH_CODE_EXISTS("WH02", "Mã kho đã tồn tại trên hệ thống."),
    WH_HAS_TRANSACTION("WH03", "Không thể xóa kho đã phát sinh giao dịch hoặc đang chứa linh kiện. Hệ thống đã tự động chuyển trạng thái kho này về ngừng hoạt động (INACTIVE)."),
    WH_OPTIMISTIC_LOCK("WH04", "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang để xem dữ liệu mới nhất."),

    // Warehouse Staff
    WH_STAFF_NOT_FOUND("WHS01", "Không tìm thấy nhân viên trong kho chỉ định."),
    WH_STAFF_HAS_PENDING_DOCS("WHS02", "Nhân viên đang là người tạo chứng từ chưa hoàn tất. Vui lòng xử lý chứng từ trước khi thu hồi quyền."),
    WH_STAFF_CANNOT_REVOKE_SELF("WHS03", "Không thể tự thu hồi quyền của chính mình tại kho đang làm việc."),
    WH_STAFF_INVALID_ROLE("WHS04", "Vai trò gán không hợp lệ. Chỉ được phép gán các vai trò thuộc phân hệ kho."),

    // Brand
    BRAND_NOT_FOUND("BRND01", "Không tìm thấy thương hiệu."),
    BRAND_CODE_EXISTS("BRND02", "Mã thương hiệu đã tồn tại trên hệ thống."),
    BRAND_CODE_NOT_MODIFIABLE("BRND03", "Mã thương hiệu không thể thay đổi sau khi tạo."),
    BRAND_INVALID_STATUS("BRND04", "Trạng thái thương hiệu không hợp lệ."),

    // Assembly & Disassembly
    ASM_INVALID_COST_PCT("ASM01", "Tổng tỷ lệ phân bổ giá vốn của các linh kiện phải bằng 100%."),
    ASM_ORDER_LOCKED("ASM02", "Không thể sửa Định mức lắp ráp vì đang có Lệnh đang sử dụng định mức này."),
    ASM_INSUFFICIENT_INVENTORY("ASM03", "Không đủ tồn kho thành phẩm hoặc linh kiện để thực hiện lệnh."),
    ASM_HAS_POSTED_DOCS("ASM04", "Không thể Hủy lệnh vì đã có chứng từ kho (Phiếu Nhập/Xuất) liên quan."),

    // Repair Management
    REP_NOT_FOUND("REP01", "Không tìm thấy lệnh sửa chữa."),
    REP_CODE_EXISTS("REP02", "Mã lệnh sửa chữa đã tồn tại trên hệ thống."),
    REP_INVALID_STATUS_TRANSITION("REP03", "Chuyển trạng thái lệnh sửa chữa không hợp lệ."),
    REP_PARTNER_REQUIRED("REP04", "Lệnh sửa chữa phải có thông tin khách hàng."),
    REP_INSUFFICIENT_INVENTORY("REP05", "Không đủ tồn kho linh kiện để xác nhận lệnh."),
    REP_LINE_NOT_FOUND("REP06", "Không tìm thấy dòng linh kiện sửa chữa."),
    REP_FEE_NOT_FOUND("REP07", "Không tìm thấy dòng phí dịch vụ."),
    REP_CANNOT_MODIFY("REP08", "Lệnh sửa chữa không thể chỉnh sửa ở trạng thái này."),
    REP_CANNOT_CANCEL("REP09", "Không thể hủy lệnh đã hoàn tất (DONE)."),
    REP_WARRANTY_PRICE_INVALID("REP10", "Linh kiện/phí dịch vụ bảo hành phải có giá bằng 0."),
    REP_SERIAL_REQUIRED("REP11", "Linh kiện '%s' quản lý theo Serial Number nhưng chưa được quét mã serial. Vui lòng quét serial trước khi hoàn tất."),

    // General Errors
    ACCESS_DENIED("SYS403", "Bạn không có quyền thực hiện thao tác này"),
    SESSION_EXPIRED("SYS401", "Phiên đăng nhập đã hết hạn"),
    INTERNAL_ERROR("SYS500", "Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên."),

    // Assembly Order
    ASM_ERR_001("ASM_001", "Lệnh không có thành phẩm"),
    ASM_ERR_002("ASM_002", "Tính năng thực thi quét mã vạch hiện tại chỉ hỗ trợ Lắp ráp và Tháo dỡ"),
    ASM_ERR_003("ASM_003", "Chỉ có thể thực thi lệnh đã được duyệt"),
    ASM_ERR_004("ASM_004", "Serial %s đang nằm trong cấu hình PC, không thể lắp vào PC khác."),
    ASM_ERR_005("ASM_005", "Serial linh kiện là bắt buộc"),
    ASM_ERR_006("ASM_006", "Cấu hình serial đã có lịch sử sửa chữa, không thể ghi đè toàn bộ."),
    ASM_ERR_007("ASM_007", "Serial thành phẩm là bắt buộc"),
    ASM_ERR_008("ASM_008", "Trạng thái lệnh không hợp lệ"),
    ASM_ERR_009("ASM_009", "Trạng thái lệnh phải là DRAFT hoặc SUBMITTED"),
    ASM_ERR_010("ASM_010", "Loại lệnh không hợp lệ"),
    ASM_ERR_011("ASM_011", "Trạng thái cấu hình không hợp lệ"),
    ASM_ERR_012("ASM_012", "Mã cấu hình đã tồn tại"),
    ASM_ERR_013("ASM_013", "Mã lệnh lắp ráp/tháo dỡ đã tồn tại"),
    ASM_ERR_014("ASM_014", "Chỉ có thể cập nhật lệnh DRAFT hoặc SUBMITTED"),
    ASM_ERR_015("ASM_015", "Sản phẩm thành phẩm của cấu hình chưa có SKU"),
    ASM_ERR_016("ASM_016", "ID lệnh là bắt buộc"),
    ASM_ERR_017("ASM_017", "Cấu hình chưa có linh kiện"),
    ASM_ERR_018("ASM_018", "Chỉ được tạo lệnh từ cấu hình đã duyệt"),
    ASM_ERR_019("ASM_019", "Định mức dòng %s phải là số nguyên"),
    ASM_ERR_020("ASM_020", "Định mức dòng %s phải lớn hơn 0"),
    ASM_ERR_021("ASM_021", "Linh kiện dòng %s là bắt buộc"),
    ASM_ERR_022("ASM_022", "Cấu hình phải có ít nhất một linh kiện"),
    ASM_ERR_023("ASM_023", "Phiên bản cấu hình phải lớn hơn 0"),
    ASM_ERR_024("ASM_024", "Sản phẩm thành phẩm là bắt buộc"),
    ASM_ERR_025("ASM_025", "Dữ liệu Cấu hình là bắt buộc"),
    ASM_ERR_026("ASM_026", "Người tạo là bắt buộc"),
    ASM_ERR_027("ASM_027", "Ngày thực hiện là bắt buộc"),
    ASM_ERR_028("ASM_028", "Số lượng phải lớn hơn 0"),
    ASM_ERR_029("ASM_029", "Kho là bắt buộc"),
    ASM_ERR_030("ASM_030", "Cấu hình là bắt buộc"),
    ASM_ERR_031("ASM_031", "Dữ liệu lệnh lắp ráp/tháo dỡ là bắt buộc"),
    ASM_ERR_032("ASM_032", "Loại phiếu không hợp lệ"),
    ASM_ERR_033("ASM_033", "Chỉ có thể tạo phiếu kho cho lệnh đã hoàn thành hoặc được duyệt"),
    ASM_ERR_034("ASM_034", "Lệnh đã hoàn thành, không thể sửa ghi chú"),
    ASM_ERR_035("ASM_035", "Chưa hoàn tất xuất/nhập đủ số lượng yêu cầu để hoàn thành lệnh."),
    ASM_ERR_036("ASM_036", "Chưa gắn đủ Serial thành phẩm. Vui lòng vào mục Cấu hình Serial để hoàn tất."),
    ASM_ERR_037("ASM_037", "Các phiếu xuất và nhập kho liên kết đang lưu nháp phải được ghi sổ hoặc hủy bỏ."),
    ASM_ERR_038("ASM_038", "Từ ngày không được lớn hơn đến ngày"),
    ASM_ERR_039("ASM_039", "Cấu hình này trùng với cấu hình %s"),

    // Auth
    AUTH_ERR_001("AUTH_001", "Google Login Failed: %s"),

    // Backup
    BACKUP_ERR_001("BACKUP_001", "File không tồn tại trên disk: %s"),
    BACKUP_ERR_002("BACKUP_002", "Restore thất bại (exit %s): %s"),
    BACKUP_ERR_003("BACKUP_003", "File backup không tồn tại: %s"),
    BACKUP_ERR_004("BACKUP_004", "File không tồn tại: %s"),
    BACKUP_ERR_005("BACKUP_005", "mysqldump thất bại (exit %s): %s"),
    BACKUP_ERR_006("BACKUP_006", "Lỗi khi khởi chạy tiến trình sao lưu: %s"),
    BACKUP_ERR_007("BACKUP_007", "Lỗi: Không tìm thấy công cụ 'mysqldump' trên máy chủ. Vui lòng cài đặt MySQL/MariaDB Tools hoặc kiểm tra biến môi trường PATH."),

    // Cloudinary
    CLOUD_ERR_001("CLOUD_001", "Chi ho tro anh (JPG, PNG, WEBP) hoac PDF."),
    CLOUD_ERR_002("CLOUD_002", "File khong duoc vuot qua 5MB."),
    CLOUD_ERR_003("CLOUD_003", "Vui long chon file de tai len."),
    CLOUD_ERR_004("CLOUD_004", "Chi ho tro anh JPG, PNG, WEBP hoac GIF."),
    CLOUD_ERR_005("CLOUD_005", "Anh khong duoc vuot qua 5MB."),
    CLOUD_ERR_006("CLOUD_006", "Vui long chon anh de tai len."),
    CLOUD_ERR_007("CLOUD_007", "Khong the tai tai lieu len Cloudinary."),
    CLOUD_ERR_008("CLOUD_008", "Khong the tai anh len Cloudinary."),

    // Customer
    CUST_ERR_001("CUST_001", "Không thể đọc file Excel: %s"),
    CUST_ERR_002("CUST_002", "Lỗi khi tạo file Excel: %s"),
    CUST_ERR_003("CUST_003", "Lỗi khi tạo file Excel Template: %s"),

    // Checkout
    CHK_ERR_001("CHK_001", "Khách nợ phải có đầy đủ thông tin khách hàng, không được dùng khách vãng lai"),
    CHK_ERR_002("CHK_002", "Số tiền thanh toán vượt quá tổng đơn hàng"),
    CHK_ERR_003("CHK_003", "Số tiền thanh toán không được âm"),
    CHK_ERR_004("CHK_004", "Khách hàng đã ngừng hoạt động, không thể tạo đơn bán hàng"),
    CHK_ERR_005("CHK_005", "Khách hàng không tồn tại"),
    CHK_ERR_006("CHK_006", "Dòng %s: Đơn giá không được âm"),
    CHK_ERR_007("CHK_007", "Dòng %s: Số lượng phải lớn hơn 0"),
    CHK_ERR_008("CHK_008", "Phải có ít nhất 1 dòng sản phẩm"),
    CHK_ERR_009("CHK_009", "Dữ liệu bán hàng trực tiếp không hợp lệ"),

    // Email
    EMAIL_ERR_001("EMAIL_001", "Lỗi khi gửi email báo giá: %s"),
    EMAIL_ERR_002("EMAIL_002", "Email người nhận không được để trống"),
    EMAIL_ERR_003("EMAIL_003", "Lỗi khi gửi email tài khoản nhân viên: %s"),
    EMAIL_ERR_004("EMAIL_004", "Lỗi khi gửi email: %s"),

    // Google Drive
    DRIVE_ERR_001("DRIVE_001", "Thư mục Google Drive (ID: %s) chưa được Chia sẻ (Share) cho email Service Account: [%s]. Vui lòng mở Google Drive -> Chuột phải vào Thư mục -> Chia sẻ cho email [%s] quyền Editor."),
    DRIVE_ERR_002("DRIVE_002", "Chưa nhập Google Drive Folder ID. Vui lòng vào System Settings nhập Folder ID và nhấn 'Lưu tất cả'."),
    DRIVE_ERR_003("DRIVE_003", "Cần cấu hình Google Drive (Service Account JSON hoặc OAuth2 Refresh Token)."),

    // Payment
    PAY_ERR_001("PAY_001", "Trạng thái phiếu thu/chi chỉ chấp nhận DRAFT hoặc POSTED"),
    PAY_ERR_002("PAY_002", "Phương thức thanh toán chỉ chấp nhận CASH hoặc BANK_TRANSFER"),
    PAY_ERR_003("PAY_003", "Số tiền thu/chi không được vượt quá số công nợ hiện tại"),
    PAY_ERR_004("PAY_004", "Chỉ có thể ghi sổ phiếu ở trạng thái DRAFT"),
    PAY_ERR_005("PAY_005", "Số tiền giao dịch phải lớn hơn 0"),
    PAY_ERR_006("PAY_006", "Đối tác là bắt buộc"),

    // Stock Transfer
    ST_ERR_001("ST_001", "Lỗi định dạng Serial Numbers."),
    ST_ERR_002("ST_002", "Chỉ được phép sửa phiếu khi ở trạng thái Lưu nháp."),

    // OCR
    OCR_ERR_001("OCR_001", "Không có AI provider nào được bật. Hãy cấu hình OPENAI_ENABLED hoặc GEMINI_ENABLED."),
    OCR_ERR_002("OCR_002", "Không thể trích xuất dữ liệu từ chứng từ: %s"),
    OCR_ERR_003("OCR_003", "Mã quét không hợp lệ hoặc đã hết hạn."),

    // Inventory
    INV_ERR_001("INV_001", "Đơn bán hàng này đã xuất kho đủ toàn bộ sản phẩm"),
    INV_ERR_002("INV_002", "Chỉ có thể tạo phiếu xuất kho cho đơn hàng ĐÃ DUYỆT"),
    INV_ERR_003("INV_003", "Trạng thái phiếu kho không hợp lệ"),
    INV_ERR_004("INV_004", "Trạng thái phiếu nhập kho phải là lưu tạm"),
    INV_ERR_005("INV_005", "Trạng thái phiếu xuất kho phải là lưu tạm"),
    INV_ERR_006("INV_006", "Thuế VAT phải nằm trong khoảng từ 0%% đến 10%%"),
    INV_ERR_007("INV_007", "Phiếu nhập kho không được có quantityOut"),
    INV_ERR_008("INV_008", "Serial %s đang nằm trong một phiếu xuất nháp khác, vui lòng kiểm tra lại"),
    INV_ERR_009("INV_009", "Serial %s không có sẵn trong kho (trạng thái: %s)"),
    INV_ERR_010("INV_010", "Phiếu xuất kho không được có quantityIn"),
    INV_ERR_011("INV_011", "Mã phiếu nhập kho đã tồn tại"),
    INV_ERR_012("INV_012", "Mã phiếu xuất kho đã tồn tại"),
    INV_ERR_013("INV_013", "Số lượng xuất lớn hơn số lượng tồn kho khả dụng, không thể xuất kho. (Đã bỏ qua các mặt hàng đang bị giữ chỗ cho đơn khác)"),
    INV_ERR_014("INV_014", "Chỉ có thể cập nhật phiếu lưu tạm"),
    INV_ERR_015("INV_015", "lines[%s].variantId la bat buoc"),
    INV_ERR_016("INV_016", "Phiếu %s kho phải có ít nhất một dòng chi tiết"),
    INV_ERR_017("INV_017", "docDate là bắt buộc"),
    INV_ERR_018("INV_018", "warehouseId là bắt buộc"),
    INV_ERR_019("INV_019", "Dữ liệu yêu cầu phiếu %s kho là bắt buộc"),
    INV_ERR_020("INV_020", "Người tạo phiếu (createdBy) là bắt buộc"),
    INV_ERR_021("INV_021", "ID phiếu nhập kho là bắt buộc"),
    INV_ERR_022("INV_022", "ID phiếu xuất kho là bắt buộc"),
    INV_ERR_023("INV_023", "Serial đã tồn tại: %s"),
    INV_ERR_024("INV_024", "Serial %s không ở trạng thái IN_TRANSIT"),
    INV_ERR_025("INV_025", "Serial da ton tai tren SKU khac: %s"),
    INV_ERR_026("INV_026", "Sản phẩm quản lý serial phải có đúng %s serial"),
    INV_ERR_027("INV_027", "Serial %s không còn tồn kho"),
    INV_ERR_028("INV_028", "Serial không khả dụng để xuất kho"),
    INV_ERR_029("INV_029", "Serial không nằm trong kho xuất"),
    INV_ERR_030("INV_030", "Serial không thuộc SKU trên dòng xuất"),
    INV_ERR_031("INV_031", "Mỗi dòng xuất serial phải có số lượng bằng 1"),
    INV_ERR_032("INV_032", "Sản phẩm quản lý serial, vui lòng quét serial của từng sản phẩm"),
    INV_ERR_033("INV_033", "Serial chưa gắn SKU sản phẩm"),
    INV_ERR_034("INV_034", "Mã serial tồn tại trên nhiều sản phẩm"),
    INV_ERR_035("INV_035", "Mã quét là bắt buộc"),
    INV_ERR_036("INV_036", "Serial %s đang nằm trong cấu hình PC, không thể xuất như linh kiện rời."),
    INV_ERR_037("INV_037", "Serial không nằm trong kho đang chọn"),
    INV_ERR_038("INV_038", "Serial không khả dụng để xuất kho: %s"),
    INV_ERR_039("INV_039", "Mục đích xuất kho không hợp lệ. Chỉ chấp nhận: SALES (Bán hàng), USAGE (Xuất sử dụng) hoặc ASSEMBLY (Xuất lắp ráp)"),
    INV_ERR_040("INV_040", "Chỉ phiếu nhập kho lưu tạm mới có thể ghi sổ"),
    INV_ERR_041("INV_041", "Số lượng xuất lớn hơn số lượng tồn kho cho sản phẩm %s, vui lòng điều chỉnh"),
    INV_ERR_042("INV_042", "Sản phẩm SKU: %s có quản lý Serial. Vui lòng quét/nhập đúng %s mã serial trước khi ghi sổ."),
    INV_ERR_043("INV_043", "Serial %s không thuộc SKU này"),
    INV_ERR_044("INV_044", "Serial %s không nằm trong kho xuất"),
    INV_ERR_045("INV_045", "Serial %s không có sẵn trong kho (trạng thái hiện tại: %s)"),
    INV_ERR_046("INV_046", "Chỉ phiếu xuất kho lưu tạm mới có thể ghi sổ"),
    INV_ERR_047("INV_047", "Số lượng nhập kho (%s) vượt quá số lượng còn lại trong đơn mua hàng %s (tối đa %s) cho sản phẩm SKU: %s"),
    INV_ERR_048("INV_048", "Số lượng xuất kho (%s) vượt quá số lượng còn lại trong đơn bán hàng %s (tối đa %s) cho sản phẩm SKU: %s"),
    INV_ERR_049("INV_049", "Mã serial tồn tại trên nhiều sản phẩm, vui lòng chọn mẫu sản phẩm trước"),

    // Product
    PROD_ERR_001("PROD_001", "Gia tri ton khong duoc am."),
    PROD_ERR_002("PROD_002", "So luong ton khong duoc am."),
    PROD_ERR_003("PROD_003", "Gia ban khong duoc am."),
    PROD_ERR_004("PROD_004", "Don vi tinh la bat buoc."),
    PROD_ERR_005("PROD_005", "Danh muc la bat buoc."),
    PROD_ERR_006("PROD_006", "Gia von khong duoc am."),
    PROD_ERR_007("PROD_007", "San pham khong ton tai."),
    PROD_ERR_008("PROD_008", "Không thể xóa SKU '%s' vì đã có dữ liệu giao dịch phát sinh. Bạn có thể chọn 'Ngừng sử dụng' SKU."),
    PROD_ERR_009("PROD_009", "Sản phẩm phải có ít nhất một SKU."),
    PROD_ERR_010("PROD_010", "SKU không thuộc sản phẩm này."),
    PROD_ERR_011("PROD_011", "Barcode da ton tai."),
    PROD_ERR_012("PROD_012", "SKU da ton tai."),
    PROD_ERR_013("PROD_013", "SKU khong thuoc san pham nay."),
    PROD_ERR_014("PROD_014", "Khong the sinh du serial khong trung. Vui long thu lai."),
    PROD_ERR_015("PROD_015", "San pham khong theo doi serial."),
    PROD_ERR_016("PROD_016", "So luong serial phai tu 1 den 1000."),
    PROD_ERR_017("PROD_017", "Khong the xuat Excel san pham."),
    PROD_ERR_018("PROD_018", "Không thể xóa hàng hóa '%s' vì đã có dữ liệu giao dịch phát sinh trong hệ thống. Bạn có thể chọn 'Ngừng sử dụng' để ẩn hàng hóa."),
    PROD_ERR_019("PROD_019", "Mã hàng hóa '%s' đã tồn tại trên hệ thống."),
    PROD_ERR_020("PROD_020", "Mã hàng hóa '%s' đã tồn tại."),

    // Purchase Order
    PO_ERR_001("PO_001", "Không thể hủy đơn ở trạng thái: %s"),
    PO_ERR_002("PO_002", "Chỉ được duyệt đơn ở trạng thái Nháp. Trạng thái hiện tại: %s"),
    PO_ERR_003("PO_003", "Hạn công nợ không được nhỏ hơn ngày lập đơn"),
    PO_ERR_004("PO_004", "Chỉ được sửa đơn ở trạng thái Nháp. Trạng thái hiện tại: %s"),
    PO_ERR_005("PO_005", "Mã đơn hàng '%s' đã tồn tại"),
    PO_ERR_006("PO_006", "Đối tác này không phải nhà cung cấp"),

    // Repair
    REP_ERR_001("REP_001", "quantity phải lớn hơn 0"),
    REP_ERR_002("REP_002", "actionType phải là ADD, REPLACE hoặc REMOVE"),
    REP_ERR_003("REP_003", "componentVariantId là bắt buộc"),
    REP_ERR_004("REP_004", "Ngày dự kiến không thể nhỏ hơn ngày tiếp nhận."),
    REP_ERR_005("REP_005", "productId là bắt buộc"),
    REP_ERR_006("REP_006", "Serial %s đã tồn tại trong cấu hình hiện tại của PC %s."),
    REP_ERR_007("REP_007", "Serial %s không nằm trong cấu hình hiện tại của PC %s."),
    REP_ERR_008("REP_008", "Lỗi khi ghi sổ phiếu Scrap: %s"),
    REP_ERR_009("REP_009", "Lỗi khi ghi sổ phiếu xuất linh kiện: %s"),

    // Sales Order
    SO_ERR_001("SO_001", "Số tiền thanh toán vượt quá tổng giá trị đơn hàng"),
    SO_ERR_002("SO_002", "Số tiền thanh toán phải lớn hơn 0"),
    SO_ERR_003("SO_003", "Không thể ghi nhận thanh toán cho đơn hàng đã hủy"),
    SO_ERR_004("SO_004", "Khách hàng là bắt buộc"),
    SO_ERR_005("SO_005", "Không thể hủy đơn hàng ở trạng thái: %s"),
    SO_ERR_006("SO_006", "Chỉ được duyệt đơn hàng ở trạng thái Nháp. Trạng thái hiện tại: %s"),
    SO_ERR_007("SO_007", "Hạn thanh toán không được nằm trong quá khứ"),
    SO_ERR_008("SO_008", "Hạn thanh toán không được nhỏ hơn ngày lập đơn"),
    SO_ERR_009("SO_009", "Chỉ được sửa đơn hàng ở trạng thái Nháp (DRAFT). Trạng thái hiện tại: %s"),

    // Stocktake
    STK_ERR_001("STK_001", "Mã kiểm kê đã tồn tại: %s"),
    STK_ERR_002("STK_002", "Phiếu kiểm kê phải có ít nhất một dòng"),
    STK_ERR_003("STK_003", "Kho kiểm kê là bắt buộc"),
    STK_ERR_004("STK_004", "Dữ liệu không hợp lệ"),
    STK_ERR_005("STK_005", "Chỉ phiếu lưu tạm mới có thể xử lý chênh lệch"),
    STK_ERR_006("STK_006", "Mã phiếu kiểm kê đã tồn tại"),

    // System Settings
    SYS_SET_ERR_001("SYS_SET_001", "Đổi mã Google OAuth2 thất bại."),

    // Voice Command
    VOICE_ERR_001("VOICE_001", "Gemini chưa được bật hoặc chưa cấu hình API key."),
    VOICE_ERR_002("VOICE_002", "OpenAI chưa được bật hoặc chưa cấu hình API key."),

    // Warranty
    WARR_ERR_001("WARR_001", "Ma bao hanh da ton tai"),
    WARR_ERR_002("WARR_002", "Trang thai bao hanh khong hop le"),
    WARR_ERR_003("WARR_003", "Ngay het han khong duoc truoc ngay bat dau"),
    WARR_ERR_004("WARR_004", "Ngay bat dau va ngay het han bao hanh la bat buoc"),
    WARR_ERR_005("WARR_005", "Khach hang bao hanh la bat buoc"),
    WARR_ERR_006("WARR_006", "Phai cung cap Serial hoac SKU va so luong bao hanh cho moi mat hang"),
    WARR_ERR_007("WARR_007", "Phieu bao hanh phai co it nhat mot mat hang"),
    WARR_ERR_008("WARR_008", "Du lieu bao hanh la bat buoc"),
    WARR_ERR_009("WARR_009", "ID bao hanh la bat buoc");

    private final String code;
    private final String message;

    SystemMessage(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
