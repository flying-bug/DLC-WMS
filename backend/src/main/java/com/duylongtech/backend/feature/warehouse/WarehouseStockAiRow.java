package com.duylongtech.backend.feature.warehouse;

import java.math.BigDecimal;

public interface WarehouseStockAiRow {
    Long getVariantId();

    String getWarehouseCode();

    String getWarehouseName();

    String getProductCode();

    String getProductName();

    String getSku();

    String getVariantName();

    BigDecimal getQuantityOnHand();

    BigDecimal getQuantityReserved();

    BigDecimal getAvailableQuantity();

    BigDecimal getInventoryValue();
}
