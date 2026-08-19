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
                .filter(i -> !"CANCELED".equals(i.getStatus()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EInvoiceResponse getInvoiceBySalesOrderId(Long salesOrderId) {
        return einvoiceRepository.findBySalesOrderId(salesOrderId)
                .filter(i -> !"CANCELED".equals(i.getStatus()))
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public EInvoiceResponse getInvoiceByInventoryDocumentId(Long inventoryDocumentId) {
        return einvoiceRepository.findByInventoryDocumentId(inventoryDocumentId)
                .filter(i -> !"CANCELED".equals(i.getStatus()))
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

            if (!"POSTED".equalsIgnoreCase(foundDoc.getStatus())) {
                throw new BusinessException("Chỉ có thể xuất hóa đơn điện tử cho phiếu xuất kho đã ghi sổ (hoàn tất xuất kho).");
            }

            // Kiểm tra xem phiếu xuất kho này đã xuất HĐĐT chưa
            final String expDocCode = foundDoc.getDocCode();
            einvoiceRepository.findByInventoryDocumentId(exportDocId).ifPresent(existing -> {
                if (!"CANCELED".equals(existing.getStatus())) {
                    throw new BusinessException(String.format(
                            "Phiếu xuất kho %s đã được xuất hóa đơn số %s (Ký hiệu: %s)",
                            expDocCode, existing.getInvoiceNumber(), existing.getInvoiceSeries()
                    ));
                }
            });

            exportDoc = foundDoc;
            soId = (rawSoId != null) ? rawSoId : foundDoc.getSalesOrderId();
        } else {
            exportDoc = null;
            soId = rawSoId;
        }

        final SalesOrder so = (soId != null) ? salesOrderRepository.findById(soId).orElse(null) : null;

        // Nếu xuất HĐ toàn bộ đơn hàng (không theo phiếu xuất riêng)
        if (exportDoc == null && so != null) {
            final String soCode = so.getSoCode();
            einvoiceRepository.findBySalesOrderId(so.getId()).ifPresent(existing -> {
                if (existing.getInventoryDocumentId() == null && !"CANCELED".equals(existing.getStatus())) {
                    throw new BusinessException(String.format(
                            "Đơn hàng %s đã được xuất hóa đơn số %s (Ký hiệu: %s)",
                            soCode, existing.getInvoiceNumber(), existing.getInvoiceSeries()
                    ));
                }
            });
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
                        if (variant.getProduct() != null) {
                            itemName = variant.getProduct().getProductName();
                            if (variant.getProduct().getUnit() != null) {
                                unitName = variant.getProduct().getUnit().getName();
                            }
                        } else if (variant.getVariantName() != null) {
                            itemName = variant.getVariantName();
                        }
                    }
                }

                String lineNote = expLine.getSerialNumbersText() != null && !expLine.getSerialNumbersText().isBlank()
                        ? "Serial: " + expLine.getSerialNumbersText() : null;

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
                    sku = sol.getVariant().getSku() != null ? sol.getVariant().getSku() : sku;
                    if (sol.getVariant().getProduct() != null) {
                        itemName = sol.getVariant().getProduct().getProductName();
                        if (sol.getVariant().getProduct().getUnit() != null) {
                            unitName = sol.getVariant().getProduct().getUnit().getName();
                        }
                    } else if (sol.getVariant().getVariantName() != null) {
                        itemName = sol.getVariant().getVariantName();
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
        EInvoice einvoice = EInvoice.builder()
                .salesOrderId(so != null ? so.getId() : null)
                .inventoryDocumentId(exportDoc != null ? exportDoc.getId() : null)
                .partnerId(partner.getId())
                .invoiceType(providerData.getInvoiceType())
                .templateCode(result.getTemplateCode())
                .invoiceSeries(result.getInvoiceSeries())
                .invoiceNumber(result.getInvoiceNumber())
                .invoiceDate(providerData.getInvoiceDate())
                .issuedAt(result.getIssuedAt() != null ? result.getIssuedAt() : LocalDateTime.now())
                .status("ISSUED")
                .buyerName(buyerName)
                .buyerLegalName(buyerLegalName)
                .buyerTaxCode(buyerTaxCode)
                .buyerAddress(buyerAddress)
                .buyerPhone(buyerPhone)
                .buyerEmail(buyerEmail)
                .currencyCode("VND")
                .exchangeRate(BigDecimal.ONE)
                .paymentMethod(providerData.getPaymentMethod())
                .subTotalAmount(calculatedSubTotal)
                .vatAmount(calculatedVat)
                .totalAmount(grandTotal)
                .totalAmountInWords(amountInWords)
                .cqtCode(result.getCqtCode())
                .cqtStatus(result.getCqtStatus() != null ? result.getCqtStatus() : "VALID")
                .transactionUuid(txUuid)
                .provider(provider.getProviderName())
                .viewUrl(result.getViewUrl())
                .pdfUrl(result.getPdfUrl())
                .pdfData(result.getPdfBase64())
                .xmlData(result.getXmlData())
                .rawRequest(result.getRawRequest())
                .rawResponse(result.getRawResponse())
                .createdBy(currentUserId != null ? currentUserId : 1L)
                .build();

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

        if ("CANCELED".equals(einvoice.getStatus())) {
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

        einvoice.setStatus("CANCELED");
        einvoice.setCqtStatus("CANCELED");
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
