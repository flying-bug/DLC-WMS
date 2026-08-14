package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.SalesOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final StockReservationRepository stockReservationRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final PartnerRepository partnerRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PartnerLedgerService partnerLedgerService;
    private final EmailService emailService;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final PaymentService paymentService;
    private final SystemSettingsService systemSettingsService;

    // =========================================================
    // QUERY
    // =========================================================

    @Transactional(readOnly = true)
    public List<SalesOrderResponse> getSalesOrders(
            String keyword, String status, String reservationStatus, String exportDocumentStatus, Long partnerId,
            Long warehouseId, LocalDate fromDate, LocalDate toDate) {
        return salesOrderRepository.findAllWithFilters(
                        keyword,
                        status,
                        reservationStatus,
                        exportDocumentStatus,
                        partnerId,
                        warehouseId,
                        fromDate,
                        toDate
                )
                .stream().map(this::toSummaryResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SalesOrderResponse getSalesOrderById(Long id) {
        SalesOrder so = salesOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng ID: " + id));
        List<StockReservation> reservations = stockReservationRepository.findBySalesOrderId(id);
        return toDetailResponse(so, reservations);
    }

    public String generateNextSoCode() {
        String prefix = "SO";
        List<String> existing = salesOrderRepository.findCodesByPrefix(prefix + "%");
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
    public SalesOrderResponse createSalesOrder(SalesOrderRequest request, String actor) {
        requireActiveCustomer(request.getPartnerId());
        // Validate partner và warehouse tồn tại
        partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Khách hàng không tồn tại"));
        warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new BusinessException("Kho không tồn tại"));

        if (request.getPaymentDueDate() != null) {
            if (request.getPaymentDueDate().isBefore(request.getSoDate())) {
                throw new BusinessException(SystemMessage.SO_ERR_008.getMessage());
            }
            if (request.getPaymentDueDate().isBefore(LocalDate.now())) {
                throw new BusinessException(SystemMessage.SO_ERR_007.getMessage());
            }
        }

        // Tự sinh mã nếu chưa có
        String soCode = (request.getSoCode() != null && !request.getSoCode().isBlank())
                ? request.getSoCode() : generateNextSoCode();

        if (salesOrderRepository.existsBySoCode(soCode)) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_005.getMessage(), soCode));
        }

        // Resolve createdBy từ username
        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));

        // Tạo lines và tính tiền
        BigDecimal subTotalAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;
        List<SalesOrderLine> lines = request.getLines().stream().map(lr -> {
            BigDecimal lineAmount = lr.getUnitPrice().multiply(lr.getQuantity());
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            BigDecimal vatAmount = lineAmount.multiply(vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            
            return SalesOrderLine.builder()
                    .salesOrderId(0L) // sẽ được set sau khi save
                    .variantId(lr.getVariantId())
                    .quantity(lr.getQuantity())
                    .unitPrice(lr.getUnitPrice())
                    .vatRate(vatRate)
                    .vatAmount(vatAmount)
                    .warrantyMonths(lr.getWarrantyMonths())
                    .lineAmount(lineAmount)
                    .note(lr.getNote())
                    .build();
        }).collect(Collectors.toList());

        for (SalesOrderLine l : lines) {
            subTotalAmount = subTotalAmount.add(l.getLineAmount());
            taxAmount = taxAmount.add(l.getVatAmount());
        }
        BigDecimal totalAmount = subTotalAmount.add(taxAmount);

        SalesOrder so = SalesOrder.builder()
                .partnerId(request.getPartnerId())
                .warehouseId(request.getWarehouseId())
                .soCode(soCode)
                .soDate(request.getSoDate())
                .status("DRAFT")
                .subTotalAmount(subTotalAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .paymentStatus("UNPAID")
                .paymentDueDate(request.getPaymentDueDate())
                .deliveryAddress(request.getDeliveryAddress())
                .note(request.getNote())
                .createdBy(actorUser.getId())
                .build();

        so.setLines(new java.util.ArrayList<>());
        SalesOrder saved = salesOrderRepository.save(so);

        // Gán ID cho các dòng và lưu lại
        lines.forEach(l -> l.setSalesOrderId(saved.getId()));
        saved.getLines().addAll(lines);
        salesOrderRepository.save(saved);

        log.info("Tạo đơn bán hàng {} bởi {}", saved.getSoCode(), actor);
        return toSummaryResponse(saved);
    }

    // =========================================================
    // UPDATE (chỉ khi DRAFT)
    // =========================================================

    @Transactional
    public SalesOrderResponse updateSalesOrder(Long id, SalesOrderRequest request, String actor) {
        SalesOrder so = salesOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng ID: " + id));

        if (!"DRAFT".equals(so.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.SO_ERR_009.getMessage(), so.getStatus()));
        }

        requireActiveCustomer(request.getPartnerId());

        if (request.getPaymentDueDate() != null) {
            if (request.getPaymentDueDate().isBefore(request.getSoDate())) {
                throw new BusinessException(SystemMessage.SO_ERR_008.getMessage());
            }
            if (request.getPaymentDueDate().isBefore(LocalDate.now())) {
                throw new BusinessException(SystemMessage.SO_ERR_007.getMessage());
            }
        }

        so.setPartnerId(request.getPartnerId());
        so.setWarehouseId(request.getWarehouseId());
        so.setSoDate(request.getSoDate());
        so.setPaymentDueDate(request.getPaymentDueDate());
        so.setDeliveryAddress(request.getDeliveryAddress());
        so.setNote(request.getNote());

        // Rebuild lines
        so.getLines().clear();
        BigDecimal subTotalAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;
        
        for (SalesOrderRequest.SalesOrderLineRequest lr : request.getLines()) {
            BigDecimal lineAmount = lr.getUnitPrice().multiply(lr.getQuantity());
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            BigDecimal vatAmount = lineAmount.multiply(vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            
            subTotalAmount = subTotalAmount.add(lineAmount);
            taxAmount = taxAmount.add(vatAmount);
            
            SalesOrderLine line = SalesOrderLine.builder()
                    .salesOrderId(so.getId())
                    .variantId(lr.getVariantId())
                    .quantity(lr.getQuantity())
                    .unitPrice(lr.getUnitPrice())
                    .vatRate(vatRate)
                    .vatAmount(vatAmount)
                    .warrantyMonths(lr.getWarrantyMonths())
                    .lineAmount(lineAmount)
                    .note(lr.getNote())
                    .build();
            so.getLines().add(line);
        }
        so.setSubTotalAmount(subTotalAmount);
        so.setTaxAmount(taxAmount);
        so.setTotalAmount(subTotalAmount.add(taxAmount));

        SalesOrder updated = salesOrderRepository.save(so);
        log.info("Cập nhật đơn bán hàng {} bởi {}", updated.getSoCode(), actor);
        return toSummaryResponse(updated);
    }

    // =========================================================
    // APPROVE — logic nghiệp vụ chính (tạo reservations)
    // =========================================================

    @Transactional
    public SalesOrderResponse approveSalesOrder(Long id, String actor) {
        SalesOrder so = salesOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng ID: " + id));

        if (!"DRAFT".equals(so.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.SO_ERR_006.getMessage(), so.getStatus()));
        }

        requireActiveCustomer(so.getPartnerId());

        int expiryHours = 24;
        try {
            expiryHours = Integer.parseInt(systemSettingsService.getSetting("sales.reservation.expiry_hours", "24"));
            if (expiryHours <= 0) expiryHours = 24;
        } catch (Exception e) {
            log.warn("Invalid expiry_hours setting, defaulting to 24", e);
        }
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(expiryHours);

        for (SalesOrderLine line : so.getLines()) {
            // Kiểm tra tồn kho khả dụng (on_hand - reserved)
            BigDecimal available = inventoryBalanceRepository
                    .sumAvailableQuantityByWarehouseAndVariant(so.getWarehouseId(), line.getVariantId(), "GOOD");

            if (available == null) available = BigDecimal.ZERO;

            // Xác định trạng thái reservation dựa trên số lượng khả dụng
            String resStatus = (available.compareTo(line.getQuantity()) < 0) ? "BACKORDERED" : "HOLDING";

            // Tạo reservation
            StockReservation reservation = StockReservation.builder()
                    .salesOrderId(so.getId())
                    .variantId(line.getVariantId())
                    .warehouseId(so.getWarehouseId())
                    .quantityReserved(line.getQuantity())
                    .status(resStatus)
                    .expiresAt(expiresAt)
                    .build();
            stockReservationRepository.save(reservation);

            // Tăng quantity_reserved trong INVENTORY_BALANCES
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariant(so.getWarehouseId(), line.getVariantId(), "GOOD")
                    .orElseGet(() -> {
                        InventoryBalance newBalance = InventoryBalance.builder()
                                .warehouseId(so.getWarehouseId())
                                .variantId(line.getVariantId())
                                .stockStatus("GOOD")
                                .quantityOnHand(BigDecimal.ZERO)
                                .quantityReserved(BigDecimal.ZERO)
                                .averageCost(BigDecimal.ZERO)
                                .updatedAt(LocalDateTime.now())
                                .build();
                        return inventoryBalanceRepository.save(newBalance);
                    });
            balance.setQuantityReserved(balance.getQuantityReserved().add(line.getQuantity()));
            inventoryBalanceRepository.save(balance);
        }

        so.setStatus("APPROVED");
        SalesOrder approved = salesOrderRepository.save(so);
        log.info("Duyệt đơn bán hàng {} bởi {}", approved.getSoCode(), actor);



        List<StockReservation> reservations = stockReservationRepository.findBySalesOrderId(id);
        return toDetailResponse(approved, reservations);
    }

    // =========================================================
    // CANCEL — release reservations
    // =========================================================

    @Transactional
    public SalesOrderResponse cancelSalesOrder(Long id, String actor) {
        SalesOrder so = salesOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng ID: " + id));

        if ("POSTED".equals(so.getStatus()) || "CANCELLED".equals(so.getStatus()) || "APPROVED".equals(so.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.SO_ERR_005.getMessage(), so.getStatus()));
        }

        // Release tất cả reservations HOLDING
        releaseReservations(so.getId(), so.getWarehouseId());

        so.setStatus("CANCELLED");
        SalesOrder cancelled = salesOrderRepository.save(so);
        log.info("Hủy đơn bán hàng {} bởi {}", cancelled.getSoCode(), actor);
        return toSummaryResponse(cancelled);
    }

    // =========================================================
    // INTERNAL HELPERS
    // =========================================================

    private Partner requireActiveCustomer(Long partnerId) {
        if (partnerId == null) {
            throw new BusinessException(SystemMessage.SO_ERR_004.getMessage());
        }

        Partner customer = partnerRepository.findByIdAndIsCustomerTrue(partnerId)
                .orElseThrow(() -> new BusinessException("Khách hàng không tồn tại"));
        if (!"APPROVED".equals(customer.getStatus())) {
            throw new BusinessException(SystemMessage.CHK_ERR_004.getMessage());
        }
        return customer;
    }

    /**
     * Release tất cả reservations HOLDING của một SO.
     * Gọi khi: hủy SO, hoặc scheduled job dọn expired reservations.
     */
    @Transactional
    public void releaseReservations(Long salesOrderId, Long warehouseId) {
        List<StockReservation> holdings = stockReservationRepository
                .findBySalesOrderIdAndStatus(salesOrderId, "HOLDING");

        for (StockReservation r : holdings) {
            // Giảm quantity_reserved trong INVENTORY_BALANCES
            inventoryBalanceRepository
                    .findByWarehouseAndVariant(warehouseId, r.getVariantId(), "GOOD")
                    .ifPresent(balance -> {
                        BigDecimal newReserved = balance.getQuantityReserved().subtract(r.getQuantityReserved());
                        balance.setQuantityReserved(newReserved.max(BigDecimal.ZERO));
                        inventoryBalanceRepository.save(balance);
                    });
            r.setStatus("RELEASED");
            stockReservationRepository.save(r);
        }
    }

    /**
     * Sau khi phiếu xuất kho EX_SO được POST, gọi method này để fulfill reservation.
     */
    @Transactional
    public void fulfillReservation(Long salesOrderId, Long variantId, Long warehouseId, BigDecimal quantityFulfilled, BigDecimal costAmountFulfilled) {
        stockReservationRepository
                .findBySalesOrderIdAndVariantIdAndWarehouseId(salesOrderId, variantId, warehouseId)
                .ifPresent(r -> {
                    // Giảm quantity_reserved trong INVENTORY_BALANCES
                    inventoryBalanceRepository
                            .findByWarehouseAndVariant(warehouseId, variantId, "GOOD")
                            .ifPresent(balance -> {
                                BigDecimal newReserved = balance.getQuantityReserved().subtract(quantityFulfilled);
                                balance.setQuantityReserved(newReserved.max(BigDecimal.ZERO));
                                inventoryBalanceRepository.save(balance);
                            });

                    // Cập nhật quantityReserved còn lại
                    BigDecimal remaining = r.getQuantityReserved().subtract(quantityFulfilled);
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                        r.setStatus("FULFILLED");
                        r.setQuantityReserved(BigDecimal.ZERO);
                    } else {
                        r.setQuantityReserved(remaining);
                    }
                    stockReservationRepository.save(r);
                });

        // Cập nhật giá vốn FIFO vào SalesOrderLine
        salesOrderRepository.findByIdWithDetails(salesOrderId).ifPresent(so -> {
            boolean isUpdated = false;
            for (SalesOrderLine line : so.getLines()) {
                if (line.getVariantId().equals(variantId)) {
                    BigDecimal currentCost = line.getCostAmount() != null ? line.getCostAmount() : BigDecimal.ZERO;
                    line.setCostAmount(currentCost.add(costAmountFulfilled != null ? costAmountFulfilled : BigDecimal.ZERO));
                    isUpdated = true;
                    break;
                }
            }
            if (isUpdated) {
                salesOrderRepository.save(so);
            }
        });

        // Kiểm tra nếu tất cả reservations đều FULFILLED → SO = POSTED
        List<StockReservation> all = stockReservationRepository.findBySalesOrderId(salesOrderId);
        boolean allFulfilled = all.stream().allMatch(r -> "FULFILLED".equals(r.getStatus()));
        if (allFulfilled) {
            salesOrderRepository.findById(salesOrderId).ifPresent(so -> {
                so.setStatus("POSTED");
                salesOrderRepository.save(so);
            });
        }
    }

    @Transactional
    public SalesOrderResponse recordPayment(Long id, BigDecimal amount, String actor) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng"));
        
        if ("CANCELLED".equals(so.getStatus())) {
            throw new BusinessException(SystemMessage.SO_ERR_003.getMessage());
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(SystemMessage.SO_ERR_002.getMessage());
        }

        BigDecimal currentPaidAmount = so.getPaidAmount() != null ? so.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal newPaidAmount = currentPaidAmount.add(amount);
        if (newPaidAmount.compareTo(so.getTotalAmount()) > 0) {
            throw new BusinessException(SystemMessage.SO_ERR_001.getMessage());
        }

        so.setPaidAmount(newPaidAmount);
        
        if (newPaidAmount.compareTo(so.getTotalAmount()) >= 0) {
            so.setPaymentStatus("PAID");
        } else if (newPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
            so.setPaymentStatus("PARTIAL");
        } else {
            so.setPaymentStatus("UNPAID");
        }

        salesOrderRepository.save(so);
        
        // Tự động tạo và ghi sổ phiếu thu
        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setPartnerId(so.getPartnerId());
        paymentRequest.setAmount(amount);
        paymentRequest.setPaymentMethod("CASH"); // Mặc định tiền mặt
        paymentRequest.setNote("Thanh toán cho đơn hàng " + so.getSoCode());
        paymentRequest.setStatus("POSTED"); // Ghi sổ luôn
        
        paymentService.createPaymentReceipt(paymentRequest);

        auditLogService.logEvent(
                actor,
                "RECORD_PAYMENT",
                "SalesOrder",
                so.getId(),
                "SUCCESS",
                "Ghi nhận thanh toán " + amount + " cho đơn hàng " + so.getSoCode(),
                null,
                null
        );

        return toDetailResponse(so, stockReservationRepository.findBySalesOrderId(so.getId()));
    }

    // =========================================================
    // MAPPING
    // =========================================================

    private SalesOrderResponse toSummaryResponse(SalesOrder so) {
        SalesOrderResponse r = SalesOrderResponse.builder()
                .id(so.getId())
                .soCode(so.getSoCode())
                .soDate(so.getSoDate())
                .status(so.getStatus())
                .partnerId(so.getPartnerId())
                .partnerCode(so.getPartner() != null ? so.getPartner().getCode() : null)
                .partnerName(so.getPartner() != null ? so.getPartner().getName() : null)
                .partnerPhone(so.getPartner() != null ? so.getPartner().getPhone() : null)
                .partnerEmail(so.getPartner() != null ? so.getPartner().getEmail() : null)
                .warehouseId(so.getWarehouseId())
                .warehouseCode(so.getWarehouse() != null ? so.getWarehouse().getCode() : null)
                .warehouseName(so.getWarehouse() != null ? so.getWarehouse().getName() : null)
                .build();
        r.setSubTotalAmount(so.getSubTotalAmount());
        r.setTaxAmount(so.getTaxAmount());
        r.setTotalAmount(so.getTotalAmount());
        r.setPaidAmount(so.getPaidAmount());
        r.setPaymentStatus(so.getPaymentStatus());
        r.setPaymentDueDate(so.getPaymentDueDate());
        r.setDeliveryAddress(so.getDeliveryAddress());
        r.setNote(so.getNote());
        r.setCreatedBy(so.getCreatedBy());
        r.setCreatedByName(so.getCreatedByUser() != null ? so.getCreatedByUser().getFullName() : null);
        r.setCreatedAt(so.getCreatedAt());
        r.setUpdatedAt(so.getUpdatedAt());
        return r;
    }

    private SalesOrderResponse toDetailResponse(SalesOrder so, List<StockReservation> reservations) {
        List<SalesOrderResponse.SalesOrderLineResponse> lineResponses = so.getLines().stream()
                .map(line -> {
                    String variantName = line.getVariant() != null ? line.getVariant().getVariantName() : null;
                    String sku = line.getVariant() != null ? line.getVariant().getSku() : null;
                    String productCode = (line.getVariant() != null && line.getVariant().getProduct() != null)
                            ? line.getVariant().getProduct().getProductCode() : null;

                    BigDecimal available = inventoryBalanceRepository
                            .sumAvailableQuantityByWarehouseAndVariant(so.getWarehouseId(), line.getVariantId(), "GOOD");

                    BigDecimal exported = inventoryDocumentLineRepository
                            .sumExportedQuantityBySalesOrderIdAndVariantId(so.getId(), line.getVariantId());
                    if (exported == null) exported = BigDecimal.ZERO;
                    BigDecimal remaining = line.getQuantity().subtract(exported);
                    if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

                    return SalesOrderResponse.SalesOrderLineResponse.builder()
                            .id(line.getId())
                            .variantId(line.getVariantId())
                            .sku(sku)
                            .variantName(variantName)
                            .productCode(productCode)
                            .unitName(line.getVariant() != null && line.getVariant().getProduct() != null && line.getVariant().getProduct().getUnit() != null ? line.getVariant().getProduct().getUnit().getName() : null)
                            .quantity(line.getQuantity())
                            .unitPrice(line.getUnitPrice())
                            .vatRate(line.getVatRate())
                            .vatAmount(line.getVatAmount())
                            .warrantyMonths(line.getWarrantyMonths())
                            .lineAmount(line.getLineAmount())
                            .note(line.getNote())
                            .availableQuantity(available != null ? available : BigDecimal.ZERO)
                            .exportedQuantity(exported)
                            .remainingQuantity(remaining)
                            .build();
                })
                .collect(Collectors.toList());

        boolean isFullyExported = !lineResponses.isEmpty() && lineResponses.stream()
                .allMatch(l -> l.getRemainingQuantity().compareTo(BigDecimal.ZERO) <= 0);

        List<SalesOrderResponse.StockReservationResponse> reservationResponses = reservations.stream()
                .map(r -> SalesOrderResponse.StockReservationResponse.builder()
                        .id(r.getId())
                        .variantId(r.getVariantId())
                        .variantName(r.getVariant() != null ? r.getVariant().getVariantName() : null)
                        .sku(r.getVariant() != null ? r.getVariant().getSku() : null)
                        .warehouseId(r.getWarehouseId())
                        .warehouseName(r.getWarehouse() != null ? r.getWarehouse().getName() : null)
                        .quantityReserved(r.getQuantityReserved())
                        .status(r.getStatus())
                        .createdAt(r.getCreatedAt())
                        .expiresAt(r.getExpiresAt())
                        .build())
                .collect(Collectors.toList());

        SalesOrderResponse response = toSummaryResponse(so);
        response.setIsFullyExported(isFullyExported);
        response.setLines(lineResponses);
        response.setReservations(reservationResponses);
        return response;
    }

    public void sendQuoteEmail(Long id, com.duylongtech.backend.dto.request.EmailQuoteRequest req) {
        SalesOrderResponse soResponse = getSalesOrderById(id);
        emailService.sendSalesOrderQuoteEmail(req.getToEmail(), soResponse, req.getMessage());
    }
}
