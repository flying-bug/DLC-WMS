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
    private final AiModelClient aiModelClient;

    @Transactional(readOnly = true)
    public AiChatResponse chat(String rawMessage) {
        String message = rawMessage == null ? "" : rawMessage.trim();
        String normalized = normalize(message);

        if (isSystemOverviewQuestion(normalized)) {
            return enhance(message, answerSystemOverview());
        }

        if (isLowStockQuestion(normalized)) {
            return enhance(message, answerLowStock());
        }

        if (isWarehouseStockQuestion(normalized)) {
            return enhance(message, answerWarehouseStock(message, normalized));
        }

        if (isProductQuestion(normalized)) {
            return enhance(message, answerProductSearch(message));
        }

        if (isRepairQuestion(normalized)) {
            return enhance(message, answerRepairSearch(message));
        }

        if (isPartnerQuestion(normalized)) {
            return enhance(message, answerPartnerSearch(message, normalized));
        }

        if (isWarrantyQuestion(normalized)) {
            return enhance(message, answerWarrantySearch(message));
        }

        if (isGuideQuestion(normalized)) {
            return enhance(message, answerGuideQuestion(normalized));
        }

        if (isTransferQuestion(normalized)) {
            return enhance(message, answerTransferSearch(message));
        }

        if (isAssemblyQuestion(normalized)) {
            return enhance(message, answerAssemblySearch(message));
        }

        return enhance(message, AiChatResponse.builder()
                .intent("GENERAL_NOT_CONNECTED")
                .answer("Mình chưa có bộ xử lý dữ liệu cho câu hỏi này. Hiện tại AI đã đọc được các nhóm dữ liệu chính như kho, tồn kho, sản phẩm, khách hàng, nhà cung cấp, bảo hành, sửa chữa, chuyển kho và lắp ráp/tháo dỡ. Bạn có thể hỏi ví dụ: \"Kho A có bao nhiêu hàng?\", \"Tồn kho kho HN\", \"Tìm sản phẩm Dell\".")
                .sources(List.of(AiSourceResponse.builder()
                        .type("system")
                        .name("AI router")
                        .description("Chưa tìm thấy intent phù hợp")
                        .build()))
                .suggestions(defaultSuggestions())
                .build());
    }

    private AiChatResponse enhance(String userQuestion, AiChatResponse groundedResponse) {
        return aiModelClient.enhanceAnswer(userQuestion, groundedResponse);
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
                + "- Lệnh lắp ráp/tháo dỡ: " + assemblyOrderRepository.count() + "\n\n"
                + "Bạn có thể hỏi tiếp theo module, ví dụ: \"tìm sản phẩm Dell\", \"bảo hành serial ABC\", \"phiếu sửa chữa đang chờ\", \"Kho A có bao nhiêu hàng\".";

        return AiChatResponse.builder()
                .intent("SYSTEM_OVERVIEW")
                .answer(answer)
                .sources(allSystemSources())
                .suggestions(defaultSuggestions())
                .build();
    }

    private AiChatResponse answerProductSearch(String message) {
        String keyword = extractSearchKeyword(message);
        Page<Product> products = productRepository.searchProducts(keyword, PageRequest.of(0, 5));
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
        Page<Repair> repairs = repairRepository.searchRepairs(blankToNull(keyword), null, PageRequest.of(0, 8));
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

                            Lưu ý: nếu không thấy SKU hoặc số lượng không hợp lệ, hãy kiểm tra lại tồn kho, trạng thái sản phẩm và quyền thao tác của tài khoản.
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
                            Để tạo lệnh lắp ráp/tháo dỡ:
                            1. Vào module Lắp ráp/Tháo dỡ.
                            2. Chọn loại lệnh: lắp ráp hoặc tháo dỡ.
                            3. Chọn sản phẩm thành phẩm, kho thực hiện và số lượng.
                            4. Kiểm tra định mức/BOM và tồn nguyên vật liệu.
                            5. Lưu lệnh, sau đó xác nhận thực hiện để hệ thống cập nhật tồn kho.
                            """.trim())
                    .sources(List.of(source("process", "ASSEMBLY_ORDERS, ASSEMBLY_ORDER_LINES", "Quy trình lắp ráp/tháo dỡ")))
                    .suggestions(List.of("Lệnh lắp ráp đang chờ", "Tìm BOM", "Tồn nguyên vật liệu hiện tại"))
                    .build();
        }

        return AiChatResponse.builder()
                .intent("PROCESS_GUIDE")
                .answer("Bạn muốn hướng dẫn module nào? Hiện tại mình có thể hướng dẫn nhanh về chuyển kho, bảo hành, sửa chữa, tồn kho và lắp ráp/tháo dỡ.")
                .sources(List.of(source("process", "AI_PROCESS_KNOWLEDGE", "Bộ hướng dẫn nghiệp vụ nội bộ của chatbot")))
                .suggestions(List.of("Hướng dẫn tạo phiếu chuyển kho", "Hướng dẫn tra cứu bảo hành", "Hướng dẫn tạo lệnh lắp ráp"))
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
                || normalized.contains("assembly")
                || normalized.contains("bom");
    }

    private boolean isCountQuestion(String normalized) {
        return normalized.contains("co may")
                || normalized.contains("bao nhieu")
                || normalized.contains("so luong")
                || normalized.contains("tong so")
                || normalized.contains("dem")
                || normalized.contains("count");
    }

    private String extractSearchKeyword(String message) {
        String normalized = normalize(message);
        List<String> noiseWords = List.of(
                "tim", "kiem", "tra", "cuu", "cho", "toi", "xem", "doc", "du lieu",
                "co", "may", "co may", "bao nhieu", "so luong", "tong so", "dem", "count",
                "san pham", "hang hoa", "sku", "barcode", "bien the",
                "khach hang", "customer", "nha cung cap", "supplier", "doi tac",
                "bao hanh", "warranty", "serial", "sua chua", "repair", "phieu sua",
                "chuyen kho", "transfer", "lap rap", "thao do", "assembly", "bom",
                "theo", "ma", "ten", "so dien thoai", "hien tai", "gan nhat"
        );

        String keyword = normalized;
        for (String noise : noiseWords) {
            keyword = keyword.replace(noise, " ");
        }
        keyword = keyword.replaceAll("[^a-z0-9_-]+", " ").trim().replaceAll("\\s+", " ");
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
