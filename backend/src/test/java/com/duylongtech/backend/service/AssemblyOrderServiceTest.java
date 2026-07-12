package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.AssemblyBomLineRequest;
import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.entity.AssemblyBom;
import com.duylongtech.backend.entity.AssemblyOrder;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssemblyOrderServiceTest {

    @Mock
    private AssemblyBomRepository assemblyBomRepository;
    @Mock
    private AssemblyOrderRepository assemblyOrderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private InventoryDocumentRepository inventoryDocumentRepository;
    @Mock
    private InventoryDocumentService inventoryDocumentService;

    @InjectMocks
    private AssemblyOrderService assemblyOrderService;

    private Product mockProduct;
    private ProductVariant mockVariant;
    private AssemblyOrder mockOrder;

    @BeforeEach
    void setUp() {
        mockProduct = Product.builder().id(1L).productCode("P01").productName("Thành phẩm 1").build();
        mockVariant = ProductVariant.builder().id(1L).product(mockProduct).sku("V01").variantName("V01").active(true).build();
        
        mockOrder = new AssemblyOrder();
        mockOrder.setId(10L);
        mockOrder.setStatus("APPROVED");
        
        AssemblyBom mockBom = new AssemblyBom();
        mockBom.setId(1L);
        mockOrder.setBom(mockBom);
    }

    // ─── TEST VALIDATE COST ALLOCATION (T020) ──────────────────────────────

    @Test
    void createBom_WithValidCostAllocation_ShouldSucceed() {
        // Arrange
        AssemblyBomRequest request = new AssemblyBomRequest();
        request.setProductId(1L);
        request.setBomName("Test BOM");
        request.setVersionNo(BigDecimal.ONE);
        
        AssemblyBomLineRequest line1 = new AssemblyBomLineRequest();
        line1.setComponentVariantId(1L);
        line1.setQuantity(BigDecimal.valueOf(2));
        line1.setCostAllocationPct(BigDecimal.valueOf(60.5));
        
        AssemblyBomLineRequest line2 = new AssemblyBomLineRequest();
        line2.setComponentVariantId(2L);
        line2.setQuantity(BigDecimal.valueOf(3));
        line2.setCostAllocationPct(BigDecimal.valueOf(39.5));
        
        request.setLines(List.of(line1, line2));

        when(productRepository.findById(1L)).thenReturn(Optional.of(mockProduct));
        when(productVariantRepository.findById(any())).thenReturn(Optional.of(mockVariant));
        when(assemblyBomRepository.save(any())).thenAnswer(inv -> {
            AssemblyBom bom = inv.getArgument(0);
            bom.setId(1L);
            return bom;
        });

        // Act & Assert
        assertDoesNotThrow(() -> assemblyOrderService.createBom(request));
    }

    @Test
    void createBom_WithInvalidTotalCostAllocation_ShouldThrowException() {
        // Arrange
        AssemblyBomRequest request = new AssemblyBomRequest();
        request.setProductId(1L);
        request.setLines(new ArrayList<>());
        
        AssemblyBomLineRequest line1 = new AssemblyBomLineRequest();
        line1.setComponentVariantId(1L);
        line1.setQuantity(BigDecimal.valueOf(1));
        line1.setCostAllocationPct(BigDecimal.valueOf(99.9)); // Total != 100
        
        request.getLines().add(line1);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> assemblyOrderService.createBom(request));
        assertEquals(SystemMessage.ASM_INVALID_COST_PCT.getMessage(), ex.getMessage());
    }

    @Test
    void createBom_WithNegativeCostAllocation_ShouldThrowException() {
        // Arrange
        AssemblyBomRequest request = new AssemblyBomRequest();
        request.setProductId(1L);
        request.setLines(new ArrayList<>());
        
        AssemblyBomLineRequest line1 = new AssemblyBomLineRequest();
        line1.setComponentVariantId(1L);
        line1.setQuantity(BigDecimal.valueOf(1));
        line1.setCostAllocationPct(BigDecimal.valueOf(-10)); // Âm
        
        request.getLines().add(line1);

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> assemblyOrderService.createBom(request));
        assertEquals(SystemMessage.ASM_INVALID_COST_PCT.getMessage(), ex.getMessage());
    }

    // ─── TEST HARD BLOCK CANCELLATION (T020) ──────────────────────────────

    @Test
    void updateOrderStatus_ToCancelled_WithPostedDocs_ShouldThrowException() {
        // Arrange
        when(assemblyOrderRepository.findByIdWithLines(10L)).thenReturn(Optional.of(mockOrder));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", 10L))
                .thenReturn(true); // Đã có phiếu kho

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> 
            assemblyOrderService.updateOrderStatus(10L, "CANCELLED"));
        
        assertEquals(SystemMessage.ASM_HAS_POSTED_DOCS.getMessage(), ex.getMessage());
    }

    @Test
    void updateOrderStatus_ToCancelled_WithoutPostedDocs_ShouldSucceed() {
        // Arrange
        when(assemblyOrderRepository.findByIdWithLines(10L)).thenReturn(Optional.of(mockOrder));
        when(inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", 10L))
                .thenReturn(false); // Chưa có phiếu kho
        when(assemblyOrderRepository.save(any())).thenReturn(mockOrder);

        // Act
        assemblyOrderService.updateOrderStatus(10L, "CANCELLED");

        // Assert
        verify(assemblyOrderRepository).save(mockOrder);
        assertEquals("CANCELLED", mockOrder.getStatus());
    }

    @Test
    void updateOrderStatus_ToOtherStatus_ShouldSucceed() {
        // Arrange
        when(assemblyOrderRepository.findByIdWithLines(10L)).thenReturn(Optional.of(mockOrder));
        when(assemblyOrderRepository.save(any())).thenReturn(mockOrder);

        // Act
        assemblyOrderService.updateOrderStatus(10L, "POSTED");

        // Assert
        verify(inventoryDocumentRepository, never()).existsByReferenceTypeAndReferenceId(anyString(), anyLong());
        verify(assemblyOrderRepository).save(mockOrder);
        assertEquals("POSTED", mockOrder.getStatus());
    }
}
