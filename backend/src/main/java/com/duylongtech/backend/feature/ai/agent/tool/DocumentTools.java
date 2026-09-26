package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Công cụ tra cứu chứng từ kho và mua/bán (chỉ đọc). */
@Component
@RequiredArgsConstructor
public class DocumentTools {

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final AiToolSupport support;

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    
    private String displayDate(java.time.LocalDate date) {
        return date == null ? "-" : date.format(DISPLAY_DATE);
    }

    @Tool(description = "Tìm kiếm phiếu nhập kho (IN_PO). Trả về danh sách phiếu nhập và trạng thái, ngày chứng từ.")
    public Map<String, Object> searchImports(
            @ToolParam(description = "Từ khóa tìm kiếm (mã phiếu, v.v.)", required = false) String keyword,
            @ToolParam(description = "Số dòng tối đa", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchImports", "keyword=" + keyword, "phiếu nhập kho", "import:view");
        if (denied != null) return denied;

        String cleaned = support.keyword(keyword);
        List<Long> allowed = support.allowedWarehouseIds();
        if (allowed != null && allowed.isEmpty()) {
            return AiToolSupport.rows(List.of());
        }

        List<InventoryDocument> docs = inventoryDocumentRepository.searchImports(
                cleaned.isBlank() ? null : cleaned, null, null, null, null, null, null, null, null, null, allowed);
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (InventoryDocument doc : docs.stream().limit(support.limit(limit)).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("docCode", doc.getDocCode());
            row.put("status", doc.getStatus());
            row.put("docDate", displayDate(doc.getDocDate()));
            row.put("warehouseId", doc.getWarehouseId());
            if (doc.getLines() != null) {
                row.put("lineCount", doc.getLines().size());
            }
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }

    @Tool(description = "Tìm kiếm phiếu xuất kho (EX_SO). Trả về danh sách phiếu xuất và trạng thái, ngày chứng từ.")
    public Map<String, Object> searchExports(
            @ToolParam(description = "Từ khóa tìm kiếm (mã phiếu, v.v.)", required = false) String keyword,
            @ToolParam(description = "Số dòng tối đa", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchExports", "keyword=" + keyword, "phiếu xuất kho", "export:view");
        if (denied != null) return denied;

        String cleaned = support.keyword(keyword);
        List<Long> allowed = support.allowedWarehouseIds();
        if (allowed != null && allowed.isEmpty()) {
            return AiToolSupport.rows(List.of());
        }

        List<InventoryDocument> docs = inventoryDocumentRepository.searchExports(
                cleaned.isBlank() ? null : cleaned, null, null, null, null, null, null, null, null, null, allowed);
        
        List<Map<String, Object>> rows = new ArrayList<>();
        for (InventoryDocument doc : docs.stream().limit(support.limit(limit)).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("docCode", doc.getDocCode());
            row.put("status", doc.getStatus());
            row.put("docDate", displayDate(doc.getDocDate()));
            row.put("warehouseId", doc.getWarehouseId());
            if (doc.getLines() != null) {
                row.put("lineCount", doc.getLines().size());
            }
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }

    @Tool(description = "Tìm kiếm đơn mua hàng (PO). Trả về danh sách đơn mua, trạng thái, ngày đặt.")
    public Map<String, Object> searchPurchaseOrders(
            @ToolParam(description = "Từ khóa tìm kiếm (mã PO, v.v.)", required = false) String keyword,
            @ToolParam(description = "Số dòng tối đa", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchPurchaseOrders", "keyword=" + keyword, "đơn mua hàng", "purchase_order:view");
        if (denied != null) return denied;

        String cleaned = support.keyword(keyword);
        List<PurchaseOrder> docs = purchaseOrderRepository.findAllWithFilters(
                cleaned.isBlank() ? null : cleaned, null, null, null, null);
        
        boolean canSeePrice = support.canViewPricing();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PurchaseOrder doc : docs.stream().limit(support.limit(limit)).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("poCode", doc.getPoCode());
            row.put("status", doc.getStatus());
            row.put("poDate", displayDate(doc.getPoDate()));
            if (doc.getPartner() != null) {
                row.put("supplierName", doc.getPartner().getName());
            }
            if (canSeePrice) {
                row.put("totalAmount", doc.getTotalAmount());
            }
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }

    @Tool(description = "Tìm kiếm đơn bán hàng (SO). Trả về danh sách đơn bán, trạng thái, ngày tạo.")
    public Map<String, Object> searchSalesOrders(
            @ToolParam(description = "Từ khóa tìm kiếm (mã SO, v.v.)", required = false) String keyword,
            @ToolParam(description = "Số dòng tối đa", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchSalesOrders", "keyword=" + keyword, "đơn bán hàng", "sales_order:view");
        if (denied != null) return denied;

        String cleaned = support.keyword(keyword);
        List<SalesOrder> docs = salesOrderRepository.findAllWithFilters(
                cleaned.isBlank() ? null : cleaned, null, null, null, null, null, null, null);
        
        boolean canSeePrice = support.canViewPricing();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SalesOrder doc : docs.stream().limit(support.limit(limit)).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("soCode", doc.getSoCode());
            row.put("status", doc.getStatus());
            row.put("soDate", displayDate(doc.getSoDate()));
            if (doc.getPartner() != null) {
                row.put("customerName", doc.getPartner().getName());
            }
            if (canSeePrice) {
                row.put("totalAmount", doc.getTotalAmount());
            }
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }
}
