package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InventoryShortageAndUnpostTest {

    @Mock private InventoryDocumentRepository inventoryDocumentRepository;
    @Mock private InventoryDocumentLineRepository inventoryDocumentLineRepository;
    @Mock private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock private InventoryCostLayerRepository inventoryCostLayerRepository;
    @Mock private InventoryLedgerRepository inventoryLedgerRepository;
    @Mock private SerialNumberRepository serialNumberRepository;
    @Mock private PartnerLedgerService partnerLedgerService;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private SalesOrderService salesOrderService;
    @Mock private AppNotificationService appNotificationService;
    @Mock private DocumentDependencyService documentDependencyService;
    @Mock private AuditLogService auditLogService;
    @Mock private UserRepository userRepository;
    @Mock private PartnerRepository partnerRepository;

    @InjectMocks
    private InventoryDocumentService inventoryDocumentService;

    private InventoryDocument sampleDoc;
    private InventoryDocumentLine sampleLine;
    private PurchaseOrder samplePo;
    private ProductVariant sampleVariant;

    @BeforeEach
    void setUp() {
        sampleVariant = ProductVariant.builder()
                .id(100L)
                .sku("VGA-RTX4070")
                .costPrice(BigDecimal.valueOf(1000))
                .salePrice(BigDecimal.valueOf(1200))
                .build();

        sampleLine = InventoryDocumentLine.builder()
                .id(201L)
                .variantId(100L)
                .expectedQuantity(BigDecimal.valueOf(10)) // Dự kiến 10
                .quantityIn(BigDecimal.valueOf(8))       // Thực nhận 8 (Thiếu 2)
                .unitCost(BigDecimal.valueOf(1000))
                .lineAmount(BigDecimal.valueOf(8000))
                .serialNumbersText("SN-01,SN-02,SN-03,SN-04,SN-05,SN-06,SN-07,SN-08")
                .build();

        samplePo = PurchaseOrder.builder()
                .id(301L)
                .poCode("PO0001")
                .status("APPROVED")
                .lines(List.of(
                        PurchaseOrderLine.builder()
                                .variantId(100L)
                                .quantity(BigDecimal.valueOf(10))
                                .build()
                ))
                .build();

        sampleDoc = InventoryDocument.builder()
                .id(501L)
                .docCode("NK00004")
                .docType("IN_PO")
                .status("DRAFT")
                .warehouseId(1L)
                .purchaseOrderId(301L)
                .lines(new ArrayList<>(List.of(sampleLine)))
                .build();
    }

    @Test
    @DisplayName("postImport - Nhập thiếu 2 sản phẩm: Ghi nhận discrepancy và bắn thông báo tới Accountant/Manager")
    void postImport_shortageQuantity_setsDiscrepancyAndSendsAlert() {
        when(inventoryDocumentRepository.findImportByIdWithLines(501L)).thenReturn(Optional.of(sampleDoc));
        when(inventoryDocumentRepository.findById(501L)).thenReturn(Optional.of(sampleDoc));
        when(inventoryDocumentRepository.save(any(InventoryDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(inventoryDocumentRepository.saveAndFlush(any(InventoryDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(productVariantRepository.findById(100L)).thenReturn(Optional.of(sampleVariant));
        when(purchaseOrderRepository.findByIdWithDetails(301L)).thenReturn(Optional.of(samplePo));
        when(inventoryDocumentLineRepository.sumImportedQuantityByPurchaseOrderIdAndVariantId(301L, 100L))
                .thenReturn(BigDecimal.valueOf(8)); // Chưa đủ 10

        InventoryBalance balance = InventoryBalance.builder()
                .warehouseId(1L)
                .variantId(100L)
                .quantityOnHand(BigDecimal.ZERO)
                .averageCost(BigDecimal.ZERO)
                .build();
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(anyLong(), anyLong(), anyString()))
                .thenReturn(Optional.of(balance));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(anyLong(), anyLong()))
                .thenReturn(List.of(balance));

        InventoryDocumentResponse res = inventoryDocumentService.postImport(501L);

        assertNotNull(res);
        assertEquals("POSTED", res.getStatus());
        assertTrue(sampleDoc.getHasDiscrepancy());
        assertNotNull(sampleDoc.getDiscrepancyNote());
        assertTrue(sampleDoc.getDiscrepancyNote().contains("Thiếu: 2"));

        // Xác nhận PO chưa bị đóng thành POSTED vì còn thiếu 2 cái
        assertNotEquals("POSTED", samplePo.getStatus());

        // Xác nhận đã gửi Notification cảnh báo
        verify(appNotificationService, atLeastOnce()).createNotification(
                eq("ROLE_ACCOUNTANT"), any(), contains("Cảnh báo nhập kho thiếu"), anyString(),
                eq("DISCREPANCY"), eq("IMPORT_DOCUMENT"), eq(501L), anyString());
        verify(appNotificationService, atLeastOnce()).createNotification(
                eq("ROLE_MANAGER"), any(), contains("Cảnh báo nhập kho thiếu"), anyString(),
                eq("DISCREPANCY"), eq("IMPORT_DOCUMENT"), eq(501L), anyString());
    }

    @Test
    @DisplayName("unpostImport - Bỏ ghi sổ an toàn: Cập nhật status UNPOSTED, hoàn tác tồn kho và ghi AuditLog")
    void unpostImport_validRequest_rollsBackStockAndLogsAudit() {
        sampleDoc.setStatus("POSTED");
        sampleDoc.setPostedAt(LocalDateTime.now().minusHours(1));
        when(inventoryDocumentRepository.findImportByIdWithLines(501L)).thenReturn(Optional.of(sampleDoc));
        when(inventoryDocumentRepository.findById(501L)).thenReturn(Optional.of(sampleDoc));
        when(inventoryDocumentRepository.save(any(InventoryDocument.class))).thenAnswer(i -> i.getArgument(0));

        com.duylongtech.backend.dto.response.DependencyCheckResponse checkRes =
                com.duylongtech.backend.dto.response.DependencyCheckResponse.builder().canUnpost(true).build();
        when(documentDependencyService.checkImportSlipUnpostable(501L)).thenReturn(checkRes);

        InventoryBalance balance = InventoryBalance.builder()
                .warehouseId(1L)
                .variantId(100L)
                .quantityOnHand(BigDecimal.valueOf(8))
                .averageCost(BigDecimal.valueOf(1000))
                .build();
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(anyLong(), anyLong(), anyString()))
                .thenReturn(Optional.of(balance));

        InventoryDocumentResponse res = inventoryDocumentService.unpostImport(501L, "Kiểm tra hoàn tác", 7L);

        assertNotNull(res);
        assertEquals("UNPOSTED", res.getStatus());
        assertEquals("Kiểm tra hoàn tác", sampleDoc.getUnpostReason());
        assertEquals(7L, sampleDoc.getUnpostedBy());

        // Xác nhận tồn kho bị giảm đi 8 (về 0)
        assertEquals(BigDecimal.ZERO, balance.getQuantityOnHand());

        // Xác nhận đã ghi thẻ kho đảo ngược UNPOST_IMPORT
        verify(inventoryLedgerRepository, atLeastOnce()).save(any(InventoryLedger.class));

        // Xác nhận đã ghi AuditLog
        verify(auditLogService, atLeastOnce()).logEvent(
                any(), eq("UNPOST_IMPORT"), eq("InventoryDocument"), eq(501L), eq("SUCCESS"),
                contains("Bỏ ghi sổ phiếu nhập kho"), any(), any());
    }
}
