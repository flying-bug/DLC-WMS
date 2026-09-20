package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Cung cấp thông tin giá vốn FIFO cho từng SKU linh kiện.
 * Được dùng trong màn hình tạo BOM để tự động điền và khoá giá linh kiện.
 */
@RestController
@RequestMapping("/api/v1/inventory/cost")
@RequiredArgsConstructor
public class InventoryCostController {

    private final InventoryCostLayerRepository inventoryCostLayerRepository;

    /**
     * Trả về giá vốn FIFO cho một SKU.
     * - Nếu có tham số quantity: tính giá trung bình pha trộn (blended) theo FIFO đúng với số lượng cần dùng.
     *   Ví dụ: qty=15, Layer1=10×1.000.000đ, Layer2=15×1.500.000đ
     *   → (10×1.000.000 + 5×1.500.000) / 15 = 1.166.667đ
     * - Nếu không có quantity: trả về đơn giá lô cũ nhất (FIFO thuần túy).
     *
     * GET /api/v1/inventory/cost/fifo/{variantId}?quantity=15
     */
    @GetMapping("/fifo/{variantId}")
    @PreAuthorize("hasAuthority('assembly_config:view') or hasAuthority('assembly_config:add') or hasAuthority('assembly_config:edit') or hasRole('SUPER_ADMIN')")
    public ApiResponse<java.util.Map<String, BigDecimal>> getFifoCostPrice(
            @PathVariable Long variantId,
            @RequestParam(required = false) BigDecimal quantity) {

        List<InventoryCostLayer> layers = inventoryCostLayerRepository.findAvailableLayersByVariant(variantId);

        if (layers == null || layers.isEmpty()) {
            return ApiResponse.success(null);
        }

        // Giá lô cũ nhất (FIFO thuần túy, khi qty=1 hoặc không truyền quantity)
        BigDecimal fifoCost = layers.get(0).getUnitCost();

        // Nếu không truyền quantity hoặc qty <= 0: trả về giá lô cũ nhất
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            java.util.Map<String, BigDecimal> result = new java.util.LinkedHashMap<>();
            result.put("fifoCost", fifoCost);
            result.put("blendedCost", fifoCost); // không có blended → giống nhau
            return ApiResponse.success(result);
        }

        // Tính giá pha trộn FIFO cho đúng quantity cần dùng (cuốn chiếu từng lớp)
        BigDecimal remaining = quantity;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (InventoryCostLayer layer : layers) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal available = layer.getQuantityLayered();
            BigDecimal take = remaining.min(available); // lấy tối đa những gì layer còn có
            totalCost = totalCost.add(take.multiply(layer.getUnitCost()));
            remaining = remaining.subtract(take);
        }

        // Nếu kho không đủ hàng, phần còn thiếu tính bằng giá lô mới nhất (fallback)
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            InventoryCostLayer newestLayer = layers.get(layers.size() - 1);
            totalCost = totalCost.add(remaining.multiply(newestLayer.getUnitCost()));
        }

        BigDecimal blendedCost = totalCost.divide(quantity, 0, RoundingMode.HALF_UP);

        java.util.Map<String, BigDecimal> result = new java.util.LinkedHashMap<>();
        result.put("fifoCost", fifoCost);           // giá lô cũ nhất (tham khảo)
        result.put("blendedCost", blendedCost);     // giá thực tế theo số lượng BOM
        return ApiResponse.success(result);
    }

    @PostMapping("/fifo/bulk")
    @PreAuthorize("hasAuthority('assembly_config:view') or hasAuthority('assembly_config:add') or hasAuthority('assembly_config:edit') or hasRole('SUPER_ADMIN')")
    public ApiResponse<java.util.Map<Long, BigDecimal>> getBulkFifoCostPrice(@RequestBody List<Long> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return ApiResponse.success(new java.util.HashMap<>());
        }

        List<InventoryCostLayer> layers = inventoryCostLayerRepository.findAvailableLayersByVariants(variantIds);
        java.util.Map<Long, BigDecimal> result = new java.util.HashMap<>();
        
        for (InventoryCostLayer layer : layers) {
            // Because layers are ordered by createdAt ASC, we only put the first one we see
            if (!result.containsKey(layer.getVariantId())) {
                result.put(layer.getVariantId(), layer.getUnitCost());
            }
        }
        
        // Return 0 for variants that have no available layers
        for (Long vid : variantIds) {
            result.putIfAbsent(vid, BigDecimal.ZERO);
        }

        return ApiResponse.success(result);
    }
}

