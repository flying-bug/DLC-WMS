package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AssemblyBomLineRequest;
import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.entity.AssemblyBom;
import com.duylongtech.backend.entity.AssemblyBomLine;
import com.duylongtech.backend.entity.AssemblyOrder;
import com.duylongtech.backend.entity.AssemblyOrderLine;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssemblyOrderWorkflowTest {
    @Mock AssemblyBomRepository assemblyBomRepository;
    @Mock AssemblyOrderRepository assemblyOrderRepository;
    @Mock ProductRepository productRepository;
    @Mock ProductVariantRepository productVariantRepository;
    @Mock InventoryDocumentRepository inventoryDocumentRepository;
    @Mock InventoryDocumentService inventoryDocumentService;
    @Mock AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    @Mock DeviceComponentSerialRepository deviceComponentSerialRepository;
    @Mock SerialNumberRepository serialNumberRepository;
    @Mock RepairRepository repairRepository;
    @Mock UserRepository userRepository;
    @Mock AppNotificationService appNotificationService;

    @InjectMocks AssemblyOrderService service;

    @Test
    void createBom_alwaysStartsDraft() {
        Product product = Product.builder().id(1L).productCode("PC").productName("PC").build();
        ProductVariant component = ProductVariant.builder().id(2L).sku("RAM").product(product).build();
        AssemblyBomLineRequest line = new AssemblyBomLineRequest();
        line.setComponentVariantId(2L);
        line.setQuantity(BigDecimal.ONE);
        AssemblyBomRequest request = new AssemblyBomRequest();
        request.setProductId(1L);
        request.setStatus("APPROVED");
        request.setLines(List.of(line));

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(assemblyBomRepository.findAllWithLines(null, 1L)).thenReturn(List.of());
        when(productVariantRepository.findById(2L)).thenReturn(Optional.of(component));
        when(assemblyBomRepository.save(any())).thenAnswer(invocation -> {
            AssemblyBom bom = invocation.getArgument(0);
            bom.setId(10L);
            return bom;
        });

        assertEquals("DRAFT", service.createBom(request).getStatus());
    }

    @Test
    void approveOrder_createsExactlyOneDocumentPair() {
        Product product = Product.builder().id(1L).productName("PC").build();
        ProductVariant target = ProductVariant.builder().id(2L).sku("PC-1").product(product).build();
        ProductVariant component = ProductVariant.builder().id(3L).sku("RAM-1").product(product).build();
        AssemblyBom bom = AssemblyBom.builder().id(4L).status("APPROVED").product(product).build();
        AssemblyOrder order = AssemblyOrder.builder().id(5L).orderCode("LR-1").orderType("ASSEMBLY")
                .status("PENDING_APPROVAL").bom(bom).targetVariant(target).warehouseId(6L)
                .quantity(BigDecimal.ONE).createdBy(7L).build();
        order.getLines().add(AssemblyOrderLine.builder().assemblyOrder(order).componentVariant(component)
                .quantityRequired(BigDecimal.ONE).quantityActual(BigDecimal.ONE).build());

        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", 5L)).thenReturn(false);
        when(assemblyOrderSerialRepository.findByAssemblyOrderId(5L)).thenReturn(List.of());

        assertEquals("APPROVED", service.approveOrder(5L, 8L).getStatus());
        verify(inventoryDocumentService, times(1)).createExport(any());
        verify(inventoryDocumentService, times(1)).createImport(any());
    }

    @Test
    void approveOrder_existingDocumentsRejectsDuplicatePair() {
        AssemblyOrder order = order("PENDING_APPROVAL");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", 5L)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.approveOrder(5L, 8L));
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void approveOrder_retryAfterSuccess_isIdempotent() {
        AssemblyOrder order = order("APPROVED");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", 5L, "EX_SO"))
                .thenReturn(true);
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", 5L, "IN_PO"))
                .thenReturn(true);
        when(assemblyOrderSerialRepository.findByAssemblyOrderId(5L)).thenReturn(List.of());

        assertEquals("APPROVED", service.approveOrder(5L, 8L).getStatus());
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void cancelApprovedOrder_requiresAccountantConfirmation() {
        AssemblyOrder order = order("APPROVED");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(assemblyOrderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(assemblyOrderSerialRepository.findByAssemblyOrderId(5L)).thenReturn(List.of());

        assertEquals("REQUESTED", service.requestCancel(5L, 7L, "Linh kiện lỗi")
                .getCancellationSettlementStatus());
        assertEquals("APPROVED", order.getStatus());
    }

    @Test
    void confirmCancel_postedImportIsBlocked() {
        AssemblyOrder order = order("IN_PROGRESS");
        order.setCancellationSettlementStatus("REQUESTED");
        InventoryDocument receipt = InventoryDocument.builder().docType("IN_PO").status("POSTED").build();
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.findByReferenceWithLines("ASSEMBLY_ORDER", 5L))
                .thenReturn(List.of(receipt));

        assertThrows(RuntimeException.class, () -> service.confirmCancel(5L, 8L));
        assertEquals("IN_PROGRESS", order.getStatus());
    }

    @Test
    void rejectedBom_canBeResubmitted() {
        Product product = Product.builder().id(1L).productName("PC").build();
        ProductVariant component = ProductVariant.builder().id(2L).sku("RAM").product(product).build();
        AssemblyBom bom = AssemblyBom.builder().id(3L).bomCode("BOM-1").status("REJECTED").product(product).build();
        bom.getLines().add(AssemblyBomLine.builder().assemblyBom(bom).componentVariant(component)
                .quantity(BigDecimal.ONE).build());
        when(assemblyBomRepository.findByIdWithLines(3L)).thenReturn(Optional.of(bom));
        when(assemblyBomRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals("PENDING_APPROVAL", service.submitBom(3L, 7L).getStatus());
    }

    @Test
    void rejectOrder_requiresReason() {
        AssemblyOrder order = order("PENDING_APPROVAL");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));

        assertThrows(RuntimeException.class, () -> service.rejectOrder(5L, 8L, "  "));
        assertEquals("PENDING_APPROVAL", order.getStatus());
    }

    @Test
    void approveOrder_secondDocumentFailureStopsApproval() {
        AssemblyOrder order = order("PENDING_APPROVAL");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", 5L)).thenReturn(false);
        doThrow(new RuntimeException("import failed")).when(inventoryDocumentService).createImport(any());

        assertThrows(RuntimeException.class, () -> service.approveOrder(5L, 8L));
        verify(inventoryDocumentService).createExport(any());
        verify(inventoryDocumentService).createImport(any());
    }

    @Test
    void confirmCancel_postedExportRequiresUnpost() {
        AssemblyOrder order = order("IN_PROGRESS");
        order.setCancellationSettlementStatus("REQUESTED");
        InventoryDocument export = InventoryDocument.builder().docType("EX_SO").status("POSTED").build();
        InventoryDocument receipt = InventoryDocument.builder().docType("IN_PO").status("DRAFT").build();
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(inventoryDocumentRepository.findByReferenceWithLines("ASSEMBLY_ORDER", 5L))
                .thenReturn(List.of(export, receipt));
        when(assemblyOrderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(assemblyOrderSerialRepository.findByAssemblyOrderId(5L)).thenReturn(List.of());

        var response = service.confirmCancel(5L, 8L);

        assertEquals("CANCELLED", response.getStatus());
        assertEquals("PENDING_UNPOST", response.getCancellationSettlementStatus());
        assertEquals("CANCELLED", receipt.getStatus());
    }

    @Test
    void cancelDraftOrder_isImmediatelySettled() {
        AssemblyOrder order = order("DRAFT");
        when(assemblyOrderRepository.findByIdWithLines(5L)).thenReturn(Optional.of(order));
        when(assemblyOrderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(assemblyOrderSerialRepository.findByAssemblyOrderId(5L)).thenReturn(List.of());

        var response = service.requestCancel(5L, 7L, "Không còn nhu cầu");

        assertEquals("CANCELLED", response.getStatus());
        assertEquals("SETTLED", response.getCancellationSettlementStatus());
    }

    private AssemblyOrder order(String status) {
        Product product = Product.builder().id(1L).productName("PC").build();
        ProductVariant target = ProductVariant.builder().id(2L).sku("PC-1").product(product).build();
        ProductVariant component = ProductVariant.builder().id(3L).sku("RAM-1").product(product).build();
        AssemblyBom bom = AssemblyBom.builder().id(4L).status("APPROVED").product(product).build();
        AssemblyOrder order = AssemblyOrder.builder().id(5L).orderCode("LR-1").orderType("ASSEMBLY")
                .status(status).bom(bom).targetVariant(target).warehouseId(6L)
                .quantity(BigDecimal.ONE).createdBy(7L).build();
        order.getLines().add(AssemblyOrderLine.builder().assemblyOrder(order).componentVariant(component)
                .quantityRequired(BigDecimal.ONE).quantityActual(BigDecimal.ONE).build());
        return order;
    }
}
