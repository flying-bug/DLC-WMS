package com.duylongtech.backend.service;

import com.duylongtech.backend.enums.StockReservationStatus;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.StockReservation;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderMapper;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.system.EmailService;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression test for the bug fixed alongside this test: releaseReservations()
 * only released HOLDING reservations. approveSalesOrder() adds to
 * quantity_reserved for BOTH HOLDING and BACKORDERED lines (a BACKORDERED line
 * is simply one where requested qty exceeds what's available at approval time),
 * so cancelling an SO that had any backordered line never released that part -
 * quantity_reserved only ever grew, eventually making a variant's "available"
 * stock permanently negative even though nothing was actually being held for
 * an active order. See SalesOrderService.releaseReservations().
 */
class SalesOrderReservationReleaseTest {

    private final StockReservationRepository stockReservationRepository = mock(StockReservationRepository.class);
    private final InventoryBalanceRepository inventoryBalanceRepository = mock(InventoryBalanceRepository.class);

    private SalesOrderService newService() {
        return new SalesOrderService(
                mock(SalesOrderRepository.class),
                stockReservationRepository,
                inventoryBalanceRepository,
                mock(PartnerRepository.class),
                mock(WarehouseRepository.class),
                mock(ProductVariantRepository.class),
                mock(UserRepository.class),
                mock(AuditLogService.class),
                mock(PartnerLedgerService.class),
                mock(EmailService.class),
                mock(InventoryDocumentRepository.class),
                mock(InventoryDocumentLineRepository.class),
                mock(PaymentService.class),
                mock(SystemSettingsService.class),
                mock(SalesOrderMapper.class),
                mock(CodeGeneratorService.class)
        );
    }

    private StockReservation reservation(Long id, String status, BigDecimal qty) {
        StockReservation r = new StockReservation();
        r.setId(id);
        r.setSalesOrderId(50L);
        r.setVariantId(2L);
        r.setWarehouseId(1L);
        r.setQuantityReserved(qty);
        r.setStatus(status);
        r.setExpiresAt(LocalDateTime.now().plusHours(1));
        return r;
    }

    @Test
    void releaseReservationsReleasesBothHoldingAndBackorderedLines() {
        StockReservation holding = reservation(1L, StockReservationStatus.HOLDING.name(), new BigDecimal("2"));
        StockReservation backordered = reservation(2L, StockReservationStatus.BACKORDERED.name(), new BigDecimal("999999"));

        when(stockReservationRepository.findBySalesOrderIdAndStatus(50L, StockReservationStatus.HOLDING.name()))
                .thenReturn(List.of(holding));
        when(stockReservationRepository.findBySalesOrderIdAndStatus(50L, StockReservationStatus.BACKORDERED.name()))
                .thenReturn(List.of(backordered));

        InventoryBalance balance = new InventoryBalance();
        balance.setQuantityReserved(new BigDecimal("1000001")); // 2 (holding) + 999999 (backordered)
        when(inventoryBalanceRepository.findByWarehouseAndVariant(1L, 2L, "GOOD"))
                .thenReturn(Optional.of(balance));
        when(inventoryBalanceRepository.save(any(InventoryBalance.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SalesOrderService service = newService();
        service.releaseReservations(50L, 1L);

        assertEquals(StockReservationStatus.RELEASED.name(), holding.getStatus());
        assertEquals(StockReservationStatus.RELEASED.name(), backordered.getStatus());
        assertEquals(0, new BigDecimal("0").compareTo(balance.getQuantityReserved()),
                "Both the HOLDING and BACKORDERED amounts must be subtracted back out");
    }
}
