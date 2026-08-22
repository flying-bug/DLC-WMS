package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.EInvoiceIssueRequest;
import com.duylongtech.backend.entity.EInvoice;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.EInvoiceRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.service.einvoice.EInvoiceProvider;
import com.duylongtech.backend.service.einvoice.EInvoiceProviderData;
import com.duylongtech.backend.service.einvoice.EInvoiceProviderFactory;
import com.duylongtech.backend.service.einvoice.EInvoiceProviderResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EInvoiceServiceTest {

    @Mock
    private EInvoiceRepository einvoiceRepository;

    @Mock
    private SalesOrderRepository salesOrderRepository;

    @Mock
    private InventoryDocumentRepository inventoryDocumentRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private EInvoiceProviderFactory providerFactory;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private EInvoiceProvider einvoiceProvider;

    @InjectMocks
    private EInvoiceService einvoiceService;

    private SalesOrder mockSalesOrder;
    private InventoryDocument mockExportDoc;
    private Partner mockPartner;

    @BeforeEach
    void setUp() {
        mockSalesOrder = SalesOrder.builder()
                .id(100L)
                .soCode("SO0005")
                .partnerId(1L)
                .status("APPROVED")
                .lines(Collections.emptyList())
                .build();

        mockExportDoc = InventoryDocument.builder()
                .id(200L)
                .docCode("PXK0001")
                .salesOrderId(100L)
                .partnerId(1L)
                .status("POSTED")
                .lines(Collections.emptyList())
                .build();

        mockPartner = Partner.builder()
                .id(1L)
                .name("Công ty TNHH Khách Hàng")
                .code("KH001")
                .taxCode("0123456789")
                .address("Hà Nội")
                .phone("0987654321")
                .email("khachhang@example.com")
                .build();
    }

    @Test
    @DisplayName("Chặn xuất HĐ cấp phiếu xuất khi đơn hàng gốc đã có HĐ cấp đơn (toàn đơn)")
    void shouldBlockExportInvoiceWhenSoAlreadyHasSoLevelInvoice() {
        EInvoiceIssueRequest request = EInvoiceIssueRequest.builder()
                .inventoryDocumentId(200L)
                .salesOrderId(100L)
                .build();

        when(inventoryDocumentRepository.findById(200L)).thenReturn(Optional.of(mockExportDoc));
        when(einvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(200L, "CANCELED")).thenReturn(Optional.empty());
        when(salesOrderRepository.findById(100L)).thenReturn(Optional.of(mockSalesOrder));

        EInvoice existingSoInvoice = EInvoice.builder()
                .id(1L)
                .salesOrderId(100L)
                .inventoryDocumentId(null)
                .invoiceNumber("0653053")
                .invoiceSeries("1C26TLL")
                .status("ISSUED")
                .build();

        when(einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(Optional.of(existingSoInvoice));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                einvoiceService.issueInvoiceFromSalesOrder(request, 1L)
        );

        assertTrue(exception.getMessage().contains("đã được xuất hóa đơn điện tử toàn bộ đơn"));
        assertTrue(exception.getMessage().contains("0653053"));
        verify(einvoiceProvider, never()).issueInvoice(any());
    }

    @Test
    @DisplayName("Chặn xuất HĐ cấp phiếu xuất khi chính phiếu xuất đó đã có HĐ đang hoạt động")
    void shouldBlockExportInvoiceWhenExportDocAlreadyHasInvoice() {
        EInvoiceIssueRequest request = EInvoiceIssueRequest.builder()
                .inventoryDocumentId(200L)
                .build();

        when(inventoryDocumentRepository.findById(200L)).thenReturn(Optional.of(mockExportDoc));

        EInvoice existingExportInvoice = EInvoice.builder()
                .id(2L)
                .inventoryDocumentId(200L)
                .invoiceNumber("0513919")
                .invoiceSeries("1C26TLL")
                .status("ISSUED")
                .build();

        when(einvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(200L, "CANCELED"))
                .thenReturn(Optional.of(existingExportInvoice));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                einvoiceService.issueInvoiceFromSalesOrder(request, 1L)
        );

        assertTrue(exception.getMessage().contains("Phiếu xuất kho PXK0001 đã được xuất hóa đơn"));
        assertTrue(exception.getMessage().contains("0513919"));
        verify(einvoiceProvider, never()).issueInvoice(any());
    }

    @Test
    @DisplayName("Chặn xuất HĐ cấp đơn hàng khi đơn hàng đã có HĐ cấp đơn trước đó")
    void shouldBlockSoInvoiceWhenSoAlreadyHasSoLevelInvoice() {
        EInvoiceIssueRequest request = EInvoiceIssueRequest.builder()
                .salesOrderId(100L)
                .build();

        when(salesOrderRepository.findById(100L)).thenReturn(Optional.of(mockSalesOrder));

        EInvoice existingSoInvoice = EInvoice.builder()
                .id(1L)
                .salesOrderId(100L)
                .inventoryDocumentId(null)
                .invoiceNumber("0653053")
                .invoiceSeries("1C26TLL")
                .status("ISSUED")
                .build();

        when(einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(Optional.of(existingSoInvoice));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                einvoiceService.issueInvoiceFromSalesOrder(request, 1L)
        );

        assertTrue(exception.getMessage().contains("0653053"));
        assertTrue(exception.getMessage().contains("toàn bộ đơn hàng"));
        verify(einvoiceProvider, never()).issueInvoice(any());
    }

    @Test
    @DisplayName("Chặn xuất HĐ cấp đơn hàng khi đã có bất kỳ phiếu xuất nào xuất HĐ riêng")
    void shouldBlockSoInvoiceWhenExportLevelInvoicesExist() {
        EInvoiceIssueRequest request = EInvoiceIssueRequest.builder()
                .salesOrderId(100L)
                .build();

        when(salesOrderRepository.findById(100L)).thenReturn(Optional.of(mockSalesOrder));
        when(einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(Optional.empty());

        EInvoice exportInvoice1 = EInvoice.builder()
                .id(3L)
                .salesOrderId(100L)
                .inventoryDocumentId(200L)
                .invoiceNumber("0111222")
                .invoiceSeries("1C26TLL")
                .status("ISSUED")
                .build();

        when(einvoiceRepository.findAllBySalesOrderIdAndInventoryDocumentIdIsNotNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(List.of(exportInvoice1));

        BusinessException exception = assertThrows(BusinessException.class, () ->
                einvoiceService.issueInvoiceFromSalesOrder(request, 1L)
        );

        assertTrue(exception.getMessage().contains("đã có 1 hóa đơn điện tử được xuất theo từng đợt xuất kho"));
        assertTrue(exception.getMessage().contains("0111222"));
        verify(einvoiceProvider, never()).issueInvoice(any());
    }

    @Test
    @DisplayName("Cho phép xuất HĐ cấp đơn hàng khi chưa có HĐ cấp đơn lẫn HĐ cấp phiếu xuất")
    void shouldAllowSoInvoiceWhenNoInvoicesExist() {
        EInvoiceIssueRequest request = EInvoiceIssueRequest.builder()
                .salesOrderId(100L)
                .build();

        when(salesOrderRepository.findById(100L)).thenReturn(Optional.of(mockSalesOrder));
        when(einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(Optional.empty());
        when(einvoiceRepository.findAllBySalesOrderIdAndInventoryDocumentIdIsNotNullAndStatusNot(100L, "CANCELED"))
                .thenReturn(Collections.emptyList());
        when(partnerRepository.findById(1L)).thenReturn(Optional.of(mockPartner));
        when(providerFactory.getActiveProvider()).thenReturn(einvoiceProvider);

        EInvoiceProviderResult result = EInvoiceProviderResult.builder()
                .success(true)
                .invoiceNumber("0653053")
                .invoiceSeries("1C26TLL")
                .templateCode("1/001")
                .issuedAt(LocalDateTime.now())
                .cqtCode("CQT12345")
                .cqtStatus("VALID")
                .build();

        when(einvoiceProvider.issueInvoice(any(EInvoiceProviderData.class))).thenReturn(result);
        when(einvoiceProvider.getProviderName()).thenReturn("MOCK");
        when(einvoiceRepository.save(any(EInvoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> einvoiceService.issueInvoiceFromSalesOrder(request, 1L));
        verify(einvoiceProvider, times(1)).issueInvoice(any());
    }
}
