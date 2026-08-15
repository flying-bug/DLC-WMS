package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.AiChatResponse;
import com.duylongtech.backend.dto.response.AiSourceResponse;
import com.duylongtech.backend.dto.response.WarehouseStockAiRow;
import com.duylongtech.backend.entity.AssemblyOrder;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.StockTransfer;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.Warehouse;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.StockTransferRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.duylongtech.backend.dto.request.AiChatMessageDto;

@Service
@RequiredArgsConstructor
public class AiChatService {
    private static final int MAX_ROWS_IN_ANSWER = 10;

    private final WarehouseRepository warehouseRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PartnerRepository partnerRepository;
    private final WarrantyRepository warrantyRepository;
    private final RepairRepository repairRepository;
    private final StockTransferRepository stockTransferRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final AiModelClient aiModelClient;

    @Transactional(readOnly = true)
    public AiChatResponse chat(String rawMessage) {
        return chat(rawMessage, List.of());
    }

    @Transactional(readOnly = true)
    public AiChatResponse chat(String rawMessage, List<AiChatMessageDto> history) {
        String message = rawMessage == null ? "" : rawMessage.trim();
        String normalized = normalize(message);

        // 1. TƯỜNG LỬA BẢO MẬT & QUYỀN RIÊNG TƯ (Tuyệt đối chặn lộ mật khẩu, OTP, CCCD, token)
        if (isSecuritySensitiveQuestion(normalized)) {
            return answerSecurityAlert();
        }

        // 2. BỘ LỌC CÂU HỎI NGOÀI PHẠM VI (Từ chối lịch sự các câu hỏi không liên quan)
        if (isIrrelevantQuestion(normalized)) {
            return enhance(message, history, answerIrrelevantQuestion());
        }

        // 3. ĐỒNG HÓA NGỮ CẢNH HỘI THOẠI (Coreference Resolution: giải mã các đại từ "nó", "cái này", "kho đó"...)
        String contextualMessage = resolveContextualQuery(message, normalized, history);
        String contextualNormalized = normalize(contextualMessage);

        if (isGreeting(normalized)) {
            return enhance(message, history, answerGreeting());
        }

        if (isSystemOverviewQuestion(contextualNormalized)) {
            return enhance(message, history, answerSystemOverview());
        }

        if (isLowStockQuestion(contextualNormalized)) {
            return enhance(message, history, answerLowStock());
        }

        if (isWarehouseListQuestion(contextualNormalized)) {
            return enhance(message, history, answerWarehouseList());
        }

        if (isWarehouseStockQuestion(contextualNormalized)) {
            return enhance(message, history, answerWarehouseStock(contextualMessage, contextualNormalized));
        }

        if (isImportQuestion(contextualNormalized)) {
            return enhance(message, history, answerImportSearch(contextualMessage));
        }

        if (isExportQuestion(contextualNormalized)) {
            return enhance(message, history, answerExportSearch(contextualMessage));
        }

        if (isPurchaseOrderQuestion(contextualNormalized)) {
            return enhance(message, history, answerPurchaseOrderSearch(contextualMessage));
        }

        if (isSalesOrderQuestion(contextualNormalized)) {
            return enhance(message, history, answerSalesOrderSearch(contextualMessage));
        }

        if (isProductQuestion(contextualNormalized)) {
            return enhance(message, history, answerProductSearch(contextualMessage));
        }

        if (isRepairQuestion(contextualNormalized)) {
            return enhance(message, history, answerRepairSearch(contextualMessage));
        }

        if (isPartnerQuestion(contextualNormalized)) {
            return enhance(message, history, answerPartnerSearch(contextualMessage, contextualNormalized));
        }

        if (isWarrantyQuestion(contextualNormalized)) {
            return enhance(message, history, answerWarrantySearch(contextualMessage));
        }

        if (isGuideQuestion(contextualNormalized)) {
            return enhance(message, history, answerGuideQuestion(contextualNormalized));
        }

        if (isTransferQuestion(contextualNormalized)) {
            return enhance(message, history, answerTransferSearch(contextualMessage));
        }

        if (isAssemblyQuestion(contextualNormalized)) {
            return enhance(message, history, answerAssemblySearch(contextualMessage));
        }

        return enhance(message, history, AiChatResponse.builder()
                .intent("GENERAL_NOT_CONNECTED")
                .answer("Chào bạn! Mình là Trợ lý AI của hệ thống DLC-WMS. Mình có thể hỗ trợ bạn tra cứu mọi dữ liệu nhập kho, xuất kho, đơn mua hàng (PO), đơn bán hàng (SO), tồn kho, sản phẩm, bảo hành, sửa chữa và lắp ráp/dựng máy. Bạn có thể hỏi ví dụ: \"Phiếu nhập kho gần nhất\", \"Tìm phiếu xuất kho\", \"Đơn mua hàng đang chờ duyệt\".")
                .sources(allSystemSources())
                .suggestions(defaultSuggestions())
                .build());
    }

    private AiChatResponse enhance(String userQuestion, List<AiChatMessageDto> history, AiChatResponse groundedResponse) {
        return aiModelClient.enhanceAnswer(userQuestion, history, groundedResponse);
    }

    private String resolveContextualQuery(String currentMessage, String normalized, List<AiChatMessageDto> history) {
        if (history == null || history.isEmpty()) {
            return currentMessage;
        }

        boolean hasContextPronoun = normalized.contains(" no ")
                || normalized.startsWith("no ")
                || normalized.endsWith(" no")
                || normalized.equals("no")
                || normalized.contains("cai nay")
                || normalized.contains("cai do")
                || normalized.contains("mon nay")
                || normalized.contains("mon do")
                || normalized.contains("san pham nay")
                || normalized.contains("san pham do")
                || normalized.contains("kho nay")
                || normalized.contains("kho do")
                || normalized.contains("chiec nay")
                || normalized.contains("chiec do")
                || normalized.contains("gia bao nhieu")
                || normalized.contains("o dau")
                || normalized.contains("con khong")
                || normalized.contains("con o kho nao");

        if (!hasContextPronoun) {
            return currentMessage;
        }

        // Lấy từ khóa thực thể từ tin nhắn gần nhất của người dùng hoặc trợ lý
        for (int i = history.size() - 1; i >= 0; i--) {
            AiChatMessageDto msg = history.get(i);
            if (msg != null && msg.getContent() != null && !msg.getContent().isBlank()) {
                String extracted = extractSearchKeyword(msg.getContent());
                if (!extracted.isBlank() && extracted.length() >= 2) {
                    return extracted + " " + currentMessage;
                }
            }
        }

        return currentMessage;
    }

