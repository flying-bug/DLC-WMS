package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.RoleService;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RoleServiceDefaultPermissionsTest {
    @Test
    void accountantOwnsWarrantyCatalogMaintenanceAndWarehouseReportsWhileTechnicianOnlyViewsWarranty() {
        Set<PermissionEntity> permissions = permissions(
                "warranty:view", "warranty:add", "warranty:edit",
                "product:view", "product:add", "product:edit", "product:delete",
                "product_category:view", "product_category:add", "product_category:edit", "product_category:delete",
                "unit:view", "unit:add", "unit:edit", "unit:delete",
                "brand:view", "brand:add", "brand:edit", "brand:delete",
                "transfer:view", "transfer:add",
                "stocktake:view", "stocktake:add",
                "warehouse_master:view", "warehouse_master:add",
                "report_ledger:view", "report_ledger:export",
                "report_transfer:view", "report_transfer:export",
                "report_balance:view", "report_balance:export"
        );

        assertEquals(Set.of(
                "warranty:view", "warranty:add", "warranty:edit",
                "product:view", "product:add", "product:edit",
                "product_category:view", "product_category:add", "product_category:edit",
                "unit:view", "unit:add", "unit:edit",
                "brand:view", "brand:add", "brand:edit",
                "transfer:view", "stocktake:view", "stocktake:add", "warehouse_master:view",
                "report_ledger:view", "report_ledger:export",
                "report_transfer:view", "report_transfer:export",
                "report_balance:view", "report_balance:export"
        ), codes(RoleService.getDefaultPermissionsForRole("ROLE_ACCOUNTANT", permissions)));

        assertEquals(Set.of("warranty:view"), codes(RoleService.getDefaultPermissionsForRole("ROLE_TECHNICIAN", permissions)).stream()
                .filter(code -> code.startsWith("warranty:"))
                .collect(Collectors.toSet()));
    }

    private static Set<PermissionEntity> permissions(String... codes) {
        return Arrays.stream(codes).map(code -> {
            PermissionEntity permission = new PermissionEntity();
            permission.initPermission(code, code, code.substring(0, code.indexOf(':')), null, "APPROVED");
            return permission;
        }).collect(Collectors.toSet());
    }

    private static Set<String> codes(Set<PermissionEntity> permissions) {
        return permissions.stream().map(PermissionEntity::getCode).collect(Collectors.toSet());
    }
}
