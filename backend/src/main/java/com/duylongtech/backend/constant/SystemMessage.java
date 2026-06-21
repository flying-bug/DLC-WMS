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

    // BOM & Warranty
    BOM_INSUFFICIENT_COMPONENTS("BOM01", "Không đủ số lượng linh kiện thành phần để lắp ráp"),
    WARR_OUT_OF_WARRANTY("WARR01", "Thiết bị đã hết hạn bảo hành"),

    // Warehouse
    WH_NOT_FOUND("WH01", "Không tìm thấy kho lưu trữ."),
    WH_CODE_EXISTS("WH02", "Mã kho đã tồn tại trên hệ thống."),
    WH_HAS_TRANSACTION("WH03", "Không thể xóa kho đã phát sinh giao dịch hoặc đang chứa linh kiện. Hệ thống đã tự động chuyển trạng thái kho này về ngừng hoạt động (INACTIVE)."),
    WH_OPTIMISTIC_LOCK("WH04", "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang để xem dữ liệu mới nhất."),

    // General Errors
    ACCESS_DENIED("SYS403", "Bạn không có quyền thực hiện thao tác này"),
    SESSION_EXPIRED("SYS401", "Phiên đăng nhập đã hết hạn"),
    INTERNAL_ERROR("SYS500", "Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên.");

    private final String code;
    private final String message;

    SystemMessage(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