    private AiChatResponse answerSystemOverview() {
        BigDecimal totalQuantity = inventoryBalanceRepository.findAll().stream()
                .map(balance -> balance.getQuantityOnHand() == null ? BigDecimal.ZERO : balance.getQuantityOnHand())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String answer = "Mình đã đọc tổng quan dữ liệu hiện có trong database:\n"
                + "- Kho: " + warehouseRepository.count() + "\n"
                + "- Sản phẩm: " + productRepository.count() + "\n"
                + "- SKU/biến thể: " + productVariantRepository.count() + "\n"
                + "- Dòng tồn kho: " + inventoryBalanceRepository.count() + "\n"
                + "- Tổng số lượng tồn ghi nhận: " + formatNumber(totalQuantity) + "\n"
                + "- Khách hàng: " + partnerRepository.countCustomersForAi() + "\n"
                + "- Nhà cung cấp: " + partnerRepository.countSuppliersForAi() + "\n"
                + "- Phiếu bảo hành: " + warrantyRepository.count() + "\n"
                + "- Phiếu sửa chữa: " + repairRepository.count() + "\n"
                + "- Phiếu chuyển kho: " + stockTransferRepository.count() + "\n"
                + "- Lệnh lắp ráp/tháo dỡ: " + assemblyOrderRepository.count() + "\n"
                + "- Đơn mua hàng (PO): " + purchaseOrderRepository.count() + "\n"
                + "- Đơn bán hàng (SO): " + salesOrderRepository.count() + "\n\n"
                + "Bạn có thể hỏi tiếp theo module, ví dụ: \"tìm sản phẩm Dell\", \"bảo hành serial ABC\", \"phiếu sửa chữa đang chờ\", \"Kho A có bao nhiêu hàng\".";

        return AiChatResponse.builder()
                .intent("SYSTEM_OVERVIEW")
                .answer(answer)
                .sources(allSystemSources())
                .suggestions(defaultSuggestions())
                .build();
    }

    private AiChatResponse answerGreeting() {
        return AiChatResponse.builder()
                .intent("GREETING")
                .answer("Chào bạn! Mình là trợ lý ảo AI của hệ thống quản lý kho DLC WMS. Mình có thể giúp bạn tra cứu thông tin sản phẩm, tồn kho, khách hàng, bảo hành hoặc hướng dẫn sử dụng hệ thống. Bạn cần mình giúp gì nào?")
                .sources(List.of(AiSourceResponse.builder()
                        .type("system")
                        .name("AI router")
                        .description("Nhận diện lời chào")
                        .build()))
                .suggestions(defaultSuggestions())
                .build();
    }

