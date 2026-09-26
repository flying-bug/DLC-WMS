package com.duylongtech.backend.feature.ai.service;

import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Hiểu điều kiện lọc trong câu hỏi tra cứu chứng từ (phiếu nhập/xuất, đơn mua/bán): trạng thái ("nháp", "đã ghi sổ",
 * "đã hủy"...) và khoảng thời gian ("hôm nay", "tháng này"...). Trước đây các cụm này bị coi là từ khóa tìm kiếm nên
 * "phiếu xuất kho đã ghi sổ" hay "phiếu xuất kho hôm nay" luôn ra 0 phiếu.
 *
 */
record AiDocumentQuery(StatusFilter status, LocalDate fromDate, LocalDate toDate, String periodLabel, int limit) {

    enum StatusFilter {
        DRAFT("nháp / lưu tạm"),
        PENDING("chờ duyệt"),
        APPROVED("đã duyệt"),
        POSTED("đã ghi sổ"),
        NOT_POSTED("chưa ghi sổ"),
        CANCELLED("đã hủy");

        final String label;

        StatusFilter(String label) {
            this.label = label;
        }
    }

    /**
     * @param raw        câu hỏi gốc (còn dấu): "nháp" và "nhập" chỉ phân biệt được khi còn dấu
     * @param normalized câu hỏi đã bỏ dấu, chữ thường
     */
    static AiDocumentQuery parse(String raw, String normalized, LocalDate today) {
        String rawLower = raw == null ? ""
                : Normalizer.normalize(raw, Normalizer.Form.NFC).toLowerCase(Locale.forLanguageTag("vi"));
        String n = normalized == null ? "" : normalized;
        return new AiDocumentQuery(parseStatus(rawLower, n), rangeStart(n, today), rangeEnd(n, today), periodLabel(n), parseLimit(n));
    }

