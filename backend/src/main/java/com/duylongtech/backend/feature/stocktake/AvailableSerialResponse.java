package com.duylongtech.backend.feature.stocktake;

/**
 * Serial còn trong kho để đối chiếu khi kiểm kê. Không trả thẳng entity SerialNumber vì các quan hệ LAZY
 * (variant, salesOrderLine) sẽ nổ LazyInitializationException khi Jackson serialize ngoài transaction.
 */
public record AvailableSerialResponse(Long id, String serialNumber) {
}
