package com.duylongtech.backend.feature.ai.service;

import com.duylongtech.backend.feature.ai.model.AiIntent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Phân loại câu hỏi của chatbot. Đầu vào là câu hỏi đã chuẩn hóa (không dấu, chữ thường).
 *
 * <p>Mọi từ khóa đều khớp theo NGUYÊN TỪ/CỤM TỪ, không khớp chuỗi con: tránh việc "so luong" bị hiểu là đơn bán
 * ("so "), "cach" bị hiểu là danh sách kho ("cac"), "hien thi" bị hiểu là lời chào ("hi"), "tong" là tồn kho ("ton").
 * Thứ tự ưu tiên: chặn bảo mật → ngoài phạm vi → chào hỏi → hướng dẫn → loại chứng từ/nghiệp vụ cụ thể →
 * tồn kho/kho → tổng quan. Các từ chung (kho, hàng, tồn, số lượng, hệ thống) chỉ có tác dụng khi câu hỏi
 * không nhắc tới loại chứng từ cụ thể nào.
 */
public final class AiIntentRouter {

    private static final Map<String, Pattern> PHRASES = new ConcurrentHashMap<>();
    private static final Pattern DOCUMENT_CODE = Pattern.compile("(?<![a-z0-9])[a-z]{1,4}[-_]?\\d{2,}(?![a-z0-9])");
    private static final Pattern PO_CODE = Pattern.compile("(?<![a-z0-9])po(?:[-_]?\\d+)?(?![a-z0-9])");
    private static final Pattern SO_CODE = Pattern.compile("(?<![a-z0-9])so[-_]?\\d+(?![a-z0-9])");
    private static final Pattern IMPORT_CODE = Pattern.compile("(?<![a-z0-9])nk(?:[-_]?\\d+)?(?![a-z0-9])");
    private static final Pattern EXPORT_CODE = Pattern.compile("(?<![a-z0-9])xk(?:[-_]?\\d+)?(?![a-z0-9])");
    private static final Pattern GREETING = Pattern.compile(
            "^(?:hi|hello|helo|hey|alo|chao|xin chao)(?:\\s+(?:ban|bot|ai|tro ly|nhe|nha|ad|admin|anh|chi|em|minh|moi nguoi))*\\s*[!.?]*$");

    private AiIntentRouter() {
    }

    public static AiIntent route(String normalized) {
        String n = normalized == null ? "" : normalized;

        if (isSecuritySensitive(n)) {
            return AiIntent.SECURITY;
        }
        if (isOutOfScope(n)) {
            return AiIntent.OUT_OF_SCOPE;
        }
        if (GREETING.matcher(n).matches()) {
            return AiIntent.GREETING;
        }
        if (isGuide(n)) {
            return AiIntent.GUIDE;
        }
        AiIntent domain = domainOf(n);
        if (domain != AiIntent.GENERAL) {
            return domain;
        }
        if (has(n, "tong quan", "doc het", "co nhung gi", "dashboard", "toan bo du lieu", "tat ca du lieu",
                "thong ke he thong", "he thong co")) {
            return AiIntent.OVERVIEW;
        }
        return AiIntent.GENERAL;
    }

    /** Nghiệp vụ mà câu hỏi nhắc tới (GENERAL nếu không có). Dùng cả để chọn chủ đề hướng dẫn. */
    public static AiIntent domainOf(String n) {
        if (has(n, "chuyen kho", "transfer")) {
            return AiIntent.TRANSFER;
        }
        if (has(n, "lap rap", "thao do", "dung may", "dung pc", "build pc", "build may", "rap may", "cau hinh",
                "assembly", "bom")) {
            return AiIntent.ASSEMBLY;
        }
        if (has(n, "bao hanh", "warranty", "serial")) {
            return AiIntent.WARRANTY;
        }
        if (has(n, "sua chua", "repair", "phieu sua")) {
            return AiIntent.REPAIR;
        }
        if (has(n, "don mua", "purchase order", "dat hang ncc") || PO_CODE.matcher(n).find()) {
            return AiIntent.PURCHASE_ORDER;
        }
        if (has(n, "don ban", "sales order", "don hang khach") || SO_CODE.matcher(n).find()) {
            return AiIntent.SALES_ORDER;
        }
        if (has(n, "nhap kho", "phieu nhap", "import") || IMPORT_CODE.matcher(n).find()) {
            return AiIntent.IMPORT;
        }
        if (has(n, "xuat kho", "phieu xuat", "export") || EXPORT_CODE.matcher(n).find()) {
            return AiIntent.EXPORT;
        }

        boolean mentionsWarehouse = has(n, "kho", "warehouse");
        boolean mentionsStock = has(n, "ton", "hang", "san pham", "sku");
        if (mentionsStock && has(n, "thap", "sap het", "gan het", "duoi", "it nhat")) {
            return AiIntent.LOW_STOCK;
        }
        if (mentionsWarehouse && has(n, "danh sach", "liet ke", "nhung", "cac", "tat ca", "bao nhieu kho", "may kho")) {
            return AiIntent.WAREHOUSE_LIST;
        }
        if (mentionsWarehouse && (mentionsStock || has(n, "so luong", "bao nhieu"))) {
            return AiIntent.WAREHOUSE_STOCK;
        }
        if (has(n, "san pham", "hang hoa", "sku", "barcode", "bien the")) {
            return AiIntent.PRODUCT;
        }
        if (has(n, "khach hang", "customer", "nha cung cap", "supplier", "doi tac")) {
            return AiIntent.PARTNER;
        }
        return AiIntent.GENERAL;
    }

    public static boolean isCountQuestion(String n) {
        return has(n, "co may", "bao nhieu", "so luong", "tong so", "dem", "count");
    }

    private static boolean isGuide(String n) {
        if (has(n, "huong dan", "quy trinh", "cach", "lam sao", "thao tac", "tao phieu", "lap phieu")) {
            return true;
        }
        // "... như thế nào?" chỉ là hướng dẫn khi không hỏi về một chứng từ cụ thể (vd "PO0012 như thế nào rồi").
        return has(n, "nhu the nao") && !DOCUMENT_CODE.matcher(n).find();
    }

    private static boolean isSecuritySensitive(String n) {
        return has(n, "mat khau", "password", "pass hash", "password_hash", "ma bam", "ma otp", "lay otp", "xin otp",
                "token", "jwt", "secret key", "api key", "cccd", "cmnd", "can cuoc", "tai khoan admin",
                "danh sach mat khau", "dump database", "sql injection")
                || (has(n, "otp") && has(n, "admin", "user", "nguoi dung"));
    }

    private static boolean isOutOfScope(String n) {
        return has(n, "thoi tiet", "du bao thoi tiet", "nau an", "bai tho", "viet tho", "ke chuyen", "chuyen cuoi",
                "bong da", "tinh yeu", "boi toan", "tu vi", "xem boi", "dich tieng anh");
    }

    /** Khớp nguyên cụm từ: không được dính liền chữ/số ở hai đầu. */
    static boolean has(String n, String... phrases) {
        for (String phrase : phrases) {
            Pattern pattern = PHRASES.computeIfAbsent(phrase,
                    p -> Pattern.compile("(?<![a-z0-9_])" + Pattern.quote(p) + "(?![a-z0-9_])"));
            if (pattern.matcher(n).find()) {
                return true;
            }
        }
        return false;
    }
}

