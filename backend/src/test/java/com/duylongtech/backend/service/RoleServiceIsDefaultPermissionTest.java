package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.auth.RoleService;
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit test report: RoleService.isDefaultPermission(String normalizedRoleCode, String module, String code),
 * trả về boolean. Kỹ thuật Equivalence Partitioning theo từng vai trò.
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "RoleService",
        signature = "isDefaultPermission(String normalizedRoleCode, String module, String code)",
        technique = Technique.EP,
        precondition = {"None"})
@DisplayName("isDefaultPermission(String normalizedRoleCode, String module, String code)")
class RoleServiceIsDefaultPermissionTest {

    @Test
    @UnitTestCase(id = "UTCID01", type = "A",
            purpose = "Verify a null role code grants no default permission.",
            inputs = {
                    "normalizedRoleCode=null",
                    "module=\"product\"",
                    "code=\"product:view\""
            },
            returns = "false")
    @DisplayName("UTCID01 - normalizedRoleCode=null -> false")
    void utcid01NullRole() {
        assertFalse(RoleService.isDefaultPermission(null, "product", "product:view"));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "N",
            purpose = "Verify SUPER_ADMIN owns the audit module by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_SUPER_ADMIN\"",
                    "module=\"audit\"",
                    "code=\"audit:view\""
            },
            returns = "true")
    @DisplayName("UTCID02 - ROLE_SUPER_ADMIN, audit/audit:view -> true")
    void utcid02SuperAdminOwnsAudit() {
        assertTrue(RoleService.isDefaultPermission("ROLE_SUPER_ADMIN", "audit", "audit:view"));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N",
            purpose = "Verify SUPER_ADMIN does not get business modules such as product by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_SUPER_ADMIN\"",
                    "module=\"product\"",
                    "code=\"product:view\""
            },
            returns = "false")
    @DisplayName("UTCID03 - ROLE_SUPER_ADMIN, product/product:view -> false")
    void utcid03SuperAdminHasNoBusinessModules() {
        assertFalse(RoleService.isDefaultPermission("ROLE_SUPER_ADMIN", "product", "product:view"));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N",
            purpose = "Verify MANAGER gets every action of business modules such as product:delete.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_MANAGER\"",
                    "module=\"product\"",
                    "code=\"product:delete\""
            },
            returns = "true")
    @DisplayName("UTCID04 - ROLE_MANAGER, product/product:delete -> true")
    void utcid04ManagerOwnsBusinessModules() {
        assertTrue(RoleService.isDefaultPermission("ROLE_MANAGER", "product", "product:delete"));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "N",
            purpose = "Verify MANAGER does not get the audit module by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_MANAGER\"",
                    "module=\"audit\"",
                    "code=\"audit:view\""
            },
            returns = "false")
    @DisplayName("UTCID05 - ROLE_MANAGER, audit/audit:view -> false")
    void utcid05ManagerHasNoAudit() {
        assertFalse(RoleService.isDefaultPermission("ROLE_MANAGER", "audit", "audit:view"));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N",
            purpose = "Verify WAREHOUSE_CONTROLLER can post import slips by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_WAREHOUSE_CONTROLLER\"",
                    "module=\"import\"",
                    "code=\"import:post\""
            },
            returns = "true")
    @DisplayName("UTCID06 - ROLE_WAREHOUSE_CONTROLLER, import/import:post -> true")
    void utcid06WarehouseControllerPostsImport() {
        assertTrue(RoleService.isDefaultPermission("ROLE_WAREHOUSE_CONTROLLER", "import", "import:post"));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N",
            purpose = "Verify WAREHOUSE_CONTROLLER cannot add import slips by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_WAREHOUSE_CONTROLLER\"",
                    "module=\"import\"",
                    "code=\"import:add\""
            },
            returns = "false")
    @DisplayName("UTCID07 - ROLE_WAREHOUSE_CONTROLLER, import/import:add -> false")
    void utcid07WarehouseControllerCannotAddImport() {
        assertFalse(RoleService.isDefaultPermission("ROLE_WAREHOUSE_CONTROLLER", "import", "import:add"));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N",
            purpose = "Verify TECHNICIAN gets every repair action by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_TECHNICIAN\"",
                    "module=\"repair\"",
                    "code=\"repair:delete\""
            },
            returns = "true")
    @DisplayName("UTCID08 - ROLE_TECHNICIAN, repair/repair:delete -> true")
    void utcid08TechnicianOwnsRepair() {
        assertTrue(RoleService.isDefaultPermission("ROLE_TECHNICIAN", "repair", "repair:delete"));
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "N",
            purpose = "Verify ACCOUNTANT gets every payment action by default.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_ACCOUNTANT\"",
                    "module=\"payment\"",
                    "code=\"payment:post\""
            },
            returns = "true")
    @DisplayName("UTCID09 - ROLE_ACCOUNTANT, payment/payment:post -> true")
    void utcid09AccountantOwnsPayment() {
        assertTrue(RoleService.isDefaultPermission("ROLE_ACCOUNTANT", "payment", "payment:post"));
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "N",
            purpose = "Verify CASHIER_CONTROLLER only views payments and cannot post them.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_CASHIER_CONTROLLER\"",
                    "module=\"payment\"",
                    "code=\"payment:post\""
            },
            returns = "false")
    @DisplayName("UTCID10 - ROLE_CASHIER_CONTROLLER, payment/payment:post -> false")
    void utcid10CashierOnlyViewsPayment() {
        assertFalse(RoleService.isDefaultPermission("ROLE_CASHIER_CONTROLLER", "payment", "payment:post"));
    }

    @Test
    @UnitTestCase(id = "UTCID11", type = "A",
            purpose = "Verify an unknown role code grants no default permission.",
            inputs = {
                    "normalizedRoleCode=\"ROLE_UNKNOWN\"",
                    "module=\"product\"",
                    "code=\"product:view\""
            },
            returns = "false")
    @DisplayName("UTCID11 - ROLE_UNKNOWN, product/product:view -> false")
    void utcid11UnknownRole() {
        assertFalse(RoleService.isDefaultPermission("ROLE_UNKNOWN", "product", "product:view"));
    }

    @Test
    @UnitTestCase(id = "UTCID12", type = "A",
            purpose = "Verify a role code without the ROLE_ prefix grants no default permission.",
            inputs = {
                    "normalizedRoleCode=\"manager\"",
                    "module=\"product\"",
                    "code=\"product:view\""
            },
            returns = "false")
    @DisplayName("UTCID12 - mã vai trò chưa chuẩn hóa 'manager', product/product:view -> false")
    void utcid12NonNormalizedRole() {
        assertFalse(RoleService.isDefaultPermission("manager", "product", "product:view"));
    }
}
