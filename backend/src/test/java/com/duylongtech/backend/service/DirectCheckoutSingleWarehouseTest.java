package com.duylongtech.backend.service;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.DirectCheckoutRequest;
import com.duylongtech.backend.feature.sales_order.DirectCheckoutService;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.stocktake.StocktakeLockGuard;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Bán hàng trực tiếp chỉ xuất từ một kho (kho bán): trước đây mỗi dòng mang kho riêng nhưng tất cả
 * dồn vào MỘT phiếu xuất đứng tên kho của dòng đầu, nên thủ kho kho kia không thấy phiếu, còn thủ kho
 * kho đầu phiếu lại trừ được tồn kho kia.
 */
class DirectCheckoutSingleWarehouseTest {

    private static final Long SALES_WAREHOUSE_ID = 1L;
    private static final Long OTHER_WAREHOUSE_ID = 2L;

    private final SalesOrderRepository salesOrderRepository = mock(SalesOrderRepository.class);
    private final PartnerRepository partnerRepository = mock(PartnerRepository.class);
    private final WarehouseRepository warehouseRepository = mock(WarehouseRepository.class);
    private final ProductVariantRepository productVariantRepository = mock(ProductVariantRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final InventoryDocumentService inventoryDocumentService = mock(InventoryDocumentService.class);

    private DirectCheckoutService service;

    @BeforeEach
    void setUp() {
        service = new DirectCheckoutService(
                salesOrderRepository,
                partnerRepository,
                warehouseRepository,
                productVariantRepository,
                userRepository,
                mock(CodeGeneratorService.class),
                inventoryDocumentService,
                mock(PartnerLedgerService.class),
                mock(PaymentService.class),
                mock(StocktakeLockGuard.class));

        when(warehouseRepository.findById(SALES_WAREHOUSE_ID)).thenReturn(Optional.of(mock(Warehouse.class)));
        when(productVariantRepository.findById(any())).thenReturn(Optional.of(mock(ProductVariant.class)));
    }

    @Test
    void rejectsLineFromAnotherWarehouseBeforeCreatingAnything() {
        DirectCheckoutRequest request = request(line(10L, SALES_WAREHOUSE_ID), line(11L, OTHER_WAREHOUSE_ID));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.directCheckout(request, "cashier"));

        assertTrue(ex.getMessage().startsWith("Dòng 2:"), ex.getMessage());
        verify(salesOrderRepository, never()).save(any());
        verify(inventoryDocumentService, never()).createExport(any());
    }

    @Test
    void everySalesOrderLineAndExportLineUsesTheSalesWarehouse() {
        Partner walkIn = new Partner();
        walkIn.initPartner("KH-0000", "Khách vãng lai", "INDIVIDUAL", true, false, "RETAIL");
        when(userRepository.findByUsername("cashier")).thenReturn(Optional.of(new User()));
        when(partnerRepository.findByCode("KH-0000")).thenReturn(Optional.of(walkIn));
        when(salesOrderRepository.save(any(SalesOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        InventoryDocumentResponse export = new InventoryDocumentResponse();
        export.setDocCode("PX0001");
        when(inventoryDocumentService.createExport(any())).thenReturn(export);

        // Dòng không gửi kho và dòng gửi đúng kho bán đều hợp lệ.
        service.directCheckout(request(line(10L, null), line(11L, SALES_WAREHOUSE_ID)), "cashier");

        ArgumentCaptor<SalesOrder> orderCaptor = ArgumentCaptor.forClass(SalesOrder.class);
        verify(salesOrderRepository).save(orderCaptor.capture());
        assertEquals(SALES_WAREHOUSE_ID, orderCaptor.getValue().getWarehouseId());
        for (SalesOrderLine soLine : orderCaptor.getValue().getLines()) {
            assertEquals(SALES_WAREHOUSE_ID, soLine.getWarehouseId());
        }

        ArgumentCaptor<InventoryDocumentRequest> exportCaptor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createExport(exportCaptor.capture());
        assertEquals(SALES_WAREHOUSE_ID, exportCaptor.getValue().getWarehouseId());
        List<InventoryDocumentLineRequest> exportLines = exportCaptor.getValue().getLines();
        assertEquals(2, exportLines.size());
        for (InventoryDocumentLineRequest exportLine : exportLines) {
            assertEquals(SALES_WAREHOUSE_ID, exportLine.getWarehouseId());
        }
    }

    private static DirectCheckoutRequest request(DirectCheckoutRequest.Line... lines) {
        DirectCheckoutRequest request = new DirectCheckoutRequest();
        request.setWarehouseId(SALES_WAREHOUSE_ID);
        request.setLines(List.of(lines));
        return request;
    }

    private static DirectCheckoutRequest.Line line(Long variantId, Long warehouseId) {
        DirectCheckoutRequest.Line line = new DirectCheckoutRequest.Line();
        line.setVariantId(variantId);
        line.setWarehouseId(warehouseId);
        line.setQuantity(BigDecimal.ONE);
        line.setUnitPrice(new BigDecimal("100000"));
        return line;
    }
}
