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
        try (var stream = getClass().getResourceAsStream("/db/migration/V52__fix_role_asembly_permission.sql")) {
            assertTrue(stream != null, "V52 role migration must be available on the classpath");
            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            for (String permission : new String[] {
                    "assembly_config:view", "assembly_config:add", "assembly_config:edit",
                    "assembly:view", "assembly:add", "assembly:edit", "assembly:submit",
                    "warehouse_master:view", "product:view", "report_balance:view" }) {
                assertTrue(sql.contains("'" + permission + "'"), "Missing permission: " + permission);
            }
        }
    }
}
