package com.duylongtech.backend.feature.report;

import java.util.Map;

/** Nhãn tiếng Việt cho các mã trong báo cáo (dùng khi xuất Excel; màn hình có bảng nhãn tương ứng ở frontend). */
final class ReportLabels {

    private static final Map<String, String> LEDGER_DOCUMENT_TYPES = Map.ofEntries(
            Map.entry("IN_PO", "Nhập mua hàng"),
            Map.entry("EX_SO", "Xuất bán hàng"),
            Map.entry("EX_USAGE", "Xuất sử dụng nội bộ"),
            Map.entry("IN_TRF", "Nhận chuyển kho"),
            Map.entry("EX_TRF", "Xuất chuyển kho"),
            Map.entry("IN_ADJ", "Nhập điều chỉnh kiểm kê"),
            Map.entry("EX_ADJ", "Xuất điều chỉnh kiểm kê"),
            Map.entry("IN_REPAIR", "Nhập thu hồi sửa chữa"),
            Map.entry("EX_REPAIR", "Xuất sửa chữa"),
            Map.entry("IN_BUILD", "Nhập lắp ráp / tháo dỡ"),
            Map.entry("EX_BUILD", "Xuất lắp ráp / tháo dỡ"),
            Map.entry("UNPOST_IN", "Bỏ ghi sổ phiếu nhập"),
            Map.entry("UNPOST_EX", "Bỏ ghi sổ phiếu xuất"));

    private static final Map<String, String> TRANSFER_STATUSES = Map.of(
            "DRAFT", "Nháp",
            "APPROVED", "Chờ xuất kho",
            "IN_TRANSIT", "Đang chuyển",
            "POSTED", "Hoàn thành",
            "CANCELLED", "Đã hủy");

    private ReportLabels() {
    }

    static String ledgerDocumentType(String code) {
        return code == null ? "" : LEDGER_DOCUMENT_TYPES.getOrDefault(code, code);
    }

    static String transferStatus(String status) {
        return status == null ? "" : TRANSFER_STATUSES.getOrDefault(status, status);
    }
}
