package com.duylongtech.backend.dto.response;

import java.math.BigDecimal;

public interface WarehouseStockAiRow {
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
