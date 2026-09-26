package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Công cụ tra cứu sản phẩm / SKU (chỉ đọc). Cần quyền product:view; giá chỉ hiện với vai trò được xem giá. */
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProductTools {

    private final ProductVariantRepository productVariantRepository;
    private final AiToolSupport support;

    @Tool(description = "Tìm sản phẩm/SKU theo từ khóa (tên, mã sản phẩm hoặc SKU). Dùng khi người dùng chỉ biết tên gần đúng, "
            + "TRƯỚC khi tra tồn kho, để lấy đúng SKU. Trả về danh sách SKU ứng viên.")
    public Map<String, Object> searchProducts(
            @ToolParam(description = "Từ khóa: tên, mã hoặc SKU, ví dụ 'RAM DDR4 16GB'") String keyword,
            @ToolParam(description = "Số dòng tối đa (mặc định và tối đa là 10)", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchProducts", "keyword=" + keyword, "sản phẩm", "product:view");
        if (denied != null) {
            return denied;
        }
        String cleaned = support.keyword(keyword);
        if (cleaned.isBlank()) {
            return AiToolSupport.error("Thiếu từ khóa tìm kiếm. Hãy hỏi lại người dùng muốn tìm sản phẩm nào.");
        }

        boolean canSeePrice = support.canViewPricing();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (ProductVariant variant : productVariantRepository
                .searchVariants(cleaned, false, PageRequest.of(0, support.limit(limit))).getContent()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("sku", variant.getSku());
            row.put("variantName", variant.getVariantName());
            if (variant.getProduct() != null) {
                row.put("productCode", variant.getProduct().getProductCode());
                row.put("productName", variant.getProduct().getProductName());
            }
            if (canSeePrice) {
                row.put("salePrice", variant.getSalePrice());
            }
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }
}
