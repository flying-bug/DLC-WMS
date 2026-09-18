package com.duylongtech.backend.enums;

public enum ReferenceType {
    SALES_ORDER,
    PURCHASE_ORDER,
    ASSEMBLY_ORDER,
    REPAIR_ORDER,
    NONE;

    public static boolean isSalesOrder(String referenceType) {
        String trimmed = referenceType == null ? null : referenceType.trim();
        if (trimmed == null || trimmed.isEmpty()) return false;
        return SALES_ORDER.name().equalsIgnoreCase(trimmed) || "SO".equalsIgnoreCase(trimmed);
    }

    public static boolean isPurchaseOrder(String referenceType) {
        String trimmed = referenceType == null ? null : referenceType.trim();
        if (trimmed == null || trimmed.isEmpty()) return false;
        return PURCHASE_ORDER.name().equalsIgnoreCase(trimmed) || "PO".equalsIgnoreCase(trimmed);
    }

    public static Long resolveEffectiveSalesOrderId(Long explicitSalesOrderId, String referenceType, Long referenceId) {
        return explicitSalesOrderId == null && isSalesOrder(referenceType) ? referenceId : explicitSalesOrderId;
    }

    public static Long resolveEffectivePurchaseOrderId(Long explicitPurchaseOrderId, String referenceType, Long referenceId) {
        return explicitPurchaseOrderId == null && isPurchaseOrder(referenceType) ? referenceId : explicitPurchaseOrderId;
    }
}

