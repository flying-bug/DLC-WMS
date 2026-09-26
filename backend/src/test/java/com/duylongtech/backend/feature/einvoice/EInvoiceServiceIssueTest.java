package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.system.CompanyProfileDto;
import com.duylongtech.backend.feature.system.SystemSettingsService;
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
 * Phát hành HĐĐT: HĐ gộp cả đơn chỉ khi đơn đã xuất kho đủ (Khoản 1 Điều 9 NĐ 123), và HĐ theo phiếu xuất không
 * được tính VAT hai lần (lineAmount của dòng phiếu xuất đã gồm VAT).
 */
class EInvoiceServiceIssueTest {

    private final EInvoiceRepository einvoiceRepository = mock(EInvoiceRepository.class);
    private final SalesOrderRepository salesOrderRepository = mock(SalesOrderRepository.class);
    private final InventoryDocumentRepository inventoryDocumentRepository = mock(InventoryDocumentRepository.class);
    private final PartnerRepository partnerRepository = mock(PartnerRepository.class);
    private final EInvoiceProviderFactory providerFactory = mock(EInvoiceProviderFactory.class);
    private final EInvoiceProvider provider = mock(EInvoiceProvider.class);
    private final SystemSettingsService settingsService = mock(SystemSettingsService.class);
    private EInvoiceService service;

    @BeforeEach
    void setUp() {
        service = new EInvoiceService(einvoiceRepository, salesOrderRepository, inventoryDocumentRepository,
                mock(ProductVariantRepository.class), partnerRepository, providerFactory, mock(AuditLogService.class),
                settingsService);
        when(settingsService.getCompanyProfile()).thenReturn(CompanyProfileDto.builder()
                .name("Công ty Test").taxCode("0100000000").address("Hà Nội").build());
        when(providerFactory.getActiveProvider()).thenReturn(provider);
        when(partnerRepository.findById(9L)).thenReturn(Optional.of(mock(Partner.class)));
        // Provider trả lỗi để dừng ngay sau khi dựng dữ liệu hóa đơn; test chỉ cần dữ liệu gửi đi.
        when(provider.issueInvoice(any())).thenReturn(EInvoiceProviderResult.builder().success(false).build());
    }

    private static SalesOrder salesOrder(String status) {
        SalesOrder so = mock(SalesOrder.class);
        when(so.getId()).thenReturn(50L);
        when(so.getSoCode()).thenReturn("SO0120");
        when(so.getStatus()).thenReturn(status);
        when(so.getPartnerId()).thenReturn(9L);
        when(so.getLines()).thenReturn(List.of());
        return so;
    }

    private static EInvoiceIssueRequest wholeOrderRequest() {
        EInvoiceIssueRequest request = new EInvoiceIssueRequest();
        request.setSalesOrderId(50L);
        return request;
    }

    @Test
    void wholeOrderInvoiceIsRejectedWhileTheOrderIsOnlyApproved() {
        SalesOrder so = salesOrder("APPROVED");
        when(salesOrderRepository.findById(50L)).thenReturn(Optional.of(so));

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.issueInvoiceFromSalesOrder(wholeOrderRequest(), 1L));

        assertTrue(error.getMessage().contains("chưa xuất kho đủ"));
        verify(provider, never()).issueInvoice(any());
    }

    @Test
    void wholeOrderInvoiceIsAllowedOnceTheOrderIsFullyExported() {
        SalesOrder so = salesOrder("POSTED");
        when(salesOrderRepository.findById(50L)).thenReturn(Optional.of(so));

        // Đi tới bước gọi provider (provider giả trả lỗi) nghĩa là đã qua bước chặn trạng thái.
        BusinessException error = assertThrows(BusinessException.class,
                () -> service.issueInvoiceFromSalesOrder(wholeOrderRequest(), 1L));

        assertTrue(error.getMessage().startsWith("Phát hành hóa đơn điện tử thất bại"));
        verify(provider).issueInvoice(any());
    }

    @Test
    void exportSlipInvoiceChargesVatOnlyOnce() {
        // 1 x 2.000.000, VAT 8%: lineAmount của dòng phiếu xuất đã là 2.160.000 (gồm VAT).
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setQuantityOut(BigDecimal.ONE);
        line.setUnitPrice(new BigDecimal("2000000"));
        line.setVatRate(new BigDecimal("8"));
        line.setLineAmount(new BigDecimal("2160000"));
        InventoryDocument doc = mock(InventoryDocument.class);
        when(doc.getStatus()).thenReturn("POSTED");
        when(doc.getDocCode()).thenReturn("XK00100");
        when(doc.getPartnerId()).thenReturn(9L);
        when(doc.getLines()).thenReturn(List.of(line));
        when(inventoryDocumentRepository.findById(70L)).thenReturn(Optional.of(doc));

        EInvoiceIssueRequest request = new EInvoiceIssueRequest();
        request.setInventoryDocumentId(70L);
        assertThrows(BusinessException.class, () -> service.issueInvoiceFromSalesOrder(request, 1L));

        ArgumentCaptor<EInvoiceProviderData> sent = ArgumentCaptor.forClass(EInvoiceProviderData.class);
        verify(provider).issueInvoice(sent.capture());
        assertEquals(0, new BigDecimal("2000000").compareTo(sent.getValue().getSubTotalAmount()));
        assertEquals(0, new BigDecimal("160000").compareTo(sent.getValue().getVatAmount()));
        assertEquals(0, new BigDecimal("2160000").compareTo(sent.getValue().getTotalAmount()));
    }

    @Test
    void sellerInfoOnTheInvoiceComesFromTheBusinessSettings() {
        SalesOrder so = salesOrder("POSTED");
        when(salesOrderRepository.findById(50L)).thenReturn(Optional.of(so));

        assertThrows(BusinessException.class, () -> service.issueInvoiceFromSalesOrder(wholeOrderRequest(), 1L));

        ArgumentCaptor<EInvoiceProviderData> sent = ArgumentCaptor.forClass(EInvoiceProviderData.class);
        verify(provider).issueInvoice(sent.capture());
        assertEquals("Công ty Test", sent.getValue().getSellerLegalName());
        assertEquals("0100000000", sent.getValue().getSellerTaxCode());
        assertEquals("Hà Nội", sent.getValue().getSellerAddress());
    }

    @Test
    void issuedInvoiceKeepsTheSellerItWasIssuedWithAfterTheSettingsChange() {
        EInvoice issued = new EInvoice();
        issued.setTransactionUuid("tx-1");
        issued.setStatus("ISSUED");
        issued.setSellerLegalName("Công ty Cũ <A&B>");
        issued.setSellerTaxCode("0109999999");
        issued.setSellerAddress("Địa chỉ cũ");
        when(einvoiceRepository.findByTransactionUuid("tx-1")).thenReturn(Optional.of(issued));
        // Thông tin doanh nghiệp hiện tại (setUp) là "Công ty Test": hóa đơn đã phát hành không được đổi theo.

        String html = service.renderPreviewHtml("tx-1");

        assertTrue(html.contains("Công ty Cũ &lt;A&amp;B&gt;"));
        assertTrue(html.contains("0109999999"));
        assertTrue(!html.contains("Công ty Test"));
    }
}
