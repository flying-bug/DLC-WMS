package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.EInvoiceCancelRequest;
import com.duylongtech.backend.dto.request.EInvoiceIssueRequest;
import com.duylongtech.backend.dto.response.EInvoiceResponse;
import com.duylongtech.backend.entity.EInvoice;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.EInvoiceRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
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
