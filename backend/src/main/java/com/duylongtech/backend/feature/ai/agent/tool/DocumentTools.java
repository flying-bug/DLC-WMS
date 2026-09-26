package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.enums.WarrantyStatus;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLine;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairLine;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.StockTransfer;
import com.duylongtech.backend.feature.warehouse.StockTransferLine;
import com.duylongtech.backend.feature.warehouse.StockTransferRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLine;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Công cụ tra cứu chứng từ (chỉ đọc): phiếu nhập, xuất, chuyển kho, đơn mua (PO), đơn bán (SO), sửa chữa, bảo hành,
 * lắp ráp/tháo dỡ. Bảng quyền chép đúng từ router cũ trong AiChatService để hai đường trả lời không lệch quyền nhau.
 * Phạm vi kho: nhập, xuất, lắp ráp theo kho của phiếu; chuyển kho theo kho đi HOẶC kho đến; PO, SO, sửa chữa, bảo hành
 * không giới hạn theo kho (giống màn hình danh sách). Tiền chỉ trả về cho vai trò được xem giá, không được xem thì bỏ
 * hẳn trường tiền chứ không trả 0.
 */
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DocumentTools {

    private static final int MAX_TEXT = 200;
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter VN_INPUT_DATE = DateTimeFormatter.ofPattern("d/M/yyyy");

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final StockTransferRepository stockTransferRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final RepairRepository repairRepository;
    private final WarrantyRepository warrantyRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PartnerRepository partnerRepository;
    private final AiToolSupport support;

    enum DocType {
        IMPORT("import", "phiếu nhập kho", true, "import:view"),
        EXPORT("export", "phiếu xuất kho", true, "export:view"),
        TRANSFER("transfer", "phiếu chuyển kho", true, "transfer:view"),
        PURCHASE_ORDER("purchase_order", "đơn mua hàng", false, "purchase_order:view"),
        SALES_ORDER("sales_order", "đơn bán hàng", true, "sales_order:view"),
        REPAIR("repair", "phiếu sửa chữa", false, "repair:view"),
        WARRANTY("warranty", "phiếu bảo hành", false, "warranty:view"),
        ASSEMBLY("assembly", "lệnh lắp ráp/tháo dỡ", true, "assembly:view", "assembly_config:view");

        final String key;
        final String label;
        /** Có lọc được theo tham số warehouse không. */
        final boolean filterableByWarehouse;
        final String[] permissions;

        DocType(String key, String label, boolean filterableByWarehouse, String... permissions) {
            this.key = key;
            this.label = label;
            this.filterableByWarehouse = filterableByWarehouse;
            this.permissions = permissions;
        }

        static DocType parse(String raw) {
            String wanted = AiToolSupport.normalize(raw).replace('-', '_').replace(' ', '_');
            for (DocType type : values()) {
                if (type.key.equals(wanted)) {
                    return type;
                }
            }
            return switch (wanted) {
                case "po" -> PURCHASE_ORDER;
                case "so" -> SALES_ORDER;
                default -> null;
            };
        }

        static String keys() {
            return Arrays.stream(values()).map(type -> type.key).collect(Collectors.joining(" | "));
        }

        /** Các loại mà thủ kho chỉ được xem trong kho được giao. */
        boolean scopedByWarehouse() {
            return this == IMPORT || this == EXPORT || this == TRANSFER || this == ASSEMBLY;
        }
    }

    /** Kết quả xử lý tham số kho: hoặc lỗi, hoặc id kho cần lọc (null = không lọc), kèm ghi chú nếu bỏ qua. */
    private record WarehouseFilter(Long warehouseId, Map<String, Object> error, String note) {
    }

    // =====================================================================================================
    // findDocuments
    // =====================================================================================================

    @Tool(description = "Tìm chứng từ theo loại, kèm bộ lọc tùy chọn: từ khóa, mã trạng thái, khoảng ngày và kho. "
            + "Trả về danh sách rút gọn (mã, ngày, trạng thái, kho, đối tác...) và totalMatches = tổng số chứng từ khớp "
            + "(dùng để trả lời câu hỏi 'có bao nhiêu'). Muốn xem dòng hàng của một chứng từ thì gọi tiếp getDocumentDetail "
            + "với mã lấy từ kết quả này.")
    public Map<String, Object> findDocuments(
            @ToolParam(description = "Loại chứng từ: import (phiếu nhập kho) | export (phiếu xuất kho) | transfer (phiếu chuyển kho) "
                    + "| purchase_order (đơn mua hàng, PO) | sales_order (đơn bán hàng, SO) | repair (sửa chữa) "
                    + "| warranty (bảo hành) | assembly (lắp ráp/tháo dỡ)") String type,
            @ToolParam(description = "Từ khóa: mã chứng từ, SKU, serial hoặc tên đối tác tùy loại. Bỏ trống để lấy các chứng từ mới nhất",
                    required = false) String keyword,
            @ToolParam(description = "Mã trạng thái tiếng Anh viết hoa, ví dụ DRAFT, POSTED, CANCELLED. Không chắc thì bỏ trống; "
                    + "nếu mã sai, kết quả sẽ có availableStatuses để chọn lại", required = false) String status,
            @ToolParam(description = "Từ ngày, định dạng yyyy-MM-dd", required = false) String fromDate,
            @ToolParam(description = "Đến ngày, định dạng yyyy-MM-dd", required = false) String toDate,
            @ToolParam(description = "Mã hoặc tên kho; chỉ áp dụng cho import, export, transfer, sales_order, assembly",
                    required = false) String warehouse,
            @ToolParam(description = "Số dòng tối đa (mặc định và tối đa là 10)", required = false) Integer limit) {
        DocType docType = DocType.parse(type);
        Map<String, Object> denied = support.begin("findDocuments",
                "type=" + type + ", keyword=" + keyword + ", status=" + status + ", from=" + fromDate + ", to=" + toDate
                        + ", warehouse=" + warehouse,
                docType == null ? "chứng từ" : docType.label,
                docType == null ? new String[0] : docType.permissions);
        if (denied != null) {
            return denied;
        }
        if (docType == null) {
            return AiToolSupport.error("Loại chứng từ '" + support.keyword(type) + "' không hợp lệ. Chọn một trong: " + DocType.keys());
        }

        LocalDate from;
        LocalDate to;
        try {
            from = parseDate(fromDate);
            to = parseDate(toDate);
        } catch (DateTimeParseException ex) {
            return AiToolSupport.error("Ngày không hợp lệ. Dùng định dạng yyyy-MM-dd, ví dụ 2026-09-01.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            return AiToolSupport.error("fromDate đang sau toDate. Hãy đổi lại khoảng ngày.");
        }

        WarehouseFilter warehouseFilter = resolveWarehouse(docType, warehouse);
        if (warehouseFilter.error() != null) {
            return warehouseFilter.error();
        }

        String cleaned = blankToNull(support.keyword(keyword));
        String wantedStatus = blankToNull(status == null ? null : status.trim().toUpperCase(Locale.ROOT));
        int max = support.limit(limit);
        Long warehouseId = warehouseFilter.warehouseId();

        Map<String, Object> result = switch (docType) {
            case IMPORT, EXPORT -> findInventoryDocuments(docType, cleaned, wantedStatus, from, to, warehouseId, max);
            case TRANSFER -> findTransfers(cleaned, wantedStatus, from, to, warehouseId, max);
            case ASSEMBLY -> findAssemblyOrders(cleaned, wantedStatus, from, to, warehouseId, max);
            case PURCHASE_ORDER -> findPurchaseOrders(cleaned, wantedStatus, from, to, max);
            case SALES_ORDER -> findSalesOrders(cleaned, wantedStatus, from, to, warehouseId, max);
            case REPAIR -> findRepairs(cleaned, wantedStatus, from, to, max);
            case WARRANTY -> findWarranties(cleaned, wantedStatus, from, to, max);
        };
        if (warehouseFilter.note() != null && Boolean.TRUE.equals(result.get("ok"))) {
            result.put("note", warehouseFilter.note());
        }
        return result;
    }

    private Map<String, Object> findInventoryDocuments(DocType docType, String keyword, String status, LocalDate from,
                                                       LocalDate to, Long warehouseId, int max) {
        List<Long> allowed = support.allowedWarehouseIds();
        List<InventoryDocument> candidates;
        if (allowed != null && allowed.isEmpty()) {
            candidates = List.of();
        } else if (docType == DocType.IMPORT) {
            candidates = inventoryDocumentRepository.searchImports(keyword, from, to, null, warehouseId,
                    null, null, null, null, null, allowed);
        } else {
            candidates = inventoryDocumentRepository.searchExports(keyword, from, to, null, warehouseId,
                    null, null, null, null, null, allowed);
        }
        Map<Long, String> warehouses = support.warehouseLabels();
        return listResult(docType, candidates, InventoryDocument::getStatus, status, max, shown -> {
            Map<Long, String> partners = partnerNames(shown.stream().map(InventoryDocument::getPartnerId).toList());
            List<Map<String, Object>> rows = new ArrayList<>();
            for (InventoryDocument doc : shown) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("code", doc.getDocCode());
                row.put("date", displayDate(doc.getDocDate()));
                row.put("status", doc.getStatus());
                row.put("warehouse", warehouses.get(doc.getWarehouseId()));
                putIfPresent(row, "partner", partners.get(doc.getPartnerId()));
                row.put("itemCount", doc.getLines() == null ? 0 : doc.getLines().size());
                rows.add(row);
            }
            return rows;
        });
    }

    private Map<String, Object> findTransfers(String keyword, String status, LocalDate from, LocalDate to, Long warehouseId, int max) {
        List<Long> allowed = support.allowedWarehouseIds();
        List<StockTransfer> candidates = stockTransferRepository.searchTransfers(keyword, from, to, null).stream()
                .filter(t -> allowed == null || allowed.contains(t.getFromWarehouseId()) || allowed.contains(t.getToWarehouseId()))
                .filter(t -> warehouseId == null || warehouseId.equals(t.getFromWarehouseId()) || warehouseId.equals(t.getToWarehouseId()))
                .toList();
        Map<Long, String> warehouses = support.warehouseLabels();
        return listResult(DocType.TRANSFER, candidates, StockTransfer::getStatus, status, max, shown -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (StockTransfer transfer : shown) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("code", transfer.getTransferCode());
                row.put("date", displayDate(transfer.getTransferDate()));
                row.put("status", transfer.getStatus());
                row.put("fromWarehouse", warehouses.get(transfer.getFromWarehouseId()));
                row.put("toWarehouse", warehouses.get(transfer.getToWarehouseId()));
                row.put("itemCount", transfer.getLines() == null ? 0 : transfer.getLines().size());
                rows.add(row);
            }
            return rows;
        });
    }

    private Map<String, Object> findAssemblyOrders(String keyword, String status, LocalDate from, LocalDate to, Long warehouseId, int max) {
        List<Long> allowed = support.allowedWarehouseIds();
        List<AssemblyOrder> candidates = assemblyOrderRepository.search(keyword, null, null, warehouseId, from, to).stream()
                .filter(order -> allowed == null || allowed.contains(order.getWarehouseId()))
                .toList();
        Map<Long, String> warehouses = support.warehouseLabels();
        return listResult(DocType.ASSEMBLY, candidates, AssemblyOrder::getStatus, status, max, shown -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (AssemblyOrder order : shown) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("code", order.getOrderCode());
                row.put("orderType", order.getOrderType());
                row.put("date", displayDate(order.getExecutionDate()));
                row.put("status", order.getStatus());
                row.put("warehouse", warehouses.get(order.getWarehouseId()));
                putIfPresent(row, "product", variantName(order.getTargetVariant()));
                row.put("quantity", order.getQuantity());
                rows.add(row);
            }
            return rows;
        });
    }

    private Map<String, Object> findPurchaseOrders(String keyword, String status, LocalDate from, LocalDate to, int max) {
        List<PurchaseOrder> candidates = purchaseOrderRepository.findAllWithFilters(keyword, null, null, from, to);
        boolean canSeeMoney = support.canViewPricing();
        return listResult(DocType.PURCHASE_ORDER, candidates, PurchaseOrder::getStatus, status, max, shown -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (PurchaseOrder order : shown) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("code", order.getPoCode());
                row.put("date", displayDate(order.getPoDate()));
                row.put("status", order.getStatus());
                row.put("supplier", order.getPartner() != null ? order.getPartner().getName() : null);
                putIfPresent(row, "expectedDeliveryDate", displayDate(order.getExpectedDeliveryDate()));
                row.put("paymentStatus", order.getPaymentStatus());
                if (canSeeMoney) {
                    row.put("totalAmount", order.getTotalAmount());
                    row.put("paidAmount", order.getPaidAmount());
                }
                rows.add(row);
            }
            return rows;
        });
    }

    private Map<String, Object> findSalesOrders(String keyword, String status, LocalDate from, LocalDate to, Long warehouseId, int max) {
        List<SalesOrder> candidates = salesOrderRepository.findAllWithFilters(keyword, null, null, null, null, warehouseId, from, to);
        boolean canSeeMoney = support.canViewPricing();
        Map<Long, String> warehouses = support.warehouseLabels();
        return listResult(DocType.SALES_ORDER, candidates, SalesOrder::getStatus, status, max, shown -> {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (SalesOrder order : shown) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("code", order.getSoCode());
                row.put("date", displayDate(order.getSoDate()));
                row.put("status", order.getStatus());
                row.put("customer", order.getPartner() != null ? order.getPartner().getName() : "Khách lẻ");
                putIfPresent(row, "warehouse", warehouses.get(order.getWarehouseId()));
                row.put("paymentStatus", order.getPaymentStatus());
                if (canSeeMoney) {
                    row.put("totalAmount", order.getTotalAmount());
                    row.put("paidAmount", order.getPaidAmount());
                }
                rows.add(row);
            }
            return rows;
        });
    }

    private Map<String, Object> findRepairs(String keyword, String status, LocalDate from, LocalDate to, int max) {
        List<String> valid = Arrays.stream(RepairStatus.values()).map(Enum::name).toList();
        if (status != null && !valid.contains(status)) {
            return invalidStatus(DocType.REPAIR, status, valid);
        }
        Page<Repair> page = repairRepository.searchRepairs(keyword, status, from, to, PageRequest.of(0, max));
        boolean canSeeMoney = support.canViewPricing();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Repair repair : page.getContent()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", repair.getRepairCode());
            row.put("receivedDate", displayDate(repair.getReceivedDate()));
            putIfPresent(row, "expectedDate", displayDate(repair.getExpectedDate()));
            row.put("status", repair.getRepairStatus());
            putIfPresent(row, "issue", shortText(repair.getIssueDescription()));
            row.put("underWarranty", Boolean.TRUE.equals(repair.getUnderWarranty()));
            if (canSeeMoney) {
                row.put("totalAmount", repair.getTotalAmount());
            }
            rows.add(row);
        }
        return pageResult(DocType.REPAIR, rows, page.getTotalElements());
    }

    private Map<String, Object> findWarranties(String keyword, String status, LocalDate from, LocalDate to, int max) {
        List<String> valid = Arrays.stream(WarrantyStatus.values()).map(Enum::name).toList();
        if (status != null && !valid.contains(status)) {
            return invalidStatus(DocType.WARRANTY, status, valid);
        }
        Page<Warranty> page = warrantyRepository.searchWarranties(keyword, status, from, to, PageRequest.of(0, max));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Warranty warranty : page.getContent()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", warranty.getWarrantyCode());
            row.put("customer", warranty.getPartner() != null ? warranty.getPartner().getName() : null);
            row.put("startDate", displayDate(warranty.getStartDate()));
            row.put("endDate", displayDate(warranty.getEndDate()));
            row.put("status", warranty.getWarrantyStatus());
            rows.add(row);
        }
        Map<String, Object> result = pageResult(DocType.WARRANTY, rows, page.getTotalElements());
        if (from != null || to != null) {
            result.put("dateFilter", "Với bảo hành: fromDate lọc theo ngày bắt đầu, toDate lọc theo ngày hết hạn.");
        }
        return result;
    }

    // =====================================================================================================
    // getDocumentDetail
    // =====================================================================================================

    @Tool(description = "Xem chi tiết MỘT chứng từ theo mã chính xác (lấy từ findDocuments): thông tin chung và các dòng hàng "
            + "(SKU, tên hàng, số lượng; đơn giá nếu người dùng được xem giá), tối đa 10 dòng.")
    public Map<String, Object> getDocumentDetail(
            @ToolParam(description = "Loại chứng từ: import | export | transfer | purchase_order | sales_order | repair | warranty | assembly")
            String type,
            @ToolParam(description = "Mã chứng từ chính xác, ví dụ NK000123, XK000045, PO000010") String code) {
        DocType docType = DocType.parse(type);
        Map<String, Object> denied = support.begin("getDocumentDetail", "type=" + type + ", code=" + code,
                docType == null ? "chứng từ" : docType.label,
                docType == null ? new String[0] : docType.permissions);
        if (denied != null) {
            return denied;
        }
        if (docType == null) {
            return AiToolSupport.error("Loại chứng từ '" + support.keyword(type) + "' không hợp lệ. Chọn một trong: " + DocType.keys());
        }
        String wanted = support.keyword(code);
        if (wanted.isBlank()) {
            return AiToolSupport.error("Thiếu mã chứng từ. Hãy gọi findDocuments để lấy mã trước.");
        }

        return switch (docType) {
            case IMPORT, EXPORT -> inventoryDocumentDetail(docType, wanted);
            case TRANSFER -> transferDetail(wanted);
            case ASSEMBLY -> assemblyDetail(wanted);
            case PURCHASE_ORDER -> purchaseOrderDetail(wanted);
            case SALES_ORDER -> salesOrderDetail(wanted);
            case REPAIR -> repairDetail(wanted);
            case WARRANTY -> warrantyDetail(wanted);
        };
    }

    private Map<String, Object> inventoryDocumentDetail(DocType docType, String code) {
        String expectedDocType = docType == DocType.IMPORT ? "IN_PO" : "EX_SO";
        Optional<InventoryDocument> found = inventoryDocumentRepository.findByDocCode(code)
                .filter(doc -> expectedDocType.equals(doc.getDocType()));
        if (found.isEmpty()) {
            return notFound(docType, code);
        }
        InventoryDocument doc = found.get();
        Map<Long, String> warehouses = support.warehouseLabels();
        if (!support.canAccessWarehouse(doc.getWarehouseId())) {
            return outOfScope(docType, code, warehouses.get(doc.getWarehouseId()));
        }

        boolean canSeeMoney = support.canViewPricing();
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", doc.getDocCode());
        header.put("type", docType.label);
        header.put("date", displayDate(doc.getDocDate()));
        header.put("status", doc.getStatus());
        header.put("warehouse", warehouses.get(doc.getWarehouseId()));
        putIfPresent(header, "partner", partnerNames(Arrays.asList(doc.getPartnerId())).get(doc.getPartnerId()));
        putIfPresent(header, "note", shortText(doc.getNote()));

        List<InventoryDocumentLine> lines = doc.getLines() == null ? List.of() : doc.getLines();
        Map<Long, ProductVariant> variants = variants(lines.stream().map(InventoryDocumentLine::getVariantId).toList());
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(variants.get(line.getVariantId()));
            row.put("quantity", docType == DocType.IMPORT ? line.getQuantityIn() : line.getQuantityOut());
            if (canSeeMoney) {
                row.put("unitPrice", line.getUnitPrice());
                row.put("lineAmount", line.getLineAmount());
            }
            putIfPresent(row, "serials", shortText(line.getSerialNumbersText()));
            return row;
        });
    }

    private Map<String, Object> transferDetail(String code) {
        Optional<StockTransfer> found = stockTransferRepository.findByTransferCode(code);
        if (found.isEmpty()) {
            return notFound(DocType.TRANSFER, code);
        }
        StockTransfer transfer = found.get();
        Map<Long, String> warehouses = support.warehouseLabels();
        if (!support.canAccessWarehouse(transfer.getFromWarehouseId()) && !support.canAccessWarehouse(transfer.getToWarehouseId())) {
            return outOfScope(DocType.TRANSFER, code, warehouses.get(transfer.getFromWarehouseId())
                    + " và " + warehouses.get(transfer.getToWarehouseId()));
        }

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", transfer.getTransferCode());
        header.put("type", DocType.TRANSFER.label);
        header.put("date", displayDate(transfer.getTransferDate()));
        header.put("status", transfer.getStatus());
        header.put("fromWarehouse", warehouses.get(transfer.getFromWarehouseId()));
        header.put("toWarehouse", warehouses.get(transfer.getToWarehouseId()));
        putIfPresent(header, "note", shortText(transfer.getNote()));

        List<StockTransferLine> lines = transfer.getLines() == null ? List.of() : transfer.getLines();
        Map<Long, ProductVariant> variants = variants(lines.stream().map(StockTransferLine::getVariantId).toList());
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(variants.get(line.getVariantId()));
            row.put("quantity", line.getQuantity());
            putIfPresent(row, "serials", shortText(line.getSerialNumbersText()));
            return row;
        });
    }

    private Map<String, Object> assemblyDetail(String code) {
        Optional<AssemblyOrder> found = assemblyOrderRepository.findFirstByOrderCode(code)
                .flatMap(order -> assemblyOrderRepository.findByIdWithLines(order.getId()));
        if (found.isEmpty()) {
            return notFound(DocType.ASSEMBLY, code);
        }
        AssemblyOrder order = found.get();
        Map<Long, String> warehouses = support.warehouseLabels();
        if (!support.canAccessWarehouse(order.getWarehouseId())) {
            return outOfScope(DocType.ASSEMBLY, code, warehouses.get(order.getWarehouseId()));
        }

        boolean canSeeMoney = support.canViewPricing();
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", order.getOrderCode());
        header.put("type", DocType.ASSEMBLY.label);
        header.put("orderType", order.getOrderType());
        header.put("date", displayDate(order.getExecutionDate()));
        header.put("status", order.getStatus());
        header.put("warehouse", warehouses.get(order.getWarehouseId()));
        putIfPresent(header, "bom", order.getBom() != null ? order.getBom().getBomCode() : null);
        putIfPresent(header, "product", variantName(order.getTargetVariant()));
        header.put("quantity", order.getQuantity());
        header.put("quantityProduced", order.getQuantityProduced());

        List<AssemblyOrderLine> lines = order.getLines() == null ? List.of() : order.getLines();
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(line.getComponentVariant());
            row.put("quantityRequired", line.getQuantityRequired());
            putIfPresent(row, "quantityActual", line.getQuantityActual());
            if (canSeeMoney) {
                row.put("unitCost", line.getUnitCost());
            }
            return row;
        });
    }

    private Map<String, Object> purchaseOrderDetail(String code) {
        Optional<PurchaseOrder> found = purchaseOrderRepository.findFirstByPoCode(code)
                .flatMap(order -> purchaseOrderRepository.findByIdWithDetails(order.getId()));
        if (found.isEmpty()) {
            return notFound(DocType.PURCHASE_ORDER, code);
        }
        PurchaseOrder order = found.get();
        boolean canSeeMoney = support.canViewPricing();
        Map<Long, String> warehouses = support.warehouseLabels();

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", order.getPoCode());
        header.put("type", DocType.PURCHASE_ORDER.label);
        header.put("date", displayDate(order.getPoDate()));
        header.put("status", order.getStatus());
        header.put("supplier", order.getPartner() != null ? order.getPartner().getName() : null);
        putIfPresent(header, "expectedDeliveryDate", displayDate(order.getExpectedDeliveryDate()));
        header.put("paymentStatus", order.getPaymentStatus());
        if (canSeeMoney) {
            header.put("subTotalAmount", order.getSubTotalAmount());
            header.put("taxAmount", order.getTaxAmount());
            header.put("totalAmount", order.getTotalAmount());
            header.put("paidAmount", order.getPaidAmount());
        }
        putIfPresent(header, "note", shortText(order.getNote()));

        List<PurchaseOrderLine> lines = order.getLines() == null ? List.of() : order.getLines();
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(line.getVariant());
            row.put("quantity", line.getQuantity());
            putIfPresent(row, "warehouse", warehouses.get(line.getWarehouseId()));
            if (canSeeMoney) {
                row.put("unitPrice", line.getUnitPrice());
                row.put("lineAmount", line.getLineAmount());
            }
            return row;
        });
    }

    private Map<String, Object> salesOrderDetail(String code) {
        Optional<SalesOrder> found = salesOrderRepository.findBySoCode(code)
                .flatMap(order -> salesOrderRepository.findByIdWithDetails(order.getId()));
        if (found.isEmpty()) {
            return notFound(DocType.SALES_ORDER, code);
        }
        SalesOrder order = found.get();
        boolean canSeeMoney = support.canViewPricing();
        Map<Long, String> warehouses = support.warehouseLabels();

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", order.getSoCode());
        header.put("type", DocType.SALES_ORDER.label);
        header.put("date", displayDate(order.getSoDate()));
        header.put("status", order.getStatus());
        header.put("customer", order.getPartner() != null ? order.getPartner().getName() : "Khách lẻ");
        putIfPresent(header, "warehouse", warehouses.get(order.getWarehouseId()));
        header.put("paymentStatus", order.getPaymentStatus());
        if (canSeeMoney) {
            header.put("subTotalAmount", order.getSubTotalAmount());
            header.put("taxAmount", order.getTaxAmount());
            header.put("totalAmount", order.getTotalAmount());
            header.put("paidAmount", order.getPaidAmount());
        }
        putIfPresent(header, "note", shortText(order.getNote()));

        List<SalesOrderLine> lines = order.getLines() == null ? List.of() : order.getLines();
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(line.getVariant());
            row.put("quantity", line.getQuantity());
            putIfPresent(row, "warehouse", warehouses.get(line.getWarehouseId()));
            if (canSeeMoney) {
                row.put("unitPrice", line.getUnitPrice());
                row.put("lineAmount", line.getLineAmount());
            }
            return row;
        });
    }

    private Map<String, Object> repairDetail(String code) {
        Optional<Repair> found = repairRepository.findFirstByRepairCode(code)
                .flatMap(repair -> repairRepository.findWithDetailsById(repair.getId()));
        if (found.isEmpty()) {
            return notFound(DocType.REPAIR, code);
        }
        Repair repair = found.get();
        boolean canSeeMoney = support.canViewPricing();

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", repair.getRepairCode());
        header.put("type", DocType.REPAIR.label);
        header.put("status", repair.getRepairStatus());
        header.put("receivedDate", displayDate(repair.getReceivedDate()));
        putIfPresent(header, "expectedDate", displayDate(repair.getExpectedDate()));
        putIfPresent(header, "completedDate", displayDate(repair.getCompletedDate()));
        putIfPresent(header, "product", variantName(repair.getProductVariant()));
        putIfPresent(header, "issue", shortText(repair.getIssueDescription()));
        putIfPresent(header, "diagnosis", shortText(repair.getDiagnosisNote()));
        header.put("underWarranty", Boolean.TRUE.equals(repair.getUnderWarranty()));
        putIfPresent(header, "warrantyCode", repair.getWarranty() != null ? repair.getWarranty().getWarrantyCode() : null);
        if (canSeeMoney) {
            header.put("totalAmount", repair.getTotalAmount());
        }

        List<RepairLine> lines = repair.getRepairLines() == null ? List.of() : repair.getRepairLines();
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(line.getComponentVariant());
            row.put("action", line.getActionType());
            row.put("quantity", line.getQuantity());
            if (canSeeMoney) {
                row.put("unitPrice", line.getUnitPrice());
            }
            return row;
        });
    }

    private Map<String, Object> warrantyDetail(String code) {
        Optional<Warranty> found = warrantyRepository.findFirstByWarrantyCode(code)
                .flatMap(warranty -> warrantyRepository.findWithDetailsById(warranty.getId()));
        if (found.isEmpty()) {
            return notFound(DocType.WARRANTY, code);
        }
        Warranty warranty = found.get();

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("code", warranty.getWarrantyCode());
        header.put("type", DocType.WARRANTY.label);
        header.put("status", warranty.getWarrantyStatus());
        header.put("customer", warranty.getPartner() != null ? warranty.getPartner().getName() : null);
        header.put("startDate", displayDate(warranty.getStartDate()));
        header.put("endDate", displayDate(warranty.getEndDate()));
        putIfPresent(header, "note", shortText(warranty.getNote()));

        List<WarrantyLine> lines = warranty.getLines() == null ? List.of() : warranty.getLines();
        return detailResult(header, lines, line -> {
            Map<String, Object> row = variantRow(line.getProductVariant());
            putIfPresent(row, "serial", line.getSerialNumber() != null ? line.getSerialNumber().getSerialNumber() : null);
            row.put("quantity", line.getQuantity());
            putIfPresent(row, "startDate", displayDate(line.getStartDate()));
            putIfPresent(row, "endDate", displayDate(line.getEndDate()));
            putIfPresent(row, "status", line.getWarrantyStatus());
            return row;
        });
    }

    // =====================================================================================================
    // phần dùng chung
    // =====================================================================================================

    private WarehouseFilter resolveWarehouse(DocType docType, String warehouse) {
        if (warehouse == null || warehouse.isBlank()) {
            return new WarehouseFilter(null, null, null);
        }
        if (!docType.filterableByWarehouse) {
            return new WarehouseFilter(null, null, docType.label + " không lọc theo kho nên đã bỏ qua tham số warehouse.");
        }
        Optional<Warehouse> requested = support.findWarehouse(warehouse);
        if (requested.isEmpty()) {
            return new WarehouseFilter(null, AiToolSupport.error("Không tìm thấy kho '" + support.keyword(warehouse)
                    + "'. Hãy gọi listWarehouses để biết các kho hợp lệ."), null);
        }
        if (docType.scopedByWarehouse() && !support.canAccessWarehouse(requested.get().getId())) {
            return new WarehouseFilter(null, AiToolSupport.error("Người dùng chưa được phân công phụ trách kho "
                    + requested.get().getName() + " nên không được xem " + docType.label + " của kho này. Hãy báo lại cho họ."), null);
        }
        return new WarehouseFilter(requested.get().getId(), null, null);
    }

    /**
     * Lọc trạng thái trong bộ nhớ (các truy vấn danh sách đã trả về toàn bộ chứng từ khớp) để khi mô hình đưa mã
     * trạng thái sai thì trả lại các mã có thật, thay vì im lặng báo 0 kết quả.
     */
    private <T> Map<String, Object> listResult(DocType docType, List<T> candidates, Function<T, String> statusOf, String status,
                                               int max, Function<List<T>, List<Map<String, Object>>> toRows) {
        List<T> matched = status == null ? candidates
                : candidates.stream().filter(item -> status.equalsIgnoreCase(statusOf.apply(item))).toList();
        if (status != null && matched.isEmpty() && !candidates.isEmpty()) {
            Collection<String> available = candidates.stream().map(statusOf).filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            return invalidStatus(docType, status, available);
        }
        List<T> shown = matched.size() > max ? matched.subList(0, max) : matched;
        return AiToolSupport.rows(toRows.apply(shown),
                "type", docType.key, "totalMatches", matched.size(), "truncated", matched.size() > max);
    }

    private static Map<String, Object> pageResult(DocType docType, List<Map<String, Object>> rows, long total) {
        return AiToolSupport.rows(rows, "type", docType.key, "totalMatches", total, "truncated", total > rows.size());
    }

    private static Map<String, Object> invalidStatus(DocType docType, String status, Collection<String> available) {
        Map<String, Object> result = AiToolSupport.error("Không có " + docType.label + " nào ở trạng thái '" + status
                + "'. Nếu người dùng hỏi theo nghĩa, hãy chọn mã phù hợp trong availableStatuses rồi gọi lại; "
                + "nếu không có mã phù hợp thì trả lời là không có.");
        result.put("availableStatuses", List.copyOf(available));
        return result;
    }

    private <L> Map<String, Object> detailResult(Map<String, Object> header, List<L> lines,
                                                 Function<L, Map<String, Object>> toRow) {
        int max = support.limit(null);
        List<Map<String, Object>> rows = lines.stream().limit(max).map(toRow).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("document", header);
        result.put("totalLines", lines.size());
        result.put("truncated", lines.size() > max);
        result.put("lines", rows);
        return result;
    }

    private static Map<String, Object> notFound(DocType docType, String code) {
        return AiToolSupport.error("Không tìm thấy " + docType.label + " có mã '" + code
                + "'. Hãy kiểm tra lại mã hoặc gọi findDocuments để tìm.");
    }

    private static Map<String, Object> outOfScope(DocType docType, String code, String warehouse) {
        return AiToolSupport.error(docType.label + " " + code + " thuộc " + warehouse
                + ", là kho người dùng không được phân công phụ trách, nên không được xem. Hãy báo lại cho họ.");
    }

    private Map<Long, ProductVariant> variants(List<Long> ids) {
        List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        return productVariantRepository.findAllById(distinct).stream()
                .collect(Collectors.toMap(ProductVariant::getId, v -> v, (a, b) -> a));
    }

    private Map<Long, String> partnerNames(List<Long> ids) {
        List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        return partnerRepository.findAllById(distinct).stream()
                .collect(Collectors.toMap(Partner::getId, Partner::getName, (a, b) -> a));
    }

    private static Map<String, Object> variantRow(ProductVariant variant) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("sku", variant != null ? variant.getSku() : null);
        row.put("name", variantName(variant));
        return row;
    }

    private static String variantName(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        String product = variant.getProduct() != null ? variant.getProduct().getProductName() : null;
        String name = variant.getVariantName();
        if (product == null) {
            return name;
        }
        return name == null || name.isBlank() ? product : product + " - " + name;
    }

    static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        return value.contains("/") ? LocalDate.parse(value, VN_INPUT_DATE) : LocalDate.parse(value);
    }

    private static String displayDate(LocalDate date) {
        return date == null ? null : date.format(DISPLAY_DATE);
    }

    private static String shortText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.length() > MAX_TEXT ? trimmed.substring(0, MAX_TEXT) + "..." : trimmed;
    }

    private static void putIfPresent(Map<String, Object> row, String key, Object value) {
        if (value != null) {
            row.put(key, value);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

}