    private AiChatResponse answerProductSearch(String message) {
        String keyword = extractSearchKeyword(message);
        Page<Product> products = productRepository.searchProducts(keyword, null, null, null, null, PageRequest.of(0, 5));
        Page<ProductVariant> variants = productVariantRepository.searchVariants(keyword, PageRequest.of(0, 5));

        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu sản phẩm");
        if (!keyword.isBlank()) {
            answer.append(" theo từ khóa \"").append(keyword).append("\"");
        }
        answer.append(".\n\nSản phẩm tìm thấy: ").append(products.getTotalElements());

        products.getContent().forEach(product -> answer.append("\n- ")
                .append(product.getProductCode())
                .append(": ")
                .append(product.getProductName())
                .append(", loại ")
                .append(product.getProductType())
                .append(", tồn MVP ")
                .append(formatNumber(product.getStockQty())));

        answer.append("\n\nSKU/biến thể tìm thấy: ").append(variants.getTotalElements());
        variants.getContent().forEach(variant -> answer.append("\n- ")
                .append(variant.getSku())
                .append(": ")
                .append(variant.getVariantName())
                .append(", giá bán ")
                .append(formatMoney(variant.getSalePrice())));

        return AiChatResponse.builder()
                .intent("PRODUCT_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "PRODUCTS, PRODUCT_VARIANTS", "Tra cứu sản phẩm và SKU")))
                .suggestions(List.of("Tồn kho của SKU này ở đâu?", "Sản phẩm nào tồn thấp?", "Tìm sản phẩm theo mã"))
                .build();
    }

    private AiChatResponse answerPartnerSearch(String message, String normalized) {
        boolean supplierOnly = normalized.contains("nha cung cap") || normalized.contains("supplier");
        boolean customerOnly = normalized.contains("khach hang") || normalized.contains("customer");

        if (isCountQuestion(normalized)) {
            if (supplierOnly) {
                long supplierCount = partnerRepository.countSuppliersForAi();
                return AiChatResponse.builder()
                        .intent("SUPPLIER_COUNT")
                        .answer("Hệ thống hiện có " + supplierCount + " nhà cung cấp.")
                        .sources(List.of(source("database", "PARTNERS", "Đếm bản ghi có is_supplier = true")))
                        .suggestions(List.of("Liệt kê nhà cung cấp", "Nhà cung cấp đang hoạt động", "Tìm nhà cung cấp theo tên"))
                        .build();
            }

            if (customerOnly) {
                long customerCount = partnerRepository.countCustomersForAi();
                return AiChatResponse.builder()
                        .intent("CUSTOMER_COUNT")
                        .answer("Hệ thống hiện có " + customerCount + " khách hàng.")
                        .sources(List.of(source("database", "PARTNERS", "Đếm bản ghi có is_customer = true")))
                        .suggestions(List.of("Liệt kê khách hàng", "Tìm khách hàng theo số điện thoại", "Khách hàng này có bảo hành nào?"))
                        .build();
            }
        }

        String keyword = extractSearchKeyword(message);
        Page<Partner> partners = partnerRepository.searchPartnersForAi(keyword, customerOnly, supplierOnly, PageRequest.of(0, 8));

        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu đối tác");
        if (customerOnly) answer.append(" nhóm khách hàng");
        if (supplierOnly) answer.append(" nhóm nhà cung cấp");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(partners.getTotalElements()).append(" bản ghi.");

        partners.getContent().forEach(partner -> answer.append("\n- ")
                .append(partner.getCode())
                .append(": ")
                .append(partner.getName())
                .append(", SDT ")
                .append(nullToDash(partner.getPhone()))
                .append(", trạng thái ")
                .append(partner.getStatus()));

        return AiChatResponse.builder()
                .intent("PARTNER_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "PARTNERS", "Tra cứu khách hàng và nhà cung cấp")))
                .suggestions(List.of("Khách hàng này có bảo hành nào?", "Tìm khách hàng theo số điện thoại", "Nhà cung cấp đang hoạt động"))
                .build();
    }

    private AiChatResponse answerWarrantySearch(String message) {
        String keyword = extractSearchKeyword(message);
        Page<Warranty> warranties = warrantyRepository.searchWarranties(blankToNull(keyword), null, null, null, PageRequest.of(0, 8));
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu bảo hành");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(warranties.getTotalElements()).append(" phiếu.");

        warranties.getContent().forEach(warranty -> answer.append("\n- ")
                .append(warranty.getWarrantyCode())
                .append(": trạng thái ")
                .append(warranty.getWarrantyStatus())
                .append(", từ ")
                .append(warranty.getStartDate())
                .append(" den ")
                .append(warranty.getEndDate()));

        return AiChatResponse.builder()
                .intent("WARRANTY_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "WARRANTIES, SERIAL_NUMBERS, PARTNERS", "Tra cứu bảo hành")))
                .suggestions(List.of("Bảo hành theo serial", "Bảo hành nào sắp hết hạn?", "Khách hàng này có bảo hành nào?"))
                .build();
    }

    private AiChatResponse answerRepairSearch(String message) {
        String keyword = extractSearchKeyword(message);
        Page<Repair> repairs = repairRepository.searchRepairs(blankToNull(keyword), null, null, null, PageRequest.of(0, 8));
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu sửa chữa");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(repairs.getTotalElements()).append(" phiếu.");

        repairs.getContent().forEach(repair -> answer.append("\n- ")
                .append(repair.getRepairCode())
                .append(": ")
                .append(repair.getRepairStatus())
                .append(", ngày nhận ")
                .append(repair.getReceivedDate())
                .append(", lỗi: ")
                .append(shortText(repair.getIssueDescription())));

        return AiChatResponse.builder()
                .intent("REPAIR_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "REPAIRS, WARRANTIES, SERIAL_NUMBERS", "Tra cứu phiếu sửa chữa")))
                .suggestions(List.of("Phiếu sửa chữa đang chờ xử lý", "Tìm phiếu sửa chữa theo mã", "Sửa chữa của serial ABC"))
                .build();
    }

    private AiChatResponse answerTransferSearch(String message) {
        String keyword = extractSearchKeyword(message);
        List<StockTransfer> transfers = stockTransferRepository.searchTransfers(blankToNull(keyword), null, null, null).stream()
                .limit(8)
                .toList();
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu chuyển kho");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Hiển thị ").append(transfers.size()).append(" phiếu gần nhất/phù hợp.");

        transfers.forEach(transfer -> answer.append("\n- ")
                .append(transfer.getTransferCode())
                .append(": ")
                .append(transfer.getStatus())
                .append(", ngày ")
                .append(transfer.getTransferDate())
                .append(", từ kho ID ")
                .append(transfer.getFromWarehouseId())
                .append(" sang kho ID ")
                .append(transfer.getToWarehouseId()));

        return AiChatResponse.builder()
                .intent("TRANSFER_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "STOCK_TRANSFERS, STOCK_TRANSFER_LINES", "Tra cứu chuyển kho")))
                .suggestions(List.of("Phiếu chuyển kho đang chờ", "Tìm phiếu chuyển kho theo mã", "Hướng dẫn tạo phiếu chuyển kho"))
                .build();
    }

    private AiChatResponse answerPurchaseOrderSearch(String message) {
        if (isCountQuestion(normalize(message))) {
            long count = purchaseOrderRepository.count();
            return AiChatResponse.builder()
                    .intent("PURCHASE_ORDER_COUNT")
                    .answer("Hệ thống hiện tại có tổng cộng " + count + " đơn mua hàng (PO).")
                    .sources(List.of(source("database", "PURCHASE_ORDERS", "Đếm tổng số đơn mua hàng trong hệ thống")))
                    .suggestions(List.of("Đơn mua hàng gần nhất", "Tìm PO theo mã", "Nhà cung cấp uy tín"))
                    .build();
        }

        String keyword = extractSearchKeyword(message);
        List<PurchaseOrder> orders = purchaseOrderRepository.findAllWithFilters(blankToNull(keyword), null, null, null, null).stream()
                .limit(8)
                .toList();
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu Đơn mua hàng (PO)");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(orders.size()).append(" đơn gần nhất.");

        orders.forEach(order -> answer.append("\n- Mã PO: ")
                .append(order.getPoCode())
                .append(", Nhà cung cấp: ")
                .append(order.getPartner() != null ? order.getPartner().getName() : "-")
                .append(", Trạng thái: ")
                .append(order.getStatus())
                .append(", Tổng tiền: ")
                .append(formatMoney(order.getTotalAmount()))
                .append(", Ngày đặt: ")
                .append(order.getPoDate()));

        return AiChatResponse.builder()
                .intent("PURCHASE_ORDER_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "PURCHASE_ORDERS", "Tra cứu đơn đặt hàng nhà cung cấp")))
                .suggestions(List.of("Đơn mua hàng đang chờ duyệt", "Tìm PO theo mã", "Nhà cung cấp uy tín"))
                .build();
    }

    private AiChatResponse answerSalesOrderSearch(String message) {
        if (isCountQuestion(normalize(message))) {
            long count = salesOrderRepository.count();
            return AiChatResponse.builder()
                    .intent("SALES_ORDER_COUNT")
                    .answer("Hệ thống hiện tại có tổng cộng " + count + " đơn bán hàng (SO).")
                    .sources(List.of(source("database", "SALES_ORDERS", "Đếm tổng số đơn bán hàng trong hệ thống")))
                    .suggestions(List.of("Đơn bán hàng chờ xuất kho", "Tìm SO theo mã", "Doanh thu hôm nay"))
                    .build();
        }

        String keyword = extractSearchKeyword(message);
        List<SalesOrder> orders = salesOrderRepository.findAllWithFilters(blankToNull(keyword), null, null, null, null, null, null, null).stream()
                .limit(8)
                .toList();
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu Đơn bán hàng (SO)");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(orders.size()).append(" đơn gần nhất.");

        orders.forEach(order -> answer.append("\n- Mã SO: ")
                .append(order.getSoCode())
                .append(", Khách hàng: ")
                .append(order.getPartner() != null ? order.getPartner().getName() : "Khách lẻ")
                .append(", Trạng thái: ")
                .append(order.getStatus())
                .append(", Tổng tiền: ")
                .append(formatMoney(order.getTotalAmount()))
                .append(", Ngày tạo: ")
                .append(order.getSoDate()));

        return AiChatResponse.builder()
                .intent("SALES_ORDER_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "SALES_ORDERS", "Tra cứu đơn bán hàng và xuất kho")))
                .suggestions(List.of("Đơn bán hàng chờ xuất kho", "Tìm SO theo mã", "Doanh thu hôm nay"))
                .build();
    }

    private boolean isSecuritySensitiveQuestion(String normalized) {
        return normalized.contains("mat khau")
                || normalized.contains("password")
                || normalized.contains("pass hash")
                || normalized.contains("password_hash")
                || normalized.contains("ma bam")
                || normalized.contains("ma otp")
                || normalized.contains("lay otp")
                || normalized.contains("xin otp")
                || (normalized.contains("otp") && (normalized.contains("admin") || normalized.contains("user") || normalized.contains("nguoi dung")))
                || normalized.contains("token")
                || normalized.contains("jwt")
                || normalized.contains("secret key")
                || normalized.contains("api key")
                || normalized.contains("cccd")
                || normalized.contains("cmnd")
                || normalized.contains("can cuoc")
                || normalized.contains("tai khoan admin")
                || normalized.contains("danh sach mat khau")
                || normalized.contains("dump database")
                || normalized.contains("sql injection");
    }

    private AiChatResponse answerSecurityAlert() {
        return AiChatResponse.builder()
                .intent("SECURITY_ALERT")
                .answer("🔒 CẢNH BÁO AN TOÀN DỮ LIỆU: Vì chính sách bảo mật thông tin người dùng và an ninh hệ thống DLC-WMS, AI tuyệt đối không cung cấp thông tin tài khoản, mật khẩu, mã OTP, số CCCD/CMND, token xác thực hoặc các dữ liệu bảo mật nội bộ. Vui lòng liên hệ Quản trị viên (Super Admin) nếu bạn cần hỗ trợ về tài khoản.")
                .sources(List.of(source("security_policy", "DATA_PRIVACY_GUARD", "Chính sách bảo vệ an toàn thông tin người dùng")))
                .suggestions(List.of(
                        "Tra cứu tồn kho sản phẩm",
                        "Kiểm tra đơn bảo hành theo serial",
                        "Hướng dẫn quy trình tạo phiếu nhập kho"
                ))
                .build();
    }

    private boolean isIrrelevantQuestion(String normalized) {
        return normalized.contains("thoi tiet")
                || normalized.contains("du bao thoi tiet")
                || normalized.contains("nau an")
                || normalized.contains("cong thuc")
                || normalized.contains("bai tho")
                || normalized.contains("viet tho")
                || normalized.contains("ke chuyen")
                || normalized.contains("chuyen cuoi")
                || normalized.contains("bong da")
                || normalized.contains("chieu cao")
                || normalized.contains("can nang")
                || normalized.contains("tinh yeu")
                || normalized.contains("boi toan")
                || normalized.contains("tu vi")
                || normalized.contains("xem boi")
                || normalized.contains("dich tieng anh");
    }

    private AiChatResponse answerIrrelevantQuestion() {
        return AiChatResponse.builder()
                .intent("OUT_OF_SCOPE")
                .answer("Chào bạn! Mình là Trợ lý AI chuyên trách cho hệ thống quản trị kho & bán hàng DLC-WMS. Câu hỏi của bạn nằm ngoài phạm vi nghiệp vụ kho bãi, sản phẩm, bán hàng, sửa chữa và bảo hành. Bạn có thể hỏi mình về các nghiệp vụ kho nhé!")
                .sources(List.of(source("system", "AI Scope Filter", "Bộ lọc phạm vi nghiệp vụ DLC-WMS")))
                .suggestions(List.of(
                        "Kho nào đang có nhiều hàng nhất?",
                        "Kiểm tra sản phẩm sắp hết hàng",
                        "Quy trình dựng máy và quản lý BOM"
                ))
                .build();
    }

    private boolean isImportQuestion(String normalized) {
        return (normalized.contains("nhap kho") || normalized.contains("phieu nhap") || normalized.contains("import") || normalized.contains("nk"))
                && !normalized.contains("huong dan") && !normalized.contains("cach");
    }

    private boolean isExportQuestion(String normalized) {
        return (normalized.contains("xuat kho") || normalized.contains("phieu xuat") || normalized.contains("export") || normalized.contains("xk"))
                && !normalized.contains("huong dan") && !normalized.contains("cach");
    }

    private AiChatResponse answerImportSearch(String message) {
        if (isCountQuestion(normalize(message))) {
            List<InventoryDocument> allImports = inventoryDocumentRepository.findAllImports();
            return AiChatResponse.builder()
                    .intent("IMPORT_COUNT")
                    .answer("Hệ thống hiện tại có tổng cộng " + allImports.size() + " phiếu nhập kho (IN_PO).")
                    .sources(List.of(source("database", "INVENTORY_DOCUMENTS", "Đếm tổng số phiếu nhập kho trong hệ thống")))
                    .suggestions(List.of("Phiếu nhập kho gần nhất", "Tìm phiếu nhập theo mã", "Hướng dẫn tạo phiếu nhập kho"))
                    .build();
        }

        String keyword = extractSearchKeyword(message);
        List<InventoryDocument> imports;
        if (keyword.isBlank()) {
            imports = inventoryDocumentRepository.findAllImports().stream().limit(8).toList();
        } else {
            imports = inventoryDocumentRepository.searchImports(blankToNull(keyword), null, null, null, null, null, null, null).stream()
                    .limit(8)
                    .toList();
        }
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu Phiếu nhập kho (IN_PO)");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(imports.size()).append(" phiếu gần nhất.");

        imports.forEach(doc -> answer.append("\n- Mã phiếu: ")
                .append(doc.getDocCode())
                .append(", Kho: #")
                .append(doc.getWarehouseId())
                .append(", Trạng thái: ")
                .append(doc.getStatus())
                .append(", Số mặt hàng: ")
                .append(doc.getLines() != null ? doc.getLines().size() : 0)
                .append(", Ngày nhập: ")
                .append(doc.getDocDate()));

        return AiChatResponse.builder()
                .intent("IMPORT_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "INVENTORY_DOCUMENTS, INVENTORY_DOCUMENT_LINES", "Tra cứu phiếu nhập kho")))
                .suggestions(List.of("Phiếu nhập kho hôm nay", "Tìm phiếu nhập theo mã", "Hướng dẫn tạo phiếu nhập kho"))
                .build();
    }

    private AiChatResponse answerExportSearch(String message) {
        if (isCountQuestion(normalize(message))) {
            List<InventoryDocument> allExports = inventoryDocumentRepository.findAllExports();
            return AiChatResponse.builder()
                    .intent("EXPORT_COUNT")
                    .answer("Hệ thống hiện tại có tổng cộng " + allExports.size() + " phiếu xuất kho (EX_SO).")
                    .sources(List.of(source("database", "INVENTORY_DOCUMENTS", "Đếm tổng số phiếu xuất kho trong hệ thống")))
                    .suggestions(List.of("Phiếu xuất kho gần nhất", "Tìm phiếu xuất theo mã", "Hướng dẫn tạo phiếu xuất kho"))
                    .build();
        }

        String keyword = extractSearchKeyword(message);
        List<InventoryDocument> exports;
        if (keyword.isBlank()) {
            exports = inventoryDocumentRepository.findAllExports().stream().limit(8).toList();
        } else {
            exports = inventoryDocumentRepository.searchExports(blankToNull(keyword), null, null, null, null, null, null, null).stream()
                    .limit(8)
                    .toList();
        }
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu Phiếu xuất kho (EX_SO)");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Tìm thấy ").append(exports.size()).append(" phiếu gần nhất.");

        exports.forEach(doc -> answer.append("\n- Mã phiếu: ")
                .append(doc.getDocCode())
                .append(", Kho: #")
                .append(doc.getWarehouseId())
                .append(", Trạng thái: ")
                .append(doc.getStatus())
                .append(", Số mặt hàng: ")
                .append(doc.getLines() != null ? doc.getLines().size() : 0)
                .append(", Ngày xuất: ")
                .append(doc.getDocDate()));

        return AiChatResponse.builder()
                .intent("EXPORT_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "INVENTORY_DOCUMENTS, INVENTORY_DOCUMENT_LINES", "Tra cứu phiếu xuất kho")))
                .suggestions(List.of("Phiếu xuất kho hôm nay", "Tìm phiếu xuất theo mã", "Hướng dẫn tạo phiếu xuất kho"))
                .build();
    }

    private boolean isPurchaseOrderQuestion(String normalized) {
        return normalized.contains("don mua")
                || normalized.contains("purchase order")
                || normalized.contains("po ")
                || normalized.startsWith("po")
                || normalized.contains("dat hang ncc");
    }

    private boolean isSalesOrderQuestion(String normalized) {
        return normalized.contains("don ban")
                || normalized.contains("sales order")
                || normalized.contains("so ")
                || normalized.startsWith("so")
                || normalized.contains("don hang khach");
    }

    private AiChatResponse answerAssemblySearch(String message) {
        String keyword = extractSearchKeyword(message);
        List<AssemblyOrder> orders = assemblyOrderRepository.search(blankToNull(keyword), null, null, null, null, null).stream()
                .limit(8)
                .toList();
        StringBuilder answer = new StringBuilder("Mình đã đọc dữ liệu lắp ráp/tháo dỡ");
        if (!keyword.isBlank()) answer.append(" theo từ khóa \"").append(keyword).append("\"");
        answer.append(". Hiển thị ").append(orders.size()).append(" lệnh phù hợp.");

        orders.forEach(order -> answer.append("\n- ")
                .append(order.getOrderCode())
                .append(": ")
                .append(order.getOrderType())
                .append(", trạng thái ")
                .append(order.getStatus())
                .append(", số lượng ")
                .append(formatNumber(order.getQuantity()))
                .append(", ngày ")
                .append(order.getExecutionDate()));

        return AiChatResponse.builder()
                .intent("ASSEMBLY_SEARCH")
                .answer(answer.toString())
                .sources(List.of(source("database", "ASSEMBLY_ORDERS, ASSEMBLY_ORDER_LINES", "Tra cứu lắp ráp/tháo dỡ")))
                .suggestions(List.of("Lệnh lắp ráp đang chờ", "Tìm BOM", "Lệnh tháo dỡ gần nhất"))
                .build();
    }

    private AiChatResponse answerGuideQuestion(String normalized) {
        if (normalized.contains("nhap kho") || normalized.contains("import")) {
            return AiChatResponse.builder()
                    .intent("IMPORT_GUIDE")
                    .answer("""
                            Quy trình Nhập kho (Procurement & Import) trên DLC-WMS:
                            1. Tạo Đơn mua hàng (PO) hoặc Phiếu nhập kho trực tiếp.
                            2. Chọn Nhà cung cấp và Kho lưu trữ.
                            3. Nhập danh sách sản phẩm, số lượng, đơn giá và thuế VAT (Hỗ trợ quét OCR hóa đơn đỏ tự động bóc tách thông tin).
                            4. Đối với hàng quản lý theo Serial Number: Quét mã vạch Barcode hoặc dán danh sách mã Serial.
                            5. Ghi sổ nhập kho (Post): Hệ thống tự động tăng tồn kho On-hand, tính giá vốn theo phương pháp FIFO và ghi sổ công nợ nhà cung cấp.
                            """.trim())
                    .sources(List.of(source("process", "PURCHASE_ORDERS, INVENTORY_DOCUMENTS", "Quy trình nhập kho chuẩn WMS")))
                    .suggestions(List.of("Phiếu nhập kho gần nhất", "Tạo đơn mua hàng PO", "Nhà cung cấp uy tín"))
                    .build();
        }

        if (normalized.contains("xuat kho") || normalized.contains("export") || normalized.contains("ban hang")) {
            return AiChatResponse.builder()
                    .intent("EXPORT_GUIDE")
                    .answer("""
                            Quy trình Xuất kho & Bán hàng (Sales & Export) trên DLC-WMS:
                            1. Tạo Đơn bán hàng (SO): Chọn Khách hàng, sản phẩm và số lượng. Hệ thống tự động kiểm tra và Giữ chỗ tồn kho (Stock Reservation).
                            2. Lập Phiếu xuất kho: Hệ thống tự động chọn các mã Serial sẵn có trong kho theo nguyên tắc FIFO.
                            3. Quét Serial kiểm tra: Đối chiếu mã Serial thực tế tại quầy xuất hàng.
                            4. Ghi sổ xuất kho (Post): Hệ thống khóa Serial sang SOLD (chống race condition), trừ tồn kho On-hand, trừ lớp giá vốn FIFO, tự động KÍCH HOẠT BẢO HÀNH ĐIỆN TỬ và ghi nhận công nợ khách hàng.
                            5. In phiếu xuất kho & Phiếu bảo hành giao cho khách hàng.
                            """.trim())
                    .sources(List.of(source("process", "SALES_ORDERS, INVENTORY_DOCUMENTS, WARRANTIES", "Quy trình xuất kho và kích hoạt bảo hành điện tử")))
                    .suggestions(List.of("Đơn bán hàng chờ xuất kho", "Phiếu xuất kho gần nhất", "Tra cứu bảo hành serial"))
                    .build();
        }

        if (isTransferQuestion(normalized)) {
            return AiChatResponse.builder()
                    .intent("TRANSFER_GUIDE")
                    .answer("""
                            Để tạo phiếu chuyển kho, bạn làm theo quy trình này:
                            1. Vào module Chuyển kho.
                            2. Chọn tạo phiếu chuyển kho mới.
                            3. Chọn kho xuất và kho nhận. Hai kho phải khác nhau.
                            4. Thêm sản phẩm/SKU cần chuyển và nhập số lượng.
                            5. Kiểm tra tồn khả dụng ở kho xuất trước khi lưu phiếu.
                            6. Lưu phiếu ở trạng thái chờ xử lý hoặc gửi duyệt nếu hệ thống có bước duyệt.
                            7. Khi hàng rời kho, xác nhận xuất kho. Khi kho nhận nhận hàng, xác nhận nhập kho để cập nhật tồn.
                            """.trim())
                    .sources(List.of(
                            source("process", "STOCK_TRANSFERS", "Quy trình nghiệp vụ tạo phiếu chuyển kho"),
                            source("process", "STOCK_TRANSFER_LINES", "Dòng sản phẩm/SKU trong phiếu chuyển kho")
                    ))
                    .suggestions(List.of("Phiếu chuyển kho đang chờ", "Tìm phiếu chuyển kho theo mã", "Kho nào còn tồn SKU này?"))
                    .build();
        }

        if (isWarrantyQuestion(normalized)) {
            return AiChatResponse.builder()
                    .intent("WARRANTY_GUIDE")
                    .answer("""
                            Để tra cứu hoặc xử lý bảo hành, bạn nên bắt đầu bằng số serial, mã bảo hành hoặc thông tin khách hàng.
                            1. Vào module Bảo hành.
                            2. Tìm theo serial/mã phiếu/khách hàng.
                            3. Kiểm tra thời hạn bảo hành và trạng thái hiện tại.
                            4. Nếu sản phẩm cần sửa chữa, tạo phiếu sửa chữa liên kết với bảo hành.
                            5. Cập nhật trạng thái sau khi tiếp nhận, xử lý và bàn giao.
                            """.trim())
                    .sources(List.of(source("process", "WARRANTIES, SERIAL_NUMBERS, REPAIRS", "Quy trình tra cứu và xử lý bảo hành")))
                    .suggestions(List.of("Tìm đơn bảo hành theo số serial", "Bảo hành nào sắp hết hạn?", "Tóm tắt phiếu sửa chữa đang chờ xử lý"))
                    .build();
        }

        if (isAssemblyQuestion(normalized)) {
            return AiChatResponse.builder()
                    .intent("ASSEMBLY_GUIDE")
                    .answer("""
                            Quy trình Lắp ráp / Dựng máy PC hoàn chỉnh trên hệ thống DLC-WMS:
                            1. Quản lý Cấu hình (BOM): Vào module Quản lý cấu hình để thiết lập định mức vật tư gồm các linh kiện cốt lõi (Vỏ Case, Mainboard, CPU, RAM, VGA, Ổ cứng SSD, Nguồn PSU, Tản nhiệt).
                            2. Tạo Lệnh lắp ráp (Assembly Order): Chọn cấu hình máy thành phẩm cần dựng, kho thực hiện và số lượng máy.
                            3. Kiểm tra Tồn kho Linh kiện: Hệ thống tự động đối chiếu tồn kho On-hand của từng linh kiện thành phần theo định mức BOM.
                            4. Gán Serial Cha-Con: Đối với các linh kiện quản lý theo Serial (CPU, VGA, Mainboard), hệ thống tự động khóa Serial linh kiện vào Serial thân máy (DeviceComponentSerial).
                            5. Xác nhận Hoàn thành: Hệ thống tự động sinh Phiếu xuất kho trừ tồn linh kiện và sinh Phiếu nhập kho cho máy Thành phẩm (Finished Goods).
                            """.trim())
                    .sources(List.of(
                            source("process", "ASSEMBLY_ORDERS, ASSEMBLY_BOM", "Quy trình lắp ráp và dựng máy tính"),
                            source("process", "DEVICE_COMPONENT_SERIALS", "Khóa liên kết Serial linh kiện vào thân máy PC")
                    ))
                    .suggestions(List.of("Lệnh lắp ráp đang chờ", "Tìm BOM", "Kiểm tra tồn linh kiện dựng máy"))
                    .build();
        }

        return AiChatResponse.builder()
                .intent("PROCESS_GUIDE")
                .answer("Bạn muốn hướng dẫn module nào? Hiện tại mình có thể hướng dẫn nhanh về nhập kho, xuất kho/bán hàng, chuyển kho, bảo hành, sửa chữa, tồn kho và lắp ráp/dựng máy.")
                .sources(List.of(source("process", "AI_PROCESS_KNOWLEDGE", "Bộ hướng dẫn nghiệp vụ nội bộ của chatbot")))
                .suggestions(List.of("Hướng dẫn tạo phiếu nhập kho", "Hướng dẫn tạo phiếu xuất kho", "Hướng dẫn quy trình dựng máy PC"))
                .build();
    }

    private boolean isSystemOverviewQuestion(String normalized) {
        return normalized.contains("tong quan")
                || normalized.contains("toan bo")
                || normalized.contains("tat ca")
                || normalized.contains("he thong")
                || normalized.contains("doc het")
                || normalized.contains("co nhung gi")
                || normalized.contains("dashboard");
    }

    private boolean isProductQuestion(String normalized) {
        return normalized.contains("san pham")
                || normalized.contains("hang hoa")
                || normalized.contains("sku")
                || normalized.contains("barcode")
                || normalized.contains("bien the");
    }

    private boolean isPartnerQuestion(String normalized) {
        return normalized.contains("khach hang")
                || normalized.contains("customer")
                || normalized.contains("nha cung cap")
                || normalized.contains("supplier")
                || normalized.contains("doi tac");
    }

    private boolean isWarrantyQuestion(String normalized) {
        return normalized.contains("bao hanh")
                || normalized.contains("warranty")
                || normalized.contains("serial");
    }

    private boolean isRepairQuestion(String normalized) {
        return normalized.contains("sua chua")
                || normalized.contains("repair")
                || normalized.contains("phieu sua");
    }

    private boolean isGuideQuestion(String normalized) {
        return normalized.contains("huong dan")
                || normalized.contains("cach ")
                || normalized.startsWith("cach")
                || normalized.contains("quy trinh")
                || normalized.contains("tao phieu")
                || normalized.contains("lap phieu")
                || normalized.contains("lam sao")
                || normalized.contains("nhu the nao")
                || normalized.contains("thao tac");
    }

    private boolean isTransferQuestion(String normalized) {
        return normalized.contains("chuyen kho")
                || normalized.contains("transfer");
    }

    private boolean isAssemblyQuestion(String normalized) {
        return normalized.contains("lap rap")
                || normalized.contains("thao do")
                || normalized.contains("dung may")
                || normalized.contains("dung pc")
                || normalized.contains("build pc")
                || normalized.contains("build may")
                || normalized.contains("rap may")
                || normalized.contains("cau hinh")
                || normalized.contains("assembly")
                || normalized.contains("bom");
    }

    private boolean isGreeting(String normalized) {
        String regex = "^(hi|hello|chao|xin chao|helo|alo|ê|hey)(.*)?$";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(normalized);
        return matcher.matches();
    }

    private boolean isCountQuestion(String normalized) {
        return normalized.contains("co may")
                || normalized.contains("bao nhieu")
                || normalized.contains("so luong")
                || normalized.contains("tong so")
                || normalized.contains("dem")
                || normalized.contains("count");
    }

    // Pattern ranh giới từ nguyên vẹn (\b...\b) chống lỗi cắt nhầm/nuốt chữ con của các sản phẩm như UltraSharp, Xprinter, GTX...
    private static final Pattern STOPWORDS_REGEX = Pattern.compile(
            "\\b(tim|kiem|tra|cuu|cho|toi|xem|doc|du lieu|co may|bao nhieu|so luong|tong so|dem|count|"
            + "san pham|hang hoa|sku|barcode|bien the|khach hang|customer|nha cung cap|supplier|doi tac|"
            + "nhap kho|phieu nhap|xuat kho|phieu xuat|don mua|don ban|don hang|phieu|"
            + "bao hanh|warranty|serial|sua chua|repair|phieu sua|chuyen kho|transfer|lap rap|thao do|"
            + "dung may|dung pc|build pc|build may|rap may|cau hinh|assembly|bom|theo|ma|ten|so dien thoai|hien tai|gan nhat|co|may)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private String extractSearchKeyword(String message) {
        String normalized = normalize(message);
        // Dùng Word Boundary Regex thay vì String.replace() để bảo vệ an toàn các thương hiệu và model sản phẩm
        String cleaned = STOPWORDS_REGEX.matcher(normalized).replaceAll(" ");
        String keyword = cleaned.replaceAll("[^a-z0-9_-]+", " ").trim().replaceAll("\\s+", " ");
        return keyword.length() < 2 ? "" : keyword;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String shortText(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.length() <= 80 ? value : value.substring(0, 77) + "...";
    }

    private AiSourceResponse source(String type, String name, String description) {
        return AiSourceResponse.builder()
                .type(type)
                .name(name)
                .description(description)
                .build();
    }

    private List<AiSourceResponse> allSystemSources() {
        return List.of(
                source("database", "WAREHOUSES", "Dữ liệu kho"),
                source("database", "PRODUCTS, PRODUCT_VARIANTS", "Dữ liệu sản phẩm và SKU"),
                source("database", "INVENTORY_BALANCES", "Dữ liệu tồn kho"),
                source("database", "PURCHASE_ORDERS", "Dữ liệu đơn mua hàng (PO)"),
                source("database", "SALES_ORDERS", "Dữ liệu đơn bán hàng (SO)"),
                source("database", "PARTNERS", "Dữ liệu khách hàng và nhà cung cấp"),
                source("database", "WARRANTIES", "Dữ liệu bảo hành"),
                source("database", "REPAIRS", "Dữ liệu sửa chữa"),
                source("database", "STOCK_TRANSFERS", "Dữ liệu chuyển kho"),
                source("database", "ASSEMBLY_ORDERS", "Dữ liệu lắp ráp/tháo dỡ")
        );
    }

    private AiChatResponse answerLowStock() {
        List<WarehouseStockAiRow> rows = inventoryBalanceRepository.findLowStockRowsForAi(PageRequest.of(0, MAX_ROWS_IN_ANSWER));

        if (rows.isEmpty()) {
            return AiChatResponse.builder()
                    .intent("LOW_STOCK_QUERY")
                    .answer("Hiện chưa có dữ liệu tồn kho trong hệ thống để xác định sản phẩm nào đang thấp.")
                    .sources(warehouseStockSources())
                    .suggestions(defaultSuggestions())
                    .build();
        }

        StringBuilder answer = new StringBuilder();
        answer.append("Các SKU đang có tồn khả dụng thấp nhất hiện tại:");
        for (int i = 0; i < rows.size(); i++) {
            WarehouseStockAiRow row = rows.get(i);
            answer.append("\n")
                    .append(i + 1)
                    .append(". ")
                    .append(row.getProductName())
                    .append(" - ")
                    .append(row.getVariantName())
                    .append(" (SKU: ")
                    .append(row.getSku())
                    .append(", kho ")
                    .append(row.getWarehouseName())
                    .append("/")
                    .append(row.getWarehouseCode())
                    .append("): tồn ")
                    .append(formatNumber(row.getQuantityOnHand()))
                    .append(", giữ chỗ ")
                    .append(formatNumber(row.getQuantityReserved()))
                    .append(", khả dụng ")
                    .append(formatNumber(row.getAvailableQuantity()));
        }

        answer.append("\n\nĐây là danh sách sắp xếp tăng dần theo số lượng khả dụng. Nếu cần ngưỡng cảnh báo riêng, ví dụ dưới 5 hoặc dưới 10, bạn có thể hỏi: \"SKU nào tồn dưới 5?\".");

        return AiChatResponse.builder()
                .intent("LOW_STOCK_QUERY")
                .answer(answer.toString())
                .sources(warehouseStockSources())
                .suggestions(List.of(
                        "Kho A có bao nhiêu hàng?",
                        "SKU nào tồn dưới 5?",
                        "Giá trị tồn kho kho A là bao nhiêu?"
                ))
                .build();
    }

    private AiChatResponse answerWarehouseStock(String originalMessage, String normalizedMessage) {
        Optional<Warehouse> warehouse = resolveWarehouse(originalMessage, normalizedMessage);
        if (warehouse.isEmpty()) {
            return AiChatResponse.builder()
                    .intent("WAREHOUSE_STOCK_QUERY")
                    .answer("Mình nhận ra bạn đang hỏi về tồn kho, nhưng chưa xác định được kho nào. Hãy hỏi rõ hơn, ví dụ: \"Kho A có bao nhiêu hàng?\" hoặc dùng mã kho như \"Tồn kho WH001\".")
                    .sources(List.of(AiSourceResponse.builder()
                            .type("database")
                            .name("WAREHOUSES")
                            .description("Dùng để tìm kho theo mã hoặc tên")
                            .build()))
                    .suggestions(defaultSuggestions())
                    .build();
        }

        Warehouse selectedWarehouse = warehouse.get();
        List<WarehouseStockAiRow> rows = inventoryBalanceRepository.findStockRowsForAiByWarehouseId(selectedWarehouse.getId());

        if (rows.isEmpty()) {
            return AiChatResponse.builder()
                    .intent("WAREHOUSE_STOCK_QUERY")
                    .answer("Kho " + displayWarehouse(selectedWarehouse) + " hiện chưa có tồn kho được ghi nhận trong hệ thống.")
                    .sources(warehouseStockSources())
                    .suggestions(defaultSuggestions())
                    .build();
        }

        BigDecimal totalQuantity = rows.stream()
                .map(WarehouseStockAiRow::getQuantityOnHand)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAvailable = rows.stream()
                .map(WarehouseStockAiRow::getAvailableQuantity)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalValue = rows.stream()
                .map(WarehouseStockAiRow::getInventoryValue)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<WarehouseStockAiRow> topRows = rows.stream()
                .sorted(Comparator.comparing(WarehouseStockAiRow::getQuantityOnHand, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_ROWS_IN_ANSWER)
                .toList();

        StringBuilder answer = new StringBuilder();
        answer.append("Kho ").append(displayWarehouse(selectedWarehouse))
                .append(" hiện có tổng số lượng tồn là ")
                .append(formatNumber(totalQuantity))
                .append(", khả dụng ")
                .append(formatNumber(totalAvailable))
                .append(", với ")
                .append(rows.size())
                .append(" dòng tồn kho.");

        answer.append("\n\nCác mặt hàng nổi bật:");
        for (int i = 0; i < topRows.size(); i++) {
            WarehouseStockAiRow row = topRows.get(i);
            answer.append("\n")
                    .append(i + 1)
                    .append(". ")
                    .append(row.getProductName())
                    .append(" - ")
                    .append(row.getVariantName())
                    .append(" (SKU: ")
                    .append(row.getSku())
                    .append("): tồn ")
                    .append(formatNumber(row.getQuantityOnHand()))
                    .append(", khả dụng ")
                    .append(formatNumber(row.getAvailableQuantity()));
        }

        if (rows.size() > MAX_ROWS_IN_ANSWER) {
            answer.append("\n... va ")
                    .append(rows.size() - MAX_ROWS_IN_ANSWER)
                    .append(" dòng tồn kho khác.");
        }

        answer.append("\n\nGiá trị tồn kho ước tính: ")
                .append(formatMoney(totalValue))
                .append(". Số liệu lấy trực tiếp từ database tại thời điểm truy vấn.");

        return AiChatResponse.builder()
                .intent("WAREHOUSE_STOCK_QUERY")
                .answer(answer.toString())
                .sources(warehouseStockSources())
                .suggestions(List.of(
                        "Sản phẩm nào trong kho này sắp hết?",
                        "Giá trị tồn kho của kho này là bao nhiêu?",
                        "Liệt kê 10 SKU tồn nhiều nhất"
                ))
                .build();
    }

    private boolean isWarehouseStockQuestion(String normalized) {
        boolean mentionsWarehouse = normalized.contains("kho") || normalized.contains("warehouse");
        boolean mentionsStock = normalized.contains("ton")
                || normalized.contains("hang")
                || normalized.contains("san pham")
                || normalized.contains("sku")
                || normalized.contains("so luong")
                || normalized.contains("bao nhieu");
        return mentionsWarehouse && mentionsStock;
    }

    private boolean isWarehouseListQuestion(String normalized) {
        return (normalized.contains("kho") || normalized.contains("warehouse"))
                && (normalized.contains("nhung") || normalized.contains("danh sach") || normalized.contains("liet ke") || normalized.contains("cac"));
    }

    private AiChatResponse answerWarehouseList() {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        StringBuilder answer = new StringBuilder("Hệ thống hiện tại có " + warehouses.size() + " kho:\n");
        for (Warehouse w : warehouses) {
            answer.append("- Kho ").append(w.getName()).append(" (Mã: ").append(w.getCode()).append(")\n");
        }
        answer.append("\nBạn có thể hỏi chi tiết về một kho cụ thể, ví dụ: \"Tồn kho của kho ").append(warehouses.isEmpty() ? "A" : warehouses.get(0).getName()).append("\"");

        return AiChatResponse.builder()
                .intent("WAREHOUSE_LIST_QUERY")
                .answer(answer.toString())
                .sources(List.of(AiSourceResponse.builder()
                        .type("database")
                        .name("WAREHOUSES")
                        .description("Danh sách tất cả các kho trong hệ thống")
                        .build()))
                .suggestions(List.of("Tồn kho kho " + (warehouses.isEmpty() ? "A" : warehouses.get(0).getName()), "Sản phẩm nào sắp hết hàng?"))
                .build();
    }

    private boolean isLowStockQuestion(String normalized) {
        boolean mentionsStock = normalized.contains("ton")
                || normalized.contains("hang")
                || normalized.contains("san pham")
                || normalized.contains("sku");
        boolean mentionsLow = normalized.contains("thap")
                || normalized.contains("sap het")
                || normalized.contains("gan het")
                || normalized.contains("duoi")
                || normalized.contains("it nhat");
        return mentionsStock && mentionsLow;
    }

    private Optional<Warehouse> resolveWarehouse(String originalMessage, String normalizedMessage) {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        if (warehouses.isEmpty()) {
            return Optional.empty();
        }

        String normalizedOriginal = normalize(originalMessage);
        Optional<Warehouse> exactMatch = warehouses.stream()
                .filter(warehouse -> normalizedOriginal.contains(normalize(warehouse.getCode()))
                        || normalizedOriginal.contains(normalize(warehouse.getName())))
                .findFirst();
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        Optional<String> candidate = extractWarehouseCandidate(normalizedMessage);
        if (candidate.isEmpty()) {
            return Optional.empty();
        }

        String candidateValue = candidate.get();
        return warehouses.stream()
                .filter(warehouse -> normalize(warehouse.getCode()).contains(candidateValue)
                        || normalize(warehouse.getName()).contains(candidateValue)
                        || candidateValue.contains(normalize(warehouse.getCode()))
                        || candidateValue.contains(normalize(warehouse.getName())))
                .findFirst();
    }

    private Optional<String> extractWarehouseCandidate(String normalizedMessage) {
        List<Pattern> patterns = List.of(
                Pattern.compile("\\bkho\\s+([a-z0-9_-]+)"),
                Pattern.compile("\\bwarehouse\\s+([a-z0-9_-]+)")
        );

        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(normalizedMessage);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
        }
        return Optional.empty();
    }

    private List<AiSourceResponse> warehouseStockSources() {
        List<AiSourceResponse> sources = new ArrayList<>();
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("WAREHOUSES")
                .description("Xác định kho theo mã và tên")
                .build());
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("INVENTORY_BALANCES")
                .description("Lấy số lượng tồn, số lượng giữ chỗ và giá trị tồn")
                .build());
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("PRODUCT_VARIANTS, PRODUCTS")
                .description("Lấy SKU, tên biến thể và tên sản phẩm")
                .build());
        return sources;
    }

    private List<String> defaultSuggestions() {
        return List.of(
                "Kho A có bao nhiêu hàng?",
                "Tồn kho kho HN hiện tại",
                "Kho nào đang có nhiều SKU nhất?"
        );
    }

    private String displayWarehouse(Warehouse warehouse) {
        return warehouse.getName() + " (" + warehouse.getCode() + ")";
    }

    private String formatNumber(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private String formatMoney(BigDecimal value) {
        return formatNumber(value) + " VND";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT).trim();
    }
}
