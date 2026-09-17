package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.enums.DocumentStatus;

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
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.einvoice.EInvoice;
import com.duylongtech.backend.feature.einvoice.EInvoiceCancelRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceIssueRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceRepository;
import com.duylongtech.backend.feature.einvoice.EInvoiceResponse;
import com.duylongtech.backend.feature.einvoice.EInvoiceService;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class EInvoiceService {

    private final EInvoiceRepository einvoiceRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PartnerRepository partnerRepository;
    private final EInvoiceProviderFactory providerFactory;
    private final AuditLogService auditLogService;

    // ─── Query List ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<EInvoiceResponse> getInvoices(
            String keyword,
            String status,
            LocalDate fromDate,
            LocalDate toDate,
            Long partnerId,
            Pageable pageable
    ) {
        return einvoiceRepository.searchInvoices(keyword, status, fromDate, toDate, partnerId, pageable)
                .map(this::toResponse);
    }

    // ─── Query Detail ───────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public EInvoiceResponse getInvoiceById(Long id) {
        EInvoice invoice = einvoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn điện tử #" + id));
        return toResponse(invoice);
    }

    @Transactional(readOnly = true)
    public List<EInvoiceResponse> getInvoicesBySalesOrderId(Long salesOrderId) {
        return einvoiceRepository.findAllBySalesOrderId(salesOrderId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EInvoiceResponse getInvoiceBySalesOrderId(Long salesOrderId) {
        return einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(salesOrderId, DocumentStatus.CANCELED.name())
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public EInvoiceResponse getInvoiceByInventoryDocumentId(Long inventoryDocumentId) {
        return einvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(inventoryDocumentId, DocumentStatus.CANCELED.name())
                .map(this::toResponse)
                .orElse(null);
    }

    // ─── Issue E-Invoice from Sales Order or Export Document (Khoản 1 Điều 9 NĐ 123) ──
    @Transactional
    public EInvoiceResponse issueInvoiceFromSalesOrder(EInvoiceIssueRequest request, Long currentUserId) {
        Long rawSoId = request.getSalesOrderId();
        Long exportDocId = request.getInventoryDocumentId();

        if (rawSoId == null && exportDocId == null) {
            throw new BusinessException("Vui lòng cung cấp mã đơn bán hàng hoặc mã phiếu xuất kho");
        }

        final InventoryDocument exportDoc;
        final Long soId;
        if (exportDocId != null) {
            final InventoryDocument foundDoc = inventoryDocumentRepository.findById(exportDocId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho #" + exportDocId));

            if (!DocumentStatus.POSTED.name().equalsIgnoreCase(foundDoc.getStatus())) {
                throw new BusinessException("Chỉ có thể xuất hóa đơn điện tử cho phiếu xuất kho đã ghi sổ (hoàn tất xuất kho).");
            }

            // 1. Kiểm tra xem phiếu xuất kho này đã xuất HĐĐT chưa
            final String expDocCode = foundDoc.getDocCode();
            einvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(exportDocId, DocumentStatus.CANCELED.name()).ifPresent(existing -> {
                throw new BusinessException(String.format(
                        "Phiếu xuất kho %s đã được xuất hóa đơn số %s (Ký hiệu: %s)",
                        expDocCode, existing.getInvoiceNumber(), existing.getInvoiceSeries()
                ));
            });

            exportDoc = foundDoc;
            soId = (rawSoId != null) ? rawSoId : foundDoc.getSalesOrderId();

            // 2. Kiểm tra chéo: Nếu đơn hàng gốc đã xuất HĐĐT toàn bộ đơn hàng (cấp SO), chặn không cho xuất theo từng phiếu xuất
            if (soId != null) {
                SalesOrder parentSo = salesOrderRepository.findById(soId).orElse(null);
                String parentSoCode = parentSo != null ? parentSo.getSoCode() : String.valueOf(soId);
                einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(soId, DocumentStatus.CANCELED.name()).ifPresent(soInv -> {
                    throw new BusinessException(String.format(
                            "Đơn bán hàng %s đã được xuất hóa đơn điện tử toàn bộ đơn số %s (Ký hiệu: %s). Theo quy định Nghị định 123/2020/NĐ-CP, không thể xuất thêm hóa đơn riêng cho từng phiếu xuất kho con.",
                            parentSoCode, soInv.getInvoiceNumber(), soInv.getInvoiceSeries()
                    ));
                });
            }
        } else {
            exportDoc = null;
            soId = rawSoId;
        }

        final SalesOrder so = (soId != null) ? salesOrderRepository.findById(soId).orElse(null) : null;

        // Nếu xuất HĐ toàn bộ đơn hàng (không theo phiếu xuất riêng)
        if (exportDoc == null && so != null) {
            final String soCode = so.getSoCode();
            // 1. Kiểm tra nếu đơn hàng đã có HĐĐT cấp đơn hàng
            einvoiceRepository.findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(so.getId(), DocumentStatus.CANCELED.name()).ifPresent(existing -> {
                throw new BusinessException(String.format(
                        "Đơn bán hàng %s đã được xuất hóa đơn số %s (Ký hiệu: %s) cho toàn bộ đơn hàng.",
                        soCode, existing.getInvoiceNumber(), existing.getInvoiceSeries()
                ));
            });

            // 2. Kiểm tra chéo: Nếu đơn hàng đã có bất kỳ phiếu xuất kho nào được xuất HĐĐT riêng
            List<EInvoice> exportInvoices = einvoiceRepository.findAllBySalesOrderIdAndInventoryDocumentIdIsNotNullAndStatusNot(so.getId(), DocumentStatus.CANCELED.name());
            if (!exportInvoices.isEmpty()) {
                EInvoice firstExpInv = exportInvoices.get(0);
                throw new BusinessException(String.format(
                        "Đơn bán hàng %s đã có %d hóa đơn điện tử được xuất theo từng đợt xuất kho (ví dụ HĐ số %s - Ký hiệu %s). Theo quy định Nghị định 123/2020/NĐ-CP, vui lòng tiếp tục xuất hóa đơn theo từng phiếu xuất kho thay vì xuất gộp toàn bộ đơn hàng.",
                        soCode, exportInvoices.size(), firstExpInv.getInvoiceNumber(), firstExpInv.getInvoiceSeries()
                ));
            }
        }

        Long partnerId = so != null ? so.getPartnerId() : (exportDoc != null ? exportDoc.getPartnerId() : null);
        if (partnerId == null) {
            throw new BusinessException("Không tìm thấy thông tin khách hàng đối tác để xuất hóa đơn");
        }

        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin khách hàng của đơn hàng"));

        // Lấy provider được cấu hình
        EInvoiceProvider provider = providerFactory.getActiveProvider();

        String txPrefix = exportDoc != null ? "EXP-" + exportDoc.getDocCode() : ("SO-" + (so != null ? so.getSoCode() : "GEN"));
        String txUuid = txPrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        String templateCode = request.getTemplateCode() != null && !request.getTemplateCode().isBlank()
                ? request.getTemplateCode() : "1/001";
        String invoiceSeries = request.getInvoiceSeries() != null && !request.getInvoiceSeries().isBlank()
                ? request.getInvoiceSeries() : "1C26TLL";

        // Chuẩn bị thông tin người mua
        String buyerName = request.getBuyerName() != null ? request.getBuyerName() : partner.getName();
        String buyerLegalName = request.getBuyerLegalName() != null ? request.getBuyerLegalName() : partner.getName();
        String buyerTaxCode = request.getBuyerTaxCode() != null ? request.getBuyerTaxCode() : partner.getTaxCode();
        String buyerAddress = request.getBuyerAddress() != null ? request.getBuyerAddress()
                : (so != null && so.getDeliveryAddress() != null ? so.getDeliveryAddress() : partner.getAddress());
        String buyerPhone = request.getBuyerPhone() != null ? request.getBuyerPhone() : partner.getPhone();
        String buyerEmail = request.getBuyerEmail() != null ? request.getBuyerEmail() : partner.getEmail();

        // Danh sách mặt hàng
        List<EInvoiceProviderData.LineItem> items = new ArrayList<>();
        int lineNum = 1;
        BigDecimal calculatedSubTotal = BigDecimal.ZERO;
        BigDecimal calculatedVat = BigDecimal.ZERO;

        if (exportDoc != null && exportDoc.getLines() != null && !exportDoc.getLines().isEmpty()) {
            // Lấy theo các dòng của Phiếu xuất kho đợt này (Khối lượng & giá trị thực xuất theo Khoản 1 Điều 9 NĐ 123)
            for (InventoryDocumentLine expLine : exportDoc.getLines()) {
                BigDecimal qty = expLine.getQuantityOut() != null ? expLine.getQuantityOut() : BigDecimal.ONE;
                BigDecimal price = expLine.getUnitPrice() != null ? expLine.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal vatRate = expLine.getVatRate() != null ? expLine.getVatRate()
                        : (expLine.getVatPercent() != null ? expLine.getVatPercent() : BigDecimal.ZERO);

                BigDecimal lineSubTotal = expLine.getLineAmount() != null ? expLine.getLineAmount() : qty.multiply(price);
                BigDecimal lineVat = lineSubTotal.multiply(vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal lineTotal = lineSubTotal.add(lineVat);

                calculatedSubTotal = calculatedSubTotal.add(lineSubTotal);
                calculatedVat = calculatedVat.add(lineVat);

                String itemName = "Sản phẩm";
                String unitName = "Cái";
                String sku = "SP" + expLine.getId();

                if (expLine.getVariantId() != null) {
                    ProductVariant variant = productVariantRepository.findById(expLine.getVariantId()).orElse(null);
                    if (variant != null) {
                        sku = variant.getSku() != null ? variant.getSku() : sku;
                        String baseName = (variant.getProduct() != null && variant.getProduct().getProductName() != null)
                                ? variant.getProduct().getProductName() : (variant.getVariantName() != null ? variant.getVariantName() : "Sản phẩm");
                        String varDetail = (variant.getVariantName() != null && !variant.getVariantName().equalsIgnoreCase(baseName))
                                ? " (" + variant.getVariantName() + ")" : "";
                        itemName = baseName + varDetail;
                        if (variant.getProduct() != null && variant.getProduct().getUnit() != null) {
                            unitName = variant.getProduct().getUnit().getName();
                        }
                    }
                }

                String lineNote = expLine.getSerialNumbersText() != null && !expLine.getSerialNumbersText().isBlank()
                        ? "S/N: " + expLine.getSerialNumbersText() : null;

                items.add(EInvoiceProviderData.LineItem.builder()
                        .lineNumber(lineNum++)
                        .itemCode(sku)
                        .itemName(itemName)
                        .unitName(unitName)
                        .quantity(qty)
                        .unitPrice(price)
                        .vatRate(vatRate)
                        .vatAmount(lineVat)
                        .lineTotalAmount(lineTotal)
                        .note(lineNote)
                        .build());
            }
        } else if (so != null && so.getLines() != null) {
            // Xuất theo toàn bộ Đơn bán hàng
            for (SalesOrderLine sol : so.getLines()) {
                BigDecimal qty = sol.getQuantity() != null ? sol.getQuantity() : BigDecimal.ONE;
                BigDecimal price = sol.getUnitPrice() != null ? sol.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal vatRate = sol.getVatRate() != null ? sol.getVatRate() : BigDecimal.ZERO;

                BigDecimal lineSubTotal = qty.multiply(price);
                BigDecimal lineVat = lineSubTotal.multiply(vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal lineTotal = lineSubTotal.add(lineVat);

                calculatedSubTotal = calculatedSubTotal.add(lineSubTotal);
                calculatedVat = calculatedVat.add(lineVat);

                String itemName = "Sản phẩm";
                String unitName = "Cái";
                String sku = "SP" + sol.getId();

                if (sol.getVariant() != null) {
                    ProductVariant variant = sol.getVariant();
                    sku = variant.getSku() != null ? variant.getSku() : sku;
                    String baseName = (variant.getProduct() != null && variant.getProduct().getProductName() != null)
                            ? variant.getProduct().getProductName() : (variant.getVariantName() != null ? variant.getVariantName() : "Sản phẩm");
                    String varDetail = (variant.getVariantName() != null && !variant.getVariantName().equalsIgnoreCase(baseName))
                            ? " (" + variant.getVariantName() + ")" : "";
                    itemName = baseName + varDetail;
                    if (variant.getProduct() != null && variant.getProduct().getUnit() != null) {
                        unitName = variant.getProduct().getUnit().getName();
                    }
                }

                items.add(EInvoiceProviderData.LineItem.builder()
                        .lineNumber(lineNum++)
                        .itemCode(sku)
                        .itemName(itemName)
                        .unitName(unitName)
                        .quantity(qty)
                        .unitPrice(price)
                        .vatRate(vatRate)
                        .vatAmount(lineVat)
                        .lineTotalAmount(lineTotal)
                        .note(null)
                        .build());
            }
        }

        BigDecimal grandTotal = calculatedSubTotal.add(calculatedVat);
        String amountInWords = convertMoneyToWords(grandTotal);

        EInvoiceProviderData providerData = EInvoiceProviderData.builder()
                .transactionUuid(txUuid)
                .invoiceType(request.getInvoiceType() != null ? request.getInvoiceType() : "1")
                .templateCode(templateCode)
                .invoiceSeries(invoiceSeries)
                .invoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now())
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "TM/CK")
                .currencyCode("VND")
                .exchangeRate(BigDecimal.ONE)
                .sellerTaxCode("0100109106")
                .sellerLegalName("CÔNG TY TNHH CÔNG NGHỆ DUY LONG")
                .sellerAddress("Hà Nội, Việt Nam")
                .buyerName(buyerName)
                .buyerLegalName(buyerLegalName)
                .buyerTaxCode(buyerTaxCode)
                .buyerAddress(buyerAddress)
                .buyerPhone(buyerPhone)
                .buyerEmail(buyerEmail)
                .items(items)
                .subTotalAmount(calculatedSubTotal)
                .vatAmount(calculatedVat)
                .totalAmount(grandTotal)
                .totalAmountInWords(amountInWords)
                .build();

        // Gọi Adapter phát hành
        EInvoiceProviderResult result = provider.issueInvoice(providerData);
        if (!result.isSuccess()) {
            throw new BusinessException("Phát hành hóa đơn điện tử thất bại: " + result.getErrorMessage());
        }

        // Lưu vào Database
        EInvoice einvoice = new EInvoice();
        einvoice.setSalesOrderId(so != null ? so.getId() : null);
        einvoice.setInventoryDocumentId(exportDoc != null ? exportDoc.getId() : null);
        einvoice.setPartnerId(partner.getId());
        einvoice.setInvoiceType(providerData.getInvoiceType());
        einvoice.setTemplateCode(result.getTemplateCode());
        einvoice.setInvoiceSeries(result.getInvoiceSeries());
        einvoice.setInvoiceNumber(result.getInvoiceNumber());
        einvoice.setInvoiceDate(providerData.getInvoiceDate());
        einvoice.setIssuedAt(result.getIssuedAt() != null ? result.getIssuedAt() : LocalDateTime.now());
        einvoice.setStatus("ISSUED");
        einvoice.setBuyerName(buyerName);
        einvoice.setBuyerLegalName(buyerLegalName);
        einvoice.setBuyerTaxCode(buyerTaxCode);
        einvoice.setBuyerAddress(buyerAddress);
        einvoice.setBuyerPhone(buyerPhone);
        einvoice.setBuyerEmail(buyerEmail);
        einvoice.setCurrencyCode("VND");
        einvoice.setExchangeRate(BigDecimal.ONE);
        einvoice.setPaymentMethod(providerData.getPaymentMethod());
        einvoice.setSubTotalAmount(calculatedSubTotal);
        einvoice.setVatAmount(calculatedVat);
        einvoice.setTotalAmount(grandTotal);
        einvoice.setTotalAmountInWords(amountInWords);
        einvoice.setCqtCode(result.getCqtCode());
        einvoice.setCqtStatus(result.getCqtStatus() != null ? result.getCqtStatus() : "VALID");
        einvoice.setTransactionUuid(txUuid);
        einvoice.setProvider(provider.getProviderName());
        einvoice.setViewUrl(result.getViewUrl());
        einvoice.setPdfUrl(result.getPdfUrl());
        einvoice.setPdfData(result.getPdfBase64());
        einvoice.setXmlData(result.getXmlData());
        einvoice.setRawRequest(result.getRawRequest());
        einvoice.setRawResponse(result.getRawResponse());
        einvoice.setCreatedBy(currentUserId != null ? currentUserId : 1L);

        EInvoice saved = einvoiceRepository.save(einvoice);

        String docRef = exportDoc != null ? ("phiếu xuất " + exportDoc.getDocCode()) : ("đơn hàng " + (so != null ? so.getSoCode() : ""));
        auditLogService.logEvent(
                "System",
                "ISSUE_EINVOICE",
                "E_INVOICE",
                saved.getId(),
                "SUCCESS",
                String.format("Phát hành HĐĐT số %s (Ký hiệu %s) cho %s", saved.getInvoiceNumber(), saved.getInvoiceSeries(), docRef),
                "127.0.0.1",
                null
        );

        return toResponse(saved);
    }

    // ─── Cancel E-Invoice ───────────────────────────────────────────────────────
    @Transactional
    public EInvoiceResponse cancelInvoice(Long id, EInvoiceCancelRequest request, Long currentUserId) {
        EInvoice einvoice = einvoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn điện tử #" + id));

        if (DocumentStatus.CANCELED.name().equals(einvoice.getStatus())) {
            throw new BusinessException("Hóa đơn này đã được hủy trước đó.");
        }

        EInvoiceProvider provider = providerFactory.getProvider(einvoice.getProvider());
        EInvoiceProviderResult result = provider.cancelInvoice(
                einvoice.getInvoiceSeries(),
                einvoice.getInvoiceNumber(),
                einvoice.getTransactionUuid(),
                request.getReason()
        );

        if (!result.isSuccess()) {
            throw new BusinessException("Hủy hóa đơn trên hệ thống nhà cung cấp thất bại: " + result.getErrorMessage());
        }

        einvoice.setStatus(DocumentStatus.CANCELED.name());
        einvoice.setCqtStatus(DocumentStatus.CANCELED.name());
        einvoice.setCancelReason(request.getReason());
        einvoice.setCanceledAt(LocalDateTime.now());
        einvoice.setCanceledBy(currentUserId != null ? currentUserId : 1L);

        EInvoice saved = einvoiceRepository.save(einvoice);

        auditLogService.logEvent(
                "System",
                "CANCEL_EINVOICE",
                "E_INVOICE",
                saved.getId(),
                "SUCCESS",
                String.format("Hủy HĐĐT số %s - Lý do: %s", saved.getInvoiceNumber(), request.getReason()),
                "127.0.0.1",
                null
        );

        return toResponse(saved);
    }

    // ─── Replace E-Invoice (Điều 19 NĐ 123/2020/NĐ-CP) ───────────────────────────
    @Transactional
    public EInvoiceResponse replaceInvoice(Long id, EInvoiceReplaceRequest request, Long currentUserId) {
        EInvoice original = einvoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn điện tử #" + id));

        ensureCanMutate(original);

        EInvoiceProvider provider = providerFactory.getProvider(original.getProvider());

        String buyerName = request.getBuyerName() != null ? request.getBuyerName() : original.getBuyerName();
        String buyerLegalName = request.getBuyerLegalName() != null ? request.getBuyerLegalName() : original.getBuyerLegalName();
        String buyerTaxCode = request.getBuyerTaxCode() != null ? request.getBuyerTaxCode() : original.getBuyerTaxCode();
        String buyerAddress = request.getBuyerAddress() != null ? request.getBuyerAddress() : original.getBuyerAddress();
        String buyerPhone = request.getBuyerPhone() != null ? request.getBuyerPhone() : original.getBuyerPhone();
        String buyerEmail = request.getBuyerEmail() != null ? request.getBuyerEmail() : original.getBuyerEmail();

        String txUuid = "RPL-" + original.getInvoiceNumber() + "-" + UUID.randomUUID().toString().substring(0, 8);

        EInvoiceProviderData providerData = EInvoiceProviderData.builder()
                .transactionUuid(txUuid)
                .invoiceType(original.getInvoiceType())
                .templateCode(original.getTemplateCode())
                .invoiceSeries(original.getInvoiceSeries())
                .invoiceDate(LocalDate.now())
                .paymentMethod(original.getPaymentMethod())
                .currencyCode(original.getCurrencyCode())
                .exchangeRate(original.getExchangeRate())
                .sellerTaxCode("0100109106")
                .sellerLegalName("CÔNG TY TNHH CÔNG NGHỆ DUY LONG")
                .sellerAddress("Hà Nội, Việt Nam")
                .buyerName(buyerName)
                .buyerLegalName(buyerLegalName)
                .buyerTaxCode(buyerTaxCode)
                .buyerAddress(buyerAddress)
                .buyerPhone(buyerPhone)
                .buyerEmail(buyerEmail)
                .subTotalAmount(original.getSubTotalAmount())
                .vatAmount(original.getVatAmount())
                .totalAmount(original.getTotalAmount())
                .totalAmountInWords(original.getTotalAmountInWords())
                .build();

        EInvoiceProviderResult result = provider.replaceInvoice(providerData, original.getInvoiceSeries(), original.getInvoiceNumber(), original.getTransactionUuid());
        if (!result.isSuccess()) {
            throw new BusinessException("Phát hành hóa đơn thay thế thất bại: " + result.getErrorMessage());
        }

        EInvoice replacement = new EInvoice();
        replacement.setSalesOrderId(original.getSalesOrderId());
        replacement.setInventoryDocumentId(original.getInventoryDocumentId());
        replacement.setPartnerId(original.getPartnerId());
        replacement.setInvoiceType(original.getInvoiceType());
        replacement.setTemplateCode(result.getTemplateCode() != null ? result.getTemplateCode() : original.getTemplateCode());
        replacement.setInvoiceSeries(result.getInvoiceSeries());
        replacement.setInvoiceNumber(result.getInvoiceNumber());
        replacement.setInvoiceDate(LocalDate.now());
        replacement.setIssuedAt(result.getIssuedAt() != null ? result.getIssuedAt() : LocalDateTime.now());
        replacement.setStatus("ISSUED");
        replacement.setBuyerName(buyerName);
        replacement.setBuyerLegalName(buyerLegalName);
        replacement.setBuyerTaxCode(buyerTaxCode);
        replacement.setBuyerAddress(buyerAddress);
        replacement.setBuyerPhone(buyerPhone);
        replacement.setBuyerEmail(buyerEmail);
        replacement.setCurrencyCode(original.getCurrencyCode());
        replacement.setExchangeRate(original.getExchangeRate());
        replacement.setPaymentMethod(original.getPaymentMethod());
        replacement.setSubTotalAmount(original.getSubTotalAmount());
        replacement.setVatAmount(original.getVatAmount());
        replacement.setTotalAmount(original.getTotalAmount());
        replacement.setTotalAmountInWords(original.getTotalAmountInWords());
        replacement.setCqtCode(result.getCqtCode());
        replacement.setCqtStatus(result.getCqtStatus() != null ? result.getCqtStatus() : "VALID");
        replacement.setTransactionUuid(txUuid);
        replacement.setProvider(provider.getProviderName());
        replacement.setViewUrl(result.getViewUrl());
        replacement.setPdfUrl(result.getPdfUrl());
        replacement.setRawRequest(result.getRawRequest());
        replacement.setRawResponse(result.getRawResponse());
        replacement.setOriginalInvoiceId(original.getId());
        replacement.setCreatedBy(currentUserId != null ? currentUserId : 1L);

        EInvoice saved = einvoiceRepository.save(replacement);

        original.setStatus("REPLACED");
        einvoiceRepository.save(original);

        auditLogService.logEvent(
                "System",
                "REPLACE_EINVOICE",
                "E_INVOICE",
                saved.getId(),
                "SUCCESS",
                String.format("Thay thế HĐĐT số %s (Ký hiệu %s) bằng HĐ số %s - Lý do: %s",
                        original.getInvoiceNumber(), original.getInvoiceSeries(), saved.getInvoiceNumber(), request.getReason()),
                "127.0.0.1",
                null
        );

        return toResponse(saved);
    }

    // ─── Adjust E-Invoice (Điều 19 NĐ 123/2020/NĐ-CP) ────────────────────────────
    @Transactional
    public EInvoiceResponse adjustInvoice(Long id, EInvoiceAdjustRequest request, Long currentUserId) {
        EInvoice original = einvoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn điện tử #" + id));

        ensureCanMutate(original);

        String adjustmentType = request.getAdjustmentType();
        boolean isAmountAdjustment = "INCREASE".equals(adjustmentType) || "DECREASE".equals(adjustmentType);
        if (!"INFO".equals(adjustmentType) && !isAmountAdjustment) {
            throw new BusinessException("Loại điều chỉnh không hợp lệ. Chỉ chấp nhận INFO, INCREASE hoặc DECREASE.");
        }

        EInvoiceProvider provider = providerFactory.getProvider(original.getProvider());

        String buyerName = "INFO".equals(adjustmentType) && request.getBuyerName() != null ? request.getBuyerName() : original.getBuyerName();
        String buyerLegalName = "INFO".equals(adjustmentType) && request.getBuyerLegalName() != null ? request.getBuyerLegalName() : original.getBuyerLegalName();
        String buyerTaxCode = "INFO".equals(adjustmentType) && request.getBuyerTaxCode() != null ? request.getBuyerTaxCode() : original.getBuyerTaxCode();
        String buyerAddress = "INFO".equals(adjustmentType) && request.getBuyerAddress() != null ? request.getBuyerAddress() : original.getBuyerAddress();
        String buyerPhone = "INFO".equals(adjustmentType) && request.getBuyerPhone() != null ? request.getBuyerPhone() : original.getBuyerPhone();
        String buyerEmail = "INFO".equals(adjustmentType) && request.getBuyerEmail() != null ? request.getBuyerEmail() : original.getBuyerEmail();

        BigDecimal subTotalAmount;
        BigDecimal vatAmount;
        BigDecimal totalAmount;
        if (isAmountAdjustment) {
            BigDecimal deltaSubTotal = request.getAdjustSubTotalAmount() != null ? request.getAdjustSubTotalAmount() : BigDecimal.ZERO;
            BigDecimal deltaVat = request.getAdjustVatAmount() != null ? request.getAdjustVatAmount() : BigDecimal.ZERO;
            if (deltaSubTotal.signum() < 0 || deltaVat.signum() < 0) {
                throw new BusinessException("Giá trị điều chỉnh phải là số dương, chiều tăng/giảm được xác định theo loại điều chỉnh.");
            }
            int sign = "DECREASE".equals(adjustmentType) ? -1 : 1;
            subTotalAmount = deltaSubTotal.multiply(BigDecimal.valueOf(sign));
            vatAmount = deltaVat.multiply(BigDecimal.valueOf(sign));
            totalAmount = subTotalAmount.add(vatAmount);
        } else {
            subTotalAmount = original.getSubTotalAmount();
            vatAmount = original.getVatAmount();
            totalAmount = original.getTotalAmount();
        }
        String amountInWords = isAmountAdjustment ? convertMoneyToWords(totalAmount.abs()) : original.getTotalAmountInWords();

        String txUuid = "ADJ-" + original.getInvoiceNumber() + "-" + UUID.randomUUID().toString().substring(0, 8);

        EInvoiceProviderData providerData = EInvoiceProviderData.builder()
                .transactionUuid(txUuid)
                .invoiceType(original.getInvoiceType())
                .templateCode(original.getTemplateCode())
                .invoiceSeries(original.getInvoiceSeries())
                .invoiceDate(LocalDate.now())
                .paymentMethod(original.getPaymentMethod())
                .currencyCode(original.getCurrencyCode())
                .exchangeRate(original.getExchangeRate())
                .sellerTaxCode("0100109106")
                .sellerLegalName("CÔNG TY TNHH CÔNG NGHỆ DUY LONG")
                .sellerAddress("Hà Nội, Việt Nam")
                .buyerName(buyerName)
                .buyerLegalName(buyerLegalName)
                .buyerTaxCode(buyerTaxCode)
                .buyerAddress(buyerAddress)
                .buyerPhone(buyerPhone)
                .buyerEmail(buyerEmail)
                .subTotalAmount(subTotalAmount)
                .vatAmount(vatAmount)
                .totalAmount(totalAmount)
                .totalAmountInWords(amountInWords)
                .build();

        EInvoiceProviderResult result = provider.adjustInvoice(providerData, original.getInvoiceSeries(), original.getInvoiceNumber(), original.getTransactionUuid(), adjustmentType);
        if (!result.isSuccess()) {
            throw new BusinessException("Phát hành hóa đơn điều chỉnh thất bại: " + result.getErrorMessage());
        }

        EInvoice adjustment = new EInvoice();
        adjustment.setSalesOrderId(original.getSalesOrderId());
        adjustment.setInventoryDocumentId(original.getInventoryDocumentId());
        adjustment.setPartnerId(original.getPartnerId());
        adjustment.setInvoiceType(original.getInvoiceType());
        adjustment.setTemplateCode(result.getTemplateCode() != null ? result.getTemplateCode() : original.getTemplateCode());
        adjustment.setInvoiceSeries(result.getInvoiceSeries());
        adjustment.setInvoiceNumber(result.getInvoiceNumber());
        adjustment.setInvoiceDate(LocalDate.now());
        adjustment.setIssuedAt(result.getIssuedAt() != null ? result.getIssuedAt() : LocalDateTime.now());
        adjustment.setStatus("ISSUED");
        adjustment.setBuyerName(buyerName);
        adjustment.setBuyerLegalName(buyerLegalName);
        adjustment.setBuyerTaxCode(buyerTaxCode);
        adjustment.setBuyerAddress(buyerAddress);
        adjustment.setBuyerPhone(buyerPhone);
        adjustment.setBuyerEmail(buyerEmail);
        adjustment.setCurrencyCode(original.getCurrencyCode());
        adjustment.setExchangeRate(original.getExchangeRate());
        adjustment.setPaymentMethod(original.getPaymentMethod());
        adjustment.setSubTotalAmount(subTotalAmount);
        adjustment.setVatAmount(vatAmount);
        adjustment.setTotalAmount(totalAmount);
        adjustment.setTotalAmountInWords(amountInWords);
        adjustment.setCqtCode(result.getCqtCode());
        adjustment.setCqtStatus(result.getCqtStatus() != null ? result.getCqtStatus() : "VALID");
        adjustment.setTransactionUuid(txUuid);
        adjustment.setProvider(provider.getProviderName());
        adjustment.setViewUrl(result.getViewUrl());
        adjustment.setPdfUrl(result.getPdfUrl());
        adjustment.setRawRequest(result.getRawRequest());
        adjustment.setRawResponse(result.getRawResponse());
        adjustment.setOriginalInvoiceId(original.getId());
        adjustment.setAdjustmentType(adjustmentType);
        adjustment.setCreatedBy(currentUserId != null ? currentUserId : 1L);

        EInvoice saved = einvoiceRepository.save(adjustment);

        original.setStatus("ADJUSTED");
        einvoiceRepository.save(original);

        auditLogService.logEvent(
                "System",
                "ADJUST_EINVOICE",
                "E_INVOICE",
                saved.getId(),
                "SUCCESS",
                String.format("Điều chỉnh (%s) HĐĐT số %s (Ký hiệu %s) bằng HĐ số %s - Lý do: %s",
                        adjustmentType, original.getInvoiceNumber(), original.getInvoiceSeries(), saved.getInvoiceNumber(), request.getReason()),
                "127.0.0.1",
                null
        );

        return toResponse(saved);
    }

    private void ensureCanMutate(EInvoice invoice) {
        if (!"ISSUED".equals(invoice.getStatus())) {
            throw new BusinessException(String.format(
                    "Hóa đơn số %s đang ở trạng thái %s, không thể thay thế/điều chỉnh. Chỉ có thể thao tác trên hóa đơn đã phát hành (ISSUED) và chưa bị hủy/thay thế/điều chỉnh trước đó.",
                    invoice.getInvoiceNumber(), invoice.getStatus()
            ));
        }
    }

    // ─── Mapping Entity -> Response DTO ─────────────────────────────────────────
    private EInvoiceResponse toResponse(EInvoice e) {
        if (e == null) return null;

        return EInvoiceResponse.builder()
                .id(e.getId())
                .salesOrderId(e.getSalesOrderId())
                .soCode(e.getSalesOrder() != null ? e.getSalesOrder().getSoCode() : null)
                .inventoryDocumentId(e.getInventoryDocumentId())
                .exportDocCode(e.getInventoryDocument() != null ? e.getInventoryDocument().getDocCode() : null)
                .partnerId(e.getPartnerId())
                .partnerCode(e.getPartner() != null ? e.getPartner().getCode() : null)
                .partnerName(e.getPartner() != null ? e.getPartner().getName() : null)
                .invoiceType(e.getInvoiceType())
                .templateCode(e.getTemplateCode())
                .invoiceSeries(e.getInvoiceSeries())
                .invoiceNumber(e.getInvoiceNumber())
                .invoiceDate(e.getInvoiceDate())
                .issuedAt(e.getIssuedAt())
                .status(e.getStatus())
                .buyerName(e.getBuyerName())
                .buyerLegalName(e.getBuyerLegalName())
                .buyerTaxCode(e.getBuyerTaxCode())
                .buyerAddress(e.getBuyerAddress())
                .buyerPhone(e.getBuyerPhone())
                .buyerEmail(e.getBuyerEmail())
                .currencyCode(e.getCurrencyCode())
                .exchangeRate(e.getExchangeRate())
                .paymentMethod(e.getPaymentMethod())
                .subTotalAmount(e.getSubTotalAmount())
                .vatAmount(e.getVatAmount())
                .totalAmount(e.getTotalAmount())
                .totalAmountInWords(e.getTotalAmountInWords())
                .cqtCode(e.getCqtCode())
                .cqtStatus(e.getCqtStatus())
                .transactionUuid(e.getTransactionUuid())
                .provider(e.getProvider())
                .viewUrl(e.getViewUrl())
                .pdfUrl(e.getPdfUrl())
                .cancelReason(e.getCancelReason())
                .canceledAt(e.getCanceledAt())
                .canceledBy(e.getCanceledBy())
                .canceledByName(e.getCanceledByUser() != null ? e.getCanceledByUser().getFullName() : (e.getCanceledBy() != null ? "Quản trị viên" : null))
                .originalInvoiceId(e.getOriginalInvoiceId())
                .originalInvoiceNumber(e.getOriginalInvoice() != null ? e.getOriginalInvoice().getInvoiceNumber() : null)
                .originalInvoiceSeries(e.getOriginalInvoice() != null ? e.getOriginalInvoice().getInvoiceSeries() : null)
                .adjustmentType(e.getAdjustmentType())
                .createdBy(e.getCreatedBy())
                .createdByName(e.getCreatedByUser() != null ? e.getCreatedByUser().getFullName() : null)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    // ─── Tiện ích đọc số tiền thành chữ Tiếng Việt ───────────────────────────────
    public static String convertMoneyToWords(BigDecimal totalAmount) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return "Không đồng chẵn.";
        }
        long amount = totalAmount.longValue();
        if (amount < 0) return "Số tiền âm.";

        String[] ones = {"", " một", " hai", " ba", " bốn", " năm", " sáu", " bảy", " tám", " chín"};
        String[] units = {"", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"};

        StringBuilder result = new StringBuilder();
        int unitIndex = 0;

        while (amount > 0) {
            int chunk = (int) (amount % 1000);
            if (chunk > 0) {
                int h = chunk / 100;
                int t = (chunk % 100) / 10;
                int o = chunk % 10;

                StringBuilder chunkStr = new StringBuilder();
                if (h > 0 || (amount > 999 && (t > 0 || o > 0))) {
                    chunkStr.append(ones[h]).append(" trăm");
                }
                if (t > 1) {
                    chunkStr.append(" mươi");
                    if (o == 1) chunkStr.append(" mốt");
                    else if (o == 5) chunkStr.append(" lăm");
                    else chunkStr.append(ones[o]);
                } else if (t == 1) {
                    chunkStr.append(" mười");
                    if (o == 5) chunkStr.append(" lăm");
                    else chunkStr.append(ones[o]);
                } else if (t == 0 && o > 0) {
                    if (h > 0 || amount > 999) chunkStr.append(" lẻ");
                    chunkStr.append(ones[o]);
                }

                chunkStr.append(units[unitIndex]);
                result.insert(0, chunkStr);
            }
            amount /= 1000;
            unitIndex++;
        }

        String str = result.toString().trim();
        if (!str.isEmpty()) {
            str = Character.toUpperCase(str.charAt(0)) + str.substring(1) + " đồng chẵn.";
        }
        return str;
    }
}
