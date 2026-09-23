package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderMapper;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.system.EmailService;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Ghi sổ phiếu xuất cộng giá vốn FIFO vào dòng SO; bỏ ghi sổ phải trừ lại đúng dòng đó, nếu không ghi sổ lại
 * sẽ cộng giá vốn hai lần và báo cáo lãi gộp bán hàng bị thấp đi.
 */
class SalesOrderCostReversalTest {

    private static final long SO_ID = 50L;
    private static final long VARIANT_ID = 2L;

    private final SalesOrderRepository salesOrderRepository = mock(SalesOrderRepository.class);
    private final StockReservationRepository stockReservationRepository = mock(StockReservationRepository.class);
    private SalesOrder so;
    private SalesOrderLine lineAtWarehouse1;
    private SalesOrderLine lineAtWarehouse5;

    @BeforeEach
    void setUp() {
        so = new SalesOrder();
        so.initOrder("SO0001", 9L, 1L, LocalDate.of(2026, 9, 1), null, null, null, 1L);
        lineAtWarehouse1 = line(1L);
        lineAtWarehouse5 = line(5L);
        so.addLine(lineAtWarehouse1);
        so.addLine(lineAtWarehouse5);
        when(salesOrderRepository.findByIdWithDetails(SO_ID)).thenReturn(Optional.of(so));
        when(stockReservationRepository.findBySalesOrderId(SO_ID)).thenReturn(List.of());
    }

    private static SalesOrderLine line(Long warehouseId) {
        SalesOrderLine line = new SalesOrderLine();
        line.initLine(VARIANT_ID, new BigDecimal("3"), new BigDecimal("1000"), BigDecimal.ZERO, warehouseId, null, null);
        return line;
    }

    private SalesOrderService newService() {
        return new SalesOrderService(
                salesOrderRepository,
                stockReservationRepository,
                mock(InventoryBalanceRepository.class),
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

    @Test
    void postingCostGoesToTheLineOfTheExportWarehouse() {
        newService().fulfillReservation(SO_ID, VARIANT_ID, 5L, new BigDecimal("3"), new BigDecimal("2400"));

        assertEquals(0, BigDecimal.ZERO.compareTo(lineAtWarehouse1.getCostAmount()));
        assertEquals(0, new BigDecimal("2400").compareTo(lineAtWarehouse5.getCostAmount()));
    }

    @Test
    void unpostThenRepostDoesNotDoubleTheCost() {
        SalesOrderService service = newService();

        service.fulfillReservation(SO_ID, VARIANT_ID, 5L, new BigDecimal("3"), new BigDecimal("2400"));
        service.reverseFulfilledCost(SO_ID, VARIANT_ID, 5L, new BigDecimal("2400"));
        service.fulfillReservation(SO_ID, VARIANT_ID, 5L, new BigDecimal("3"), new BigDecimal("2400"));

        assertEquals(0, new BigDecimal("2400").compareTo(lineAtWarehouse5.getCostAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(lineAtWarehouse1.getCostAmount()));
    }

    @Test
    void reversalNeverDrivesTheCostNegative() {
        newService().reverseFulfilledCost(SO_ID, VARIANT_ID, 1L, new BigDecimal("500"));

        assertEquals(0, BigDecimal.ZERO.compareTo(lineAtWarehouse1.getCostAmount()));
    }
}
