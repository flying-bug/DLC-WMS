package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PurchaseOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;

    // =========================================================
    // QUERY
    // =========================================================

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> getPurchaseOrders(
            String keyword, String status, Long partnerId,
            LocalDate fromDate, LocalDate toDate) {
        return purchaseOrderRepository
                .findAllWithFilters(keyword, status, partnerId, fromDate, toDate)
                .stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrderById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));
        return toDetailResponse(po);
    }

    public String generateNextPoCode() {
        String prefix = "PO";
        List<String> existing = purchaseOrderRepository.findCodesByPrefix(prefix + "%");
        long max = 0;
        for (String code : existing) {
            if (code != null && code.length() > prefix.length()) {
                try {
                    long val = Long.parseLong(code.substring(prefix.length()));
                    if (val > max) max = val;
                } catch (NumberFormatException ignored) {}
            }
        }
        return String.format("%s%04d", prefix, max + 1);
    }

    // =========================================================
    // CREATE
    // =========================================================

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request, String actor) {
        // Validate nhà cung cấp
        Partner supplier = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Nhà cung cấp không tồn tại"));
        if (!Boolean.TRUE.equals(supplier.getIsSupplier())) {
            throw new BusinessException(SystemMessage.PO_ERR_006.getMessage());
        }

        if (request.getPaymentDueDate() != null && request.getPaymentDueDate().isBefore(request.getPoDate())) {
            throw new BusinessException(SystemMessage.PO_ERR_003.getMessage());
        }

        // Tự sinh mã nếu chưa có
        String poCode = (request.getPoCode() != null && !request.getPoCode().isBlank())
                ? request.getPoCode() : generateNextPoCode();

        if (purchaseOrderRepository.existsByPoCode(poCode)) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_005.getMessage(), poCode));
        }

        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));

        // Tính toán lines
        BigDecimal subTotalAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        List<PurchaseOrderLine> lines = new ArrayList<>();
        for (PurchaseOrderRequest.PurchaseOrderLineRequest lr : request.getLines()) {
            BigDecimal lineAmount = lr.getUnitPrice().multiply(lr.getQuantity());
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            BigDecimal vatAmount = lineAmount.multiply(vatRate)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            subTotalAmount = subTotalAmount.add(lineAmount);
            taxAmount = taxAmount.add(vatAmount);

            lines.add(PurchaseOrderLine.builder()
                    .purchaseOrderId(0L) // sẽ set sau khi save
                    .variantId(lr.getVariantId())
                    .quantity(lr.getQuantity())
                    .unitPrice(lr.getUnitPrice())
                    .vatRate(vatRate)
                    .vatAmount(vatAmount)
                    .lineAmount(lineAmount)
                    .note(lr.getNote())
                    .build());
        }

        BigDecimal totalAmount = subTotalAmount.add(taxAmount);

        PurchaseOrder po = PurchaseOrder.builder()
                .partnerId(request.getPartnerId())
                .poCode(poCode)
                .poDate(request.getPoDate())
                .status("DRAFT")
                .subTotalAmount(subTotalAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .paymentStatus("UNPAID")
                .paymentDueDate(request.getPaymentDueDate())
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .note(request.getNote())
                .createdBy(actorUser.getId())
                .build();

        po.setLines(new ArrayList<>());
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        final Long poId = saved.getId();
        lines.forEach(l -> l.setPurchaseOrderId(poId));
        saved.getLines().addAll(lines);
        purchaseOrderRepository.save(saved);

        log.info("Tạo đơn mua hàng {} bởi {}", saved.getPoCode(), actor);
        return toSummaryResponse(saved);
    }

    // =========================================================
    // UPDATE (chỉ khi DRAFT)
    // =========================================================

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(Long id, PurchaseOrderRequest request, String actor) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));

        if (!"DRAFT".equals(po.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_004.getMessage(), po.getStatus()));
        }

        if (request.getPaymentDueDate() != null && request.getPaymentDueDate().isBefore(request.getPoDate())) {
            throw new BusinessException(SystemMessage.PO_ERR_003.getMessage());
        }

        po.setPartnerId(request.getPartnerId());
        po.setPoDate(request.getPoDate());
        po.setPaymentDueDate(request.getPaymentDueDate());
        po.setExpectedDeliveryDate(request.getExpectedDeliveryDate());
        po.setNote(request.getNote());

        po.getLines().clear();
        BigDecimal subTotalAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        for (PurchaseOrderRequest.PurchaseOrderLineRequest lr : request.getLines()) {
            BigDecimal lineAmount = lr.getUnitPrice().multiply(lr.getQuantity());
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            BigDecimal vatAmount = lineAmount.multiply(vatRate)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            subTotalAmount = subTotalAmount.add(lineAmount);
            taxAmount = taxAmount.add(vatAmount);

            po.getLines().add(PurchaseOrderLine.builder()
                    .purchaseOrderId(po.getId())
                    .variantId(lr.getVariantId())
                    .quantity(lr.getQuantity())
                    .unitPrice(lr.getUnitPrice())
                    .vatRate(vatRate)
                    .vatAmount(vatAmount)
                    .lineAmount(lineAmount)
                    .note(lr.getNote())
                    .build());
        }

        po.setSubTotalAmount(subTotalAmount);
        po.setTaxAmount(taxAmount);
        po.setTotalAmount(subTotalAmount.add(taxAmount));

        PurchaseOrder updated = purchaseOrderRepository.save(po);
        log.info("Cập nhật đơn mua hàng {} bởi {}", updated.getPoCode(), actor);
        return toSummaryResponse(updated);
    }

    // =========================================================
    // APPROVE — ghi nhận công nợ phải trả
    // =========================================================

    @Transactional
    public PurchaseOrderResponse approvePurchaseOrder(Long id, String actor) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));

        if (!"DRAFT".equals(po.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_002.getMessage(), po.getStatus()));
        }

        po.setStatus("APPROVED");
        PurchaseOrder approved = purchaseOrderRepository.save(po);
        log.info("Duyệt đơn mua hàng {} bởi {}", approved.getPoCode(), actor);



        return toDetailResponse(approved);
    }

    // =========================================================
    // CANCEL — rollback công nợ nếu đã APPROVED
    // =========================================================

    @Transactional
    public PurchaseOrderResponse cancelPurchaseOrder(Long id, String actor) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));

        if ("POSTED".equals(po.getStatus()) || "CANCELLED".equals(po.getStatus()) || "APPROVED".equals(po.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_001.getMessage(), po.getStatus()));
        }

        po.setStatus("CANCELLED");
        PurchaseOrder cancelled = purchaseOrderRepository.save(po);
        log.info("Hủy đơn mua hàng {} bởi {}", cancelled.getPoCode(), actor);

        return toSummaryResponse(cancelled);
    }

    // =========================================================
    // MAPPING
    // =========================================================

    private PurchaseOrderResponse toSummaryResponse(PurchaseOrder po) {
        return PurchaseOrderResponse.builder()
                .id(po.getId())
                .poCode(po.getPoCode())
                .poDate(po.getPoDate())
                .status(po.getStatus())
                .partnerId(po.getPartnerId())
                .partnerCode(po.getPartner() != null ? po.getPartner().getCode() : null)
                .partnerName(po.getPartner() != null ? po.getPartner().getName() : null)
                .partnerPhone(po.getPartner() != null ? po.getPartner().getPhone() : null)
                .subTotalAmount(po.getSubTotalAmount())
                .taxAmount(po.getTaxAmount())
                .totalAmount(po.getTotalAmount())
                .paidAmount(po.getPaidAmount())
                .paymentStatus(po.getPaymentStatus())
                .paymentDueDate(po.getPaymentDueDate())
                .expectedDeliveryDate(po.getExpectedDeliveryDate())
                .note(po.getNote())
                .createdBy(po.getCreatedBy())
                .createdByName(po.getCreatedByUser() != null ? po.getCreatedByUser().getFullName() : null)
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .build();
    }

    private PurchaseOrderResponse toDetailResponse(PurchaseOrder po) {
        List<PurchaseOrderResponse.PurchaseOrderLineResponse> lineResponses = po.getLines().stream()
                .map(line -> {
                    ProductVariant variant = line.getVariant();
                    String variantName = variant != null ? variant.getVariantName() : null;
                    String sku = variant != null ? variant.getSku() : null;
                    String productCode = (variant != null && variant.getProduct() != null)
                            ? variant.getProduct().getProductCode() : null;
                    String unitName = (variant != null && variant.getProduct() != null
                            && variant.getProduct().getUnit() != null)
                            ? variant.getProduct().getUnit().getName() : null;

                    BigDecimal imported = inventoryDocumentLineRepository
                            .sumImportedQuantityByPurchaseOrderIdAndVariantId(po.getId(), line.getVariantId());
                    if (imported == null) imported = BigDecimal.ZERO;
                    BigDecimal remaining = line.getQuantity().subtract(imported);
                    if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

                    return PurchaseOrderResponse.PurchaseOrderLineResponse.builder()
                            .id(line.getId())
                            .variantId(line.getVariantId())
                            .productName(variant != null && variant.getProduct() != null
                                    ? variant.getProduct().getProductName() : null)
                            .sku(sku)
                            .variantName(variantName)
                            .productCode(productCode)
                            .unitName(unitName)
                            .quantity(line.getQuantity())
                            .unitPrice(line.getUnitPrice())
                            .vatRate(line.getVatRate())
                            .vatAmount(line.getVatAmount())
                            .lineAmount(line.getLineAmount())
                            .note(line.getNote())
                            .importedQuantity(imported)
                            .remainingQuantity(remaining)
                            .build();
                })
                .collect(Collectors.toList());

        boolean isFullyImported = !lineResponses.isEmpty() && lineResponses.stream()
                .allMatch(l -> l.getRemainingQuantity().compareTo(BigDecimal.ZERO) <= 0);

        PurchaseOrderResponse response = toSummaryResponse(po);
        response.setIsFullyImported(isFullyImported);
        response.setLines(lineResponses);
        return response;
    }
}
