package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.feature.einvoice.EInvoiceCancelRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceIssueRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceResponse;
import com.duylongtech.backend.feature.einvoice.EInvoice;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.einvoice.EInvoiceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.service.einvoice.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public interface EInvoiceService {
    Page<EInvoiceResponse> getInvoices(String keyword,
            String status,
            LocalDate fromDate,
            LocalDate toDate,
            Long partnerId,
            Pageable pageable);
    EInvoiceResponse getInvoiceById(Long id);
    List<EInvoiceResponse> getInvoicesBySalesOrderId(Long salesOrderId);
    EInvoiceResponse getInvoiceBySalesOrderId(Long salesOrderId);
    EInvoiceResponse getInvoiceByInventoryDocumentId(Long inventoryDocumentId);
    EInvoiceResponse issueInvoiceFromSalesOrder(EInvoiceIssueRequest request, Long currentUserId);
    EInvoiceResponse cancelInvoice(Long id, EInvoiceCancelRequest request, Long currentUserId);
}
