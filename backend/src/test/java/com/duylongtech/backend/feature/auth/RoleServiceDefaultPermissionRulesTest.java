package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Quy tắc quyền mặc định theo vai trò của RoleService. Mỗi hàm được thiết kế theo phân vùng
 * (module được cấp toàn bộ / chỉ một số quyền / không được cấp) và lấy 1 quyền đại diện cho mỗi phân vùng.
 */
class RoleServiceDefaultPermissionRulesTest {

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "isDefaultPermissionForAccountant(String module, String code)",
            technique = Technique.EP)
    class Accountant {

        @Test
        @UnitTestCase(id = "UTCID01", type = "N", purpose = "Verify the accountant gets every action of the sales order module.",
                inputs = {"module=\"sales_order\"", "code=\"sales_order:delete\""}, returns = "true")
        void utcid01() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("sales_order", "sales_order:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify the accountant can create import slips.",
                inputs = {"module=\"import\"", "code=\"import:add\""}, returns = "true")
        void utcid02() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("import", "import:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify the accountant cannot post import slips (warehouse keeper duty).",
                inputs = {"module=\"import\"", "code=\"import:post\""}, returns = "false")
        void utcid03() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("import", "import:post"));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify the accountant cannot post export slips.",
                inputs = {"module=\"export\"", "code=\"export:post\""}, returns = "false")
        void utcid04() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("export", "export:post"));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify the accountant gets the debt report module.",
                inputs = {"module=\"report_debt\"", "code=\"report_debt:view\""}, returns = "true")
        void utcid05() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("report_debt", "report_debt:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify the accountant can edit product catalog entries.",
                inputs = {"module=\"product\"", "code=\"product:edit\""}, returns = "true")
        void utcid06() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("product", "product:edit"));
        }

        @Test
        @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify the accountant cannot delete product catalog entries.",
                inputs = {"module=\"product\"", "code=\"product:delete\""}, returns = "false")
        void utcid07() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("product", "product:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify the accountant approves assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:approve\""}, returns = "true")
        void utcid08() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("assembly", "assembly:approve"));
        }

        @Test
        @UnitTestCase(id = "UTCID09", type = "N", purpose = "Verify the accountant does not execute assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:execute\""}, returns = "false")
        void utcid09() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("assembly", "assembly:execute"));
        }

        @Test
        @UnitTestCase(id = "UTCID10", type = "N", purpose = "Verify the accountant can request a stocktake.",
                inputs = {"module=\"stocktake\"", "code=\"stocktake:add\""}, returns = "true")
        void utcid10() {
            assertTrue(RoleService.isDefaultPermissionForAccountant("stocktake", "stocktake:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID11", type = "N", purpose = "Verify the accountant only views transfers and cannot create them.",
                inputs = {"module=\"transfer\"", "code=\"transfer:add\""}, returns = "false")
        void utcid11() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("transfer", "transfer:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID12", type = "A", purpose = "Verify a module outside the accountant rules (audit) is not granted.",
                inputs = {"module=\"audit\"", "code=\"audit:view\""}, returns = "false")
        void utcid12() {
            assertFalse(RoleService.isDefaultPermissionForAccountant("audit", "audit:view"));
        }
    }

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "isDefaultPermissionForWarehouseController(String module, String code)",
            technique = Technique.EP)
    class WarehouseController {

        @Test
        @UnitTestCase(id = "UTCID01", type = "N", purpose = "Verify the warehouse controller gets every transfer action.",
                inputs = {"module=\"transfer\"", "code=\"transfer:delete\""}, returns = "true")
        void utcid01() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("transfer", "transfer:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify the warehouse controller can post import slips.",
                inputs = {"module=\"import\"", "code=\"import:post\""}, returns = "true")
        void utcid02() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("import", "import:post"));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify the warehouse controller cannot create import slips.",
                inputs = {"module=\"import\"", "code=\"import:add\""}, returns = "false")
        void utcid03() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("import", "import:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify the warehouse controller can create export slips.",
                inputs = {"module=\"export\"", "code=\"export:add\""}, returns = "true")
        void utcid04() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("export", "export:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify the warehouse controller cannot delete export slips.",
                inputs = {"module=\"export\"", "code=\"export:delete\""}, returns = "false")
        void utcid05() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("export", "export:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify the warehouse controller can view products.",
                inputs = {"module=\"product\"", "code=\"product:view\""}, returns = "true")
        void utcid06() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("product", "product:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify the warehouse controller cannot add products.",
                inputs = {"module=\"product\"", "code=\"product:add\""}, returns = "false")
        void utcid07() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("product", "product:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify the warehouse controller gets the stock ledger report.",
                inputs = {"module=\"report_ledger\"", "code=\"report_ledger:export\""}, returns = "true")
        void utcid08() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("report_ledger", "report_ledger:export"));
        }

        @Test
        @UnitTestCase(id = "UTCID09", type = "N", purpose = "Verify the warehouse controller only views BOM configurations.",
                inputs = {"module=\"assembly_config\"", "code=\"assembly_config:add\""}, returns = "false")
        void utcid09() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("assembly_config", "assembly_config:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID10", type = "N", purpose = "Verify the warehouse controller completes assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:complete\""}, returns = "true")
        void utcid10() {
            assertTrue(RoleService.isDefaultPermissionForWarehouseController("assembly", "assembly:complete"));
        }

        @Test
        @UnitTestCase(id = "UTCID11", type = "N", purpose = "Verify the warehouse controller does not approve assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:approve\""}, returns = "false")
        void utcid11() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("assembly", "assembly:approve"));
        }

        @Test
        @UnitTestCase(id = "UTCID12", type = "A", purpose = "Verify a module outside the warehouse rules (payment) is not granted.",
                inputs = {"module=\"payment\"", "code=\"payment:view\""}, returns = "false")
        void utcid12() {
            assertFalse(RoleService.isDefaultPermissionForWarehouseController("payment", "payment:view"));
        }
    }

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "isDefaultPermissionForTechnician(String module, String code)",
            technique = Technique.EP)
    class Technician {

        @Test
        @UnitTestCase(id = "UTCID01", type = "N", purpose = "Verify the technician can view warranties.",
                inputs = {"module=\"warranty\"", "code=\"warranty:view\""}, returns = "true")
        void utcid01() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("warranty", "warranty:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify the technician cannot edit warranties.",
                inputs = {"module=\"warranty\"", "code=\"warranty:edit\""}, returns = "false")
        void utcid02() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("warranty", "warranty:edit"));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify the technician gets every repair action.",
                inputs = {"module=\"repair\"", "code=\"repair:delete\""}, returns = "true")
        void utcid03() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("repair", "repair:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify the technician can edit BOM configurations.",
                inputs = {"module=\"assembly_config\"", "code=\"assembly_config:edit\""}, returns = "true")
        void utcid04() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("assembly_config", "assembly_config:edit"));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify the technician cannot delete BOM configurations.",
                inputs = {"module=\"assembly_config\"", "code=\"assembly_config:delete\""}, returns = "false")
        void utcid05() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("assembly_config", "assembly_config:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify the technician can submit assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:submit\""}, returns = "true")
        void utcid06() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("assembly", "assembly:submit"));
        }

        @Test
        @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify the technician cannot approve assembly orders.",
                inputs = {"module=\"assembly\"", "code=\"assembly:approve\""}, returns = "false")
        void utcid07() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("assembly", "assembly:approve"));
        }

        @Test
        @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify the technician can register a new customer at the counter.",
                inputs = {"module=\"customer\"", "code=\"customer:add\""}, returns = "true")
        void utcid08() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("customer", "customer:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID09", type = "N", purpose = "Verify the technician cannot delete customers.",
                inputs = {"module=\"customer\"", "code=\"customer:delete\""}, returns = "false")
        void utcid09() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("customer", "customer:delete"));
        }

        @Test
        @UnitTestCase(id = "UTCID10", type = "N", purpose = "Verify the technician can view export slips.",
                inputs = {"module=\"export\"", "code=\"export:view\""}, returns = "true")
        void utcid10() {
            assertTrue(RoleService.isDefaultPermissionForTechnician("export", "export:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID11", type = "N", purpose = "Verify the technician cannot create export slips.",
                inputs = {"module=\"export\"", "code=\"export:add\""}, returns = "false")
        void utcid11() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("export", "export:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID12", type = "A", purpose = "Verify a module outside the technician rules (payment) is not granted.",
                inputs = {"module=\"payment\"", "code=\"payment:view\""}, returns = "false")
        void utcid12() {
            assertFalse(RoleService.isDefaultPermissionForTechnician("payment", "payment:view"));
        }
    }

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "isDefaultPermissionForCashierController(String module, String code)",
            technique = Technique.EP)
    class CashierController {

        @Test
        @UnitTestCase(id = "UTCID01", type = "N", purpose = "Verify the cashier can view payments.",
                inputs = {"module=\"payment\"", "code=\"payment:view\""}, returns = "true")
        void utcid01() {
            assertTrue(RoleService.isDefaultPermissionForCashierController("payment", "payment:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify the cashier cannot post payments.",
                inputs = {"module=\"payment\"", "code=\"payment:post\""}, returns = "false")
        void utcid02() {
            assertFalse(RoleService.isDefaultPermissionForCashierController("payment", "payment:post"));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify the cashier can view customers.",
                inputs = {"module=\"customer\"", "code=\"customer:view\""}, returns = "true")
        void utcid03() {
            assertTrue(RoleService.isDefaultPermissionForCashierController("customer", "customer:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify the cashier cannot add customers.",
                inputs = {"module=\"customer\"", "code=\"customer:add\""}, returns = "false")
        void utcid04() {
            assertFalse(RoleService.isDefaultPermissionForCashierController("customer", "customer:add"));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify the cashier can use the AI assistant in view mode.",
                inputs = {"module=\"ai_chat\"", "code=\"ai_chat:view\""}, returns = "true")
        void utcid05() {
            assertTrue(RoleService.isDefaultPermissionForCashierController("ai_chat", "ai_chat:view"));
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify the cashier gets every action of the debt report.",
                inputs = {"module=\"report_debt\"", "code=\"report_debt:export\""}, returns = "true")
        void utcid06() {
            assertTrue(RoleService.isDefaultPermissionForCashierController("report_debt", "report_debt:export"));
        }

        @Test
        @UnitTestCase(id = "UTCID07", type = "A", purpose = "Verify another report (sales) is not granted to the cashier.",
                inputs = {"module=\"report_sales\"", "code=\"report_sales:view\""}, returns = "false")
        void utcid07() {
            assertFalse(RoleService.isDefaultPermissionForCashierController("report_sales", "report_sales:view"));
        }
    }

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "normalizeRoleCode(String roleCode)",
            technique = Technique.EP)
    class NormalizeRoleCode {

        @Test
        @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a null role code stays null.",
                inputs = "roleCode=null", returns = "null")
        void utcid01() {
            assertNull(RoleService.normalizeRoleCode(null));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify a lower-case code without prefix is upper-cased and prefixed with ROLE_.",
                inputs = "roleCode=\"manager\"", returns = "\"ROLE_MANAGER\"")
        void utcid02() {
            assertEquals("ROLE_MANAGER", RoleService.normalizeRoleCode("manager"));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify a code that already has the ROLE_ prefix is kept as is.",
                inputs = "roleCode=\"ROLE_ACCOUNTANT\"", returns = "\"ROLE_ACCOUNTANT\"")
        void utcid03() {
            assertEquals("ROLE_ACCOUNTANT", RoleService.normalizeRoleCode("ROLE_ACCOUNTANT"));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify a lower-case role_ prefix is recognised after upper-casing and not doubled.",
                inputs = "roleCode=\"role_technician\"", returns = "\"ROLE_TECHNICIAN\"")
        void utcid04() {
            assertEquals("ROLE_TECHNICIAN", RoleService.normalizeRoleCode("role_technician"));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "B", purpose = "Verify an empty code becomes only the prefix ROLE_.",
                inputs = "roleCode=\"\"", returns = "\"ROLE_\"")
        void utcid05() {
            assertEquals("ROLE_", RoleService.normalizeRoleCode(""));
        }
    }

    @Nested
    @UnitTestMethod(module = "RoleService", signature = "getDefaultPermissionsForRole(String roleCode, Set<PermissionEntity> allPerms)",
            technique = Technique.EP,
            precondition = "Permission catalog: audit:view, product:view, product:delete, payment:view, payment:post, report_debt:view")
    class GetDefaultPermissionsForRole {

        private final Set<PermissionEntity> catalog = catalog(
                "audit:view", "product:view", "product:delete", "payment:view", "payment:post", "report_debt:view");

        private Set<String> codes(String roleCode, Set<PermissionEntity> perms) {
            return RoleService.getDefaultPermissionsForRole(roleCode, perms).stream()
                    .map(PermissionEntity::getCode).collect(Collectors.toCollection(java.util.TreeSet::new));
        }

        @Test
        @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a null role code gets no default permission.",
                inputs = {"roleCode=null", "allPerms=full catalog (6 permissions)"}, returns = "[] (empty set)")
        void utcid01() {
            assertEquals(Set.of(), codes(null, catalog));
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N", purpose = "Verify SUPER_ADMIN only receives the audit/account/auth permissions of the catalog.",
                inputs = {"roleCode=\"SUPER_ADMIN\"", "allPerms=full catalog (6 permissions)"}, returns = "[audit:view]")
        void utcid02() {
            assertEquals(Set.of("audit:view"), codes("SUPER_ADMIN", catalog));
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify MANAGER (given without ROLE_ prefix) receives every business permission.",
                inputs = {"roleCode=\"manager\"", "allPerms=full catalog (6 permissions)"},
                returns = "[payment:post, payment:view, product:delete, product:view, report_debt:view]")
        void utcid03() {
            assertEquals(Set.of("payment:post", "payment:view", "product:delete", "product:view", "report_debt:view"),
                    codes("manager", catalog));
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify CASHIER_CONTROLLER receives only payment view and the debt report.",
                inputs = {"roleCode=\"ROLE_CASHIER_CONTROLLER\"", "allPerms=full catalog (6 permissions)"},
                returns = "[payment:view, report_debt:view]")
        void utcid04() {
            assertEquals(Set.of("payment:view", "report_debt:view"), codes("ROLE_CASHIER_CONTROLLER", catalog));
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "A", purpose = "Verify an unknown role receives no permission.",
                inputs = {"roleCode=\"GUEST\"", "allPerms=full catalog (6 permissions)"}, returns = "[] (empty set)")
        void utcid05() {
            assertEquals(Set.of(), codes("GUEST", catalog));
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "B", purpose = "Verify an empty permission catalog yields an empty result even for MANAGER.",
                inputs = {"roleCode=\"manager\"", "allPerms=[] (empty set)"}, returns = "[] (empty set)")
        void utcid06() {
            assertEquals(Set.of(), codes("manager", Set.of()));
        }

        private static Set<PermissionEntity> catalog(String... codes) {
            Set<PermissionEntity> perms = new LinkedHashSet<>();
            for (String code : codes) {
                PermissionEntity p = new PermissionEntity();
                p.initPermission(code, code, code.substring(0, code.indexOf(':')), null, "ACTIVE");
                perms.add(p);
            }
            return perms;
        }
    }
}
