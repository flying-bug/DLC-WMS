package com.duylongtech.backend.service;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AssemblyWorkflowMigrationTest {
    @Test
    void migrationContainsWorkflowDefaultsBackfillAndUniquePairGuard() throws IOException {
        try (var stream = getClass().getResourceAsStream("/db/migration/V53__refine_assembly_workflow.sql")) {
            assertTrue(stream != null, "V53 migration must be available on the classpath");
            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(sql.contains("DEFAULT 'DRAFT'"));
            assertTrue(sql.contains("uq_assembly_order_document_pair"));
            assertTrue(sql.contains("'POSTED', 'SUBMITTED'") && sql.contains("THEN 'COMPLETED'"));
        }
    }

    @Test
    void technicianRoleMigrationContainsAllCreateScreenDependencies() throws IOException {
        try (var workflowPermissions = getClass().getResourceAsStream("/db/migration/V52__fix_role_asembly_permission.sql");
             var quickProductPermissions = getClass().getResourceAsStream("/db/migration/V54__allow_technician_quick_finished_product.sql")) {
            assertTrue(workflowPermissions != null, "V52 role migration must be available on the classpath");
            assertTrue(quickProductPermissions != null, "V54 role migration must be available on the classpath");
            String sql = new String(workflowPermissions.readAllBytes(), StandardCharsets.UTF_8)
                    + new String(quickProductPermissions.readAllBytes(), StandardCharsets.UTF_8);
            for (String permission : new String[] {
                    "assembly_config:view", "assembly_config:add", "assembly_config:edit",
                    "assembly:view", "assembly:add", "assembly:edit", "assembly:submit",
                    "warehouse_master:view", "product:view", "product_category:view", "unit:view", "report_balance:view" }) {
                assertTrue(sql.contains("'" + permission + "'"), "Missing permission: " + permission);
            }
        }
    }

    @Test
    void fifoReservationMigrationAddsLayerReservationAndAllocationAudit() throws IOException {
        try (var stream = getClass().getResourceAsStream("/db/migration/V64__reserve_fifo_cost_layers.sql")) {
            assertTrue(stream != null, "V64 migration must be available on the classpath");
            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(sql.contains("quantity_reserved"));
            assertTrue(sql.contains("INVENTORY_COST_ALLOCATIONS"));
            assertTrue(sql.contains("'HOLDING', 'CONSUMED', 'RELEASED'"));
        }
    }
}
