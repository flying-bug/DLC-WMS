package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseStockAiRow;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Công cụ tồn kho / kho (chỉ đọc). Cùng quy tắc với màn hình: cần một trong các quyền tồn kho, thủ kho chỉ thấy kho
 * được giao, giá trị tồn chỉ hiện với vai trò được xem giá.
 */
@Component
@RequiredArgsConstructor
public class StockTools {

    private static final int MAX_WAREHOUSES_SCANNED = 30;

    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final AiToolSupport support;

    @Tool(description = "Liệt kê các kho mà người dùng hiện tại được phép xem (mã kho, tên kho).")
    public Map<String, Object> listWarehouses() {
        Map<String, Object> denied = support.begin("listWarehouses", "", "kho", AiToolSupport.STOCK_PERMISSIONS);
        if (denied != null) {
            return denied;
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Warehouse warehouse : support.scopedWarehouses()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", warehouse.getCode());
            row.put("name", warehouse.getName());
            rows.add(row);
        }
        return AiToolSupport.rows(rows);
    }

    @Tool(description = "Tra tồn kho của một hàng hóa: số lượng tồn, giữ chỗ và khả dụng theo từng kho. "
            + "Truyền SKU chính xác nếu đã biết (lấy từ searchProducts), hoặc từ khóa tên hàng. "
            + "Có thể giới hạn theo một kho bằng mã hoặc tên kho.")
    public Map<String, Object> getStock(
            @ToolParam(description = "SKU hoặc từ khóa tên hàng, ví dụ 'SP000019' hoặc 'RAM DDR4'") String query,
            @ToolParam(description = "Mã hoặc tên kho cần xem; bỏ trống để xem mọi kho được phép", required = false) String warehouse) {
        Map<String, Object> denied = support.begin("getStock", "query=" + query + ", warehouse=" + warehouse,
                "tồn kho", AiToolSupport.STOCK_PERMISSIONS);
        if (denied != null) {
            return denied;
        }
        String cleaned = support.keyword(query);
        if (cleaned.isBlank()) {
            return AiToolSupport.error("Thiếu SKU hoặc tên hàng. Hãy hỏi lại người dùng muốn xem tồn của hàng nào.");
        }

        List<Warehouse> scope = support.scopedWarehouses();
        if (warehouse != null && !warehouse.isBlank()) {
            Optional<Warehouse> requested = support.findWarehouse(warehouse);
            if (requested.isEmpty()) {
                return AiToolSupport.error("Không tìm thấy kho '" + support.keyword(warehouse) + "'. Hãy gọi listWarehouses để biết các kho hợp lệ.");
            }
            if (!support.canAccessWarehouse(requested.get().getId())) {
                return AiToolSupport.error("Người dùng chưa được phân công phụ trách kho " + requested.get().getName()
                        + " nên không được xem tồn kho này. Hãy báo lại cho họ.");
            }
            scope = List.of(requested.get());
        }

        String wanted = AiToolSupport.normalize(cleaned);
        boolean canSeeValue = support.canViewPricing();
        List<Map<String, Object>> rows = new ArrayList<>();
        int scanned = 0;
        for (Warehouse candidate : scope) {
            if (scanned++ >= MAX_WAREHOUSES_SCANNED) {
                break;
            }
            for (WarehouseStockAiRow stock : inventoryBalanceRepository.findStockRowsForAiByWarehouseId(candidate.getId())) {
                if (!matches(stock, wanted)) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("warehouse", candidate.getCode() + " - " + candidate.getName());
                row.put("sku", stock.getSku());
                row.put("name", stock.getProductName() + " - " + stock.getVariantName());
                row.put("onHand", stock.getQuantityOnHand());
                row.put("reserved", stock.getQuantityReserved());
                row.put("available", stock.getAvailableQuantity());
                if (canSeeValue) {
                    row.put("inventoryValue", stock.getInventoryValue());
                }
                rows.add(row);
            }
        }
        int total = rows.size();
        int max = support.limit(null);
        List<Map<String, Object>> shown = total > max ? rows.subList(0, max) : rows;
        return AiToolSupport.rows(shown, "totalMatches", total, "truncated", total > max);
    }

    @Tool(description = "Liệt kê các SKU có tồn khả dụng thấp nhất (sắp hết hàng), kèm kho.")
    public Map<String, Object> listLowStock(
            @ToolParam(description = "Số dòng tối đa (mặc định và tối đa là 10)", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("listLowStock", "limit=" + limit, "tồn kho", AiToolSupport.STOCK_PERMISSIONS);
        if (denied != null) {
            return denied;
        }
        int max = support.limit(limit);
        List<WarehouseStockAiRow> low;
        if (support.allowedWarehouseIds() == null) {
            low = inventoryBalanceRepository.findLowStockRowsForAi(PageRequest.of(0, max));
        } else {
            // Thủ kho chỉ thấy kho được giao: lấy rộng hơn rồi lọc theo mã kho.
            Set<String> allowedCodes = support.scopedWarehouses().stream().map(Warehouse::getCode).collect(Collectors.toSet());
            low = inventoryBalanceRepository.findLowStockRowsForAi(PageRequest.of(0, 500)).stream()
                    .filter(row -> allowedCodes.contains(row.getWarehouseCode()))
                    .limit(max)
                    .toList();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (WarehouseStockAiRow stock : low) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("warehouse", stock.getWarehouseCode() + " - " + stock.getWarehouseName());
            row.put("sku", stock.getSku());
            row.put("name", stock.getProductName() + " - " + stock.getVariantName());
            row.put("onHand", stock.getQuantityOnHand());
            row.put("reserved", stock.getQuantityReserved());
            row.put("available", stock.getAvailableQuantity());
            rows.add(row);
        }
        return AiToolSupport.rows(rows);
    }

    private static boolean matches(WarehouseStockAiRow stock, String wanted) {
        if (wanted.isEmpty()) {
            return false;
        }
        if (AiToolSupport.normalize(stock.getSku()).equals(wanted)) {
            return true;
        }
        String haystack = AiToolSupport.normalize(stock.getSku() + " " + stock.getProductCode() + " "
                + stock.getProductName() + " " + stock.getVariantName());
        for (String token : wanted.split("\\s+")) {
            if (!token.isBlank() && !haystack.contains(token)) {
                return false;
            }
        }
        return true;
    }
}
