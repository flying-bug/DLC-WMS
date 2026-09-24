package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Công cụ tra cứu khách hàng / nhà cung cấp (chỉ đọc). Cần customer:view và/hoặc supplier:view tương ứng. */
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PartnerTools {

    private final PartnerRepository partnerRepository;
    private final AiToolSupport support;

    @Tool(description = "Tìm khách hàng hoặc nhà cung cấp theo tên, mã hoặc số điện thoại. "
            + "type = 'customer' (khách hàng), 'supplier' (nhà cung cấp) hoặc 'any' (cả hai).")
    public Map<String, Object> searchPartners(
            @ToolParam(description = "Từ khóa: tên, mã hoặc số điện thoại") String keyword,
            @ToolParam(description = "customer | supplier | any (mặc định any)", required = false) String type,
            @ToolParam(description = "Số dòng tối đa (mặc định và tối đa là 10)", required = false) Integer limit) {
        Map<String, Object> denied = support.begin("searchPartners", "keyword=" + keyword + ", type=" + type, "đối tác");
        if (denied != null) {
            return denied;
        }

        String wantedType = type == null ? "any" : type.trim().toLowerCase(Locale.ROOT);
        boolean canCustomer = support.canView("customer:view");
        boolean canSupplier = support.canView("supplier:view");
        boolean customerOnly;
        boolean supplierOnly;
        switch (wantedType) {
            case "customer" -> {
                if (!canCustomer) {
                    return AiToolSupport.error("Người dùng hiện tại không có quyền xem dữ liệu khách hàng. Hãy báo lại cho họ.");
                }
                customerOnly = true;
                supplierOnly = false;
            }
            case "supplier" -> {
                if (!canSupplier) {
                    return AiToolSupport.error("Người dùng hiện tại không có quyền xem dữ liệu nhà cung cấp. Hãy báo lại cho họ.");
                }
                customerOnly = false;
                supplierOnly = true;
            }
            default -> {
                if (!canCustomer && !canSupplier) {
                    return AiToolSupport.error("Người dùng hiện tại không có quyền xem dữ liệu đối tác. Hãy báo lại cho họ.");
                }
                // Chỉ có quyền một nhóm thì chỉ tìm trong nhóm đó.
                customerOnly = canCustomer && !canSupplier;
                supplierOnly = canSupplier && !canCustomer;
            }
        }

        String cleaned = support.keyword(keyword);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Partner partner : partnerRepository
                .searchPartnersForAi(cleaned, customerOnly, supplierOnly, PageRequest.of(0, support.limit(limit))).getContent()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", partner.getCode());
            row.put("name", partner.getName());
            row.put("phone", partner.getPhone());
            row.put("status", partner.getStatus());
            rows.add(row);
        }
        return AiToolSupport.rows(rows, "keyword", cleaned);
    }
}