    private static int parseLimit(String n) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)\\b(\\d+)\\s+(đơn|phiếu|dòng|kết quả|cái|bản ghi)\\b").matcher(n);
        if (m.find()) {
            try {
                int parsed = Integer.parseInt(m.group(1));
                if (parsed > 0 && parsed <= 50) return parsed;
            } catch (Exception ignored) {}
        }
        if (AiIntentRouter.has(n, "moi nhat", "gan nhat", "cuoi cung", "vua roi", "gan day nhat")) {
            return 1;
        }
        return 8; // default
    }

    boolean hasFilter() {
        return status != null || fromDate != null;
    }

    boolean matchesDate(LocalDate date) {
        if (fromDate == null) {
            return true;
        }
        return date != null && !date.isBefore(fromDate) && !date.isAfter(toDate);
    }

    /** Lọc trạng thái phiếu nhập/xuất kho. */
    boolean matchesInventoryStatus(String code) {
        if (status == null) {
            return true;
        }
        return switch (status) {
            case DRAFT -> "DRAFT".equals(code);
            case PENDING -> Set.of("DRAFT", "SUBMITTED", "PENDING_APPROVAL").contains(code);
            case APPROVED -> "APPROVED".equals(code);
            case POSTED -> "POSTED".equals(code);
            case NOT_POSTED -> !Set.of("POSTED", "CANCELLED", "CANCELED").contains(code);
            case CANCELLED -> Set.of("CANCELLED", "CANCELED").contains(code);
        };
    }

    /** Lọc trạng thái đơn mua / đơn bán (DRAFT -> APPROVED -> POSTED, hoặc CANCELLED). */
    boolean matchesOrderStatus(String code) {
        if (status == null) {
            return true;
        }
        return switch (status) {
            case DRAFT -> "DRAFT".equals(code);
            case PENDING -> Set.of("DRAFT", "SUBMITTED", "PENDING_APPROVAL").contains(code);
            case APPROVED -> "APPROVED".equals(code);
            case POSTED -> Set.of("POSTED", "COMPLETED").contains(code);
            case NOT_POSTED -> !Set.of("POSTED", "COMPLETED", "CANCELLED", "CANCELED").contains(code);
            case CANCELLED -> Set.of("CANCELLED", "CANCELED").contains(code);
        };
    }

    /** Mô tả điều kiện lọc để ghi vào câu trả lời, VD: " đã ghi sổ trong tháng này". */
    String describe() {
        StringBuilder text = new StringBuilder();
        if (status != null) {
            text.append(' ').append(status.label);
        }
        if (periodLabel != null) {
            text.append(' ').append(periodLabel);
        }
        return text.toString();
    }

    private static StatusFilter parseStatus(String rawLower, String n) {
        if (AiIntentRouter.has(n, "da huy", "bi huy", "huy bo", "cancelled", "canceled")) {
            return StatusFilter.CANCELLED;
        }
        if (AiIntentRouter.has(n, "chua ghi so", "chua xuat", "chua nhap kho", "chua hoan thanh", "dang mo")) {
            return StatusFilter.NOT_POSTED;
        }
        if (AiIntentRouter.has(n, "cho duyet", "cho phe duyet", "pending")) {
            return StatusFilter.PENDING;
        }
        if (AiIntentRouter.has(n, "da duyet", "cho xuat kho", "cho nhap kho", "cho xuat", "approved")) {
            return StatusFilter.APPROVED;
        }
        if (AiIntentRouter.has(n, "da ghi so", "ghi so", "hoan thanh", "hoan tat", "da xuat", "posted")
                || rawLower.contains("đã nhập")) {
            return StatusFilter.POSTED;
        }
        if (rawLower.contains("nháp") || AiIntentRouter.has(n, "luu tam", "draft")) {
            return StatusFilter.DRAFT;
        }
        return null;
    }

    private static LocalDate rangeStart(String n, LocalDate today) {
        if (AiIntentRouter.has(n, "hom nay")) return today;
        if (AiIntentRouter.has(n, "hom qua")) return today.minusDays(1);
        if (AiIntentRouter.has(n, "tuan truoc")) return today.with(DayOfWeek.MONDAY).minusWeeks(1);
        if (AiIntentRouter.has(n, "tuan nay")) return today.with(DayOfWeek.MONDAY);
        if (AiIntentRouter.has(n, "7 ngay", "tuan qua")) return today.minusDays(6);
        if (AiIntentRouter.has(n, "thang truoc")) return today.withDayOfMonth(1).minusMonths(1);
        if (AiIntentRouter.has(n, "thang nay")) return today.withDayOfMonth(1);
        if (AiIntentRouter.has(n, "30 ngay")) return today.minusDays(29);
        if (AiIntentRouter.has(n, "nam nay")) return today.withDayOfYear(1);
        return null;
    }

    private static LocalDate rangeEnd(String n, LocalDate today) {
        if (AiIntentRouter.has(n, "hom nay")) return today;
        if (AiIntentRouter.has(n, "hom qua")) return today.minusDays(1);
        if (AiIntentRouter.has(n, "tuan truoc")) return today.with(DayOfWeek.MONDAY).minusDays(1);
        if (AiIntentRouter.has(n, "thang truoc")) return today.withDayOfMonth(1).minusDays(1);
        return rangeStart(n, today) == null ? null : today;
    }

    private static String periodLabel(String n) {
        Map<String, String> labels = Map.of(
                "hom nay", "trong hôm nay",
                "hom qua", "trong hôm qua",
                "tuan truoc", "trong tuần trước",
                "tuan nay", "trong tuần này",
                "thang truoc", "trong tháng trước",
                "thang nay", "trong tháng này",
                "nam nay", "trong năm nay");
        for (String key : new String[] { "hom nay", "hom qua", "tuan truoc", "tuan nay", "thang truoc", "thang nay", "nam nay" }) {
            if (AiIntentRouter.has(n, key)) {
                return labels.get(key);
            }
        }
        if (AiIntentRouter.has(n, "7 ngay", "tuan qua")) return "trong 7 ngày qua";
        if (AiIntentRouter.has(n, "30 ngay")) return "trong 30 ngày qua";
        return null;
    }

    // ---------------------------------------------------------------- nhãn tiếng Việt cho câu trả lời

    private static final Map<String, String> INVENTORY_STATUS = Map.of(
            "DRAFT", "Nháp (lưu tạm)",
            "SUBMITTED", "Chờ duyệt",
            "PENDING_APPROVAL", "Chờ duyệt",
            "APPROVED", "Đã duyệt",
            "POSTED", "Đã ghi sổ",
            "UNPOSTED", "Đã bỏ ghi sổ",
            "CANCELLED", "Đã hủy",
            "CANCELED", "Đã hủy");

    private static final Map<String, String> ORDER_STATUS = Map.of(
            "DRAFT", "Nháp",
            "PENDING_APPROVAL", "Chờ duyệt",
            "SUBMITTED", "Chờ duyệt",
            "POSTED", "Đã ghi sổ",
            "COMPLETED", "Hoàn thành",
            "CANCELLED", "Đã hủy",
            "CANCELED", "Đã hủy");

    private static final Map<String, String> PURPOSES = Map.ofEntries(
            Map.entry("SALES", "Bán hàng"),
            Map.entry("USAGE", "Sử dụng nội bộ"),
            Map.entry("ASSEMBLY", "Lắp ráp / tháo dỡ"),
            Map.entry("PRODUCTION", "Lắp ráp / tháo dỡ"),
            Map.entry("REPAIR", "Sửa chữa"),
            Map.entry("TRANSFER_EXPORT", "Chuyển kho đi"),
            Map.entry("TRANSFER_IMPORT", "Nhận chuyển kho"),
            Map.entry("PURCHASE", "Mua hàng"),
            Map.entry("PO_BACKORDER", "Mua hàng (giao bù)"),
            Map.entry("STOCKTAKE_ADD", "Điều chỉnh kiểm kê"),
            Map.entry("INVENTORY_ADJUSTMENT", "Điều chỉnh kiểm kê"),
            Map.entry("RETURN", "Hàng bán bị trả lại"),
            Map.entry("SCRAP", "Phế liệu sửa chữa"),
            Map.entry("OTHER", "Khác"));

    private static final Map<String, String> TRANSFER_STATUS = Map.of(
            "DRAFT", "Nháp",
            "APPROVED", "Chờ xuất kho",
            "IN_TRANSIT", "Đang chuyển",
            "POSTED", "Hoàn thành",
            "CANCELLED", "Đã hủy");

    static String inventoryStatusLabel(String code) {
        return label(INVENTORY_STATUS, code);
    }

    /** Đơn mua: đã duyệt là đang chờ nhập kho; đơn bán: đã duyệt là đang chờ xuất kho. */
    static String orderStatusLabel(String code, boolean purchase) {
        if ("APPROVED".equals(code)) {
            return purchase ? "Đã duyệt (chờ nhập kho)" : "Đã duyệt (chờ xuất kho)";
        }
        return label(ORDER_STATUS, code);
    }

    static String purposeLabel(String code) {
        return code == null || code.isBlank() ? null : label(PURPOSES, code);
    }

    static String transferStatusLabel(String code) {
        return label(TRANSFER_STATUS, code);
    }

    private static String label(Map<String, String> labels, String code) {
        if (code == null || code.isBlank()) {
            return "-";
        }
        return labels.getOrDefault(code.toUpperCase(Locale.ROOT), code);
    }
}
