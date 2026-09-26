package com.duylongtech.backend.feature.inventory;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InventoryDocumentIssuePurposeTest {

    @Test
    void stocktakeDocumentsUseAdjustmentPurposesRegardlessOfClientValue() {
        assertEquals("STOCKTAKE_ADD",
                InventoryDocumentService.resolveIssuePurpose("IN_PO", "stocktake", "OTHER"));
        assertEquals("INVENTORY_ADJUSTMENT",
                InventoryDocumentService.resolveIssuePurpose("EX_SO", "STOCKTAKE", "USAGE"));
        assertEquals("STOCKTAKE_ADD",
                InventoryDocumentService.resolveIssuePurpose("IN_PO", "STOCK_TAKE", null));
        assertEquals("PURCHASE",
                InventoryDocumentService.resolveIssuePurpose("IN_PO", "PURCHASE_ORDER", " purchase "));
    }
}
