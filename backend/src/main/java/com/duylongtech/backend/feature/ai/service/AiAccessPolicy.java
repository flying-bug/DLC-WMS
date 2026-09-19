package com.duylongtech.backend.feature.ai.service;

import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Quyền của người đang hỏi chatbot. Chatbot đọc thẳng repository nên KHÔNG được trả dữ liệu vượt quá những gì
 * người đó xem được ở màn hình/API: cùng bộ quyền `module:view`, cùng phạm vi kho (Thủ kho chỉ thấy kho được giao)
 * và cùng quy tắc ẩn giá (chỉ Quản lý/Kế toán/Thủ quỹ xem giá).
 */
@Component
@RequiredArgsConstructor
public class AiAccessPolicy {

    private static final Set<String> PRICING_ROLES = Set.of(
            "ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_ACCOUNTANT", "ROLE_CASHIER_CONTROLLER");

    private final WarehouseAccessGuard warehouseAccessGuard;

    /** Có ít nhất một trong các quyền (Quản lý được xem toàn bộ nghiệp vụ, giống các API khác). */
    public boolean canViewAny(String... permissions) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Set<String> granted = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
        if (granted.contains("ROLE_MANAGER")) {
            return true;
        }
        for (String permission : permissions) {
            if (granted.contains(permission)) {
                return true;
            }
        }
        return false;
    }

    public boolean canView(String permission) {
        return canViewAny(permission);
    }

    public boolean canViewPricing() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(PRICING_ROLES::contains);
    }

    /** null = không giới hạn kho; rỗng = giới hạn nhưng chưa được giao kho nào. */
    public List<Long> allowedWarehouseIds() {
        return warehouseAccessGuard.resolveAllowedWarehouseIds();
    }

    public boolean canAccessWarehouse(Long warehouseId) {
        List<Long> allowed = allowedWarehouseIds();
        return allowed == null || (warehouseId != null && allowed.contains(warehouseId));
    }
}

