package com.duylongtech.backend.feature.sales_order;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.StockReservationStatus;

import com.duylongtech.backend.feature.sales_order.SalesOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;

import com.duylongtech.backend.exception.BusinessException;

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

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.duylongtech.backend.feature.sales_order.SalesOrderMapper;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.StockReservation;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderMapper;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRequest;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.system.EmailQuoteRequest;
import com.duylongtech.backend.feature.system.EmailService;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;

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
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final PaymentService paymentService;
    private final SystemSettingsService systemSettingsService;
    private final SalesOrderMapper salesOrderMapper;
    private final com.duylongtech.backend.feature.system.CodeGeneratorService codeGeneratorService;

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

    /** Mã dự kiến cho màn tạo mới: chỉ xem trước, không cấp số (mã thật cấp khi lưu). */
    public String previewNextSoCode() {
        return codeGeneratorService.previewNewCode("sales_orders", "so_code", "SO", 4, salesOrderRepository::existsBySoCode);
    }

    // =========================================================
    // CREATE
    // =========================================================

    @Transactional
    public SalesOrderResponse createSalesOrder(SalesOrderRequest request, String actor) {
        requireActiveCustomer(request.getPartnerId());
        // Validate partner
        partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Khách hàng không tồn tại"));
        
        Long headerWh = request.getWarehouseId();
        if (headerWh == null && request.getLines() != null && !request.getLines().isEmpty()) {
            headerWh = request.getLines().get(0).getWarehouseId();
        }

        if (request.getPaymentDueDate() != null) {
            if (request.getPaymentDueDate().isBefore(request.getSoDate())) {
                throw new BusinessException(SystemMessage.SO_ERR_008.getMessage());
            }
            if (request.getPaymentDueDate().isBefore(LocalDate.now())) {
                throw new BusinessException(SystemMessage.SO_ERR_007.getMessage());
            }
        }

        // Mã cấp lúc lưu: để trống -> số tiếp theo; tự nhập -> giữ nguyên nếu chưa trùng
        String soCode = codeGeneratorService.resolveNewCode("sales_orders", "so_code", "SO", 4, request.getSoCode(),
                salesOrderRepository::existsBySoCode,
                code -> new BusinessException(String.format(SystemMessage.PO_ERR_005.getMessage(), code)));

        // Resolve createdBy từ username
        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));

        // Tạo lines và tính tiền
        BigDecimal subTotalAmount = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;
        final Long fallbackWh = headerWh;
        List<SalesOrderLine> lines = request.getLines().stream().map(lr -> {
            BigDecimal lineAmount = lr.getUnitPrice().multiply(lr.getQuantity());
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            BigDecimal vatAmount = lineAmount.multiply(vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            Long lineWh = lr.getWarehouseId() != null ? lr.getWarehouseId() : fallbackWh;
            
            SalesOrderLine line = new SalesOrderLine();
            line.initLine(lr.getVariantId(), lr.getQuantity(), lr.getUnitPrice(), vatRate, lineWh, lr.getWarrantyMonths(), lr.getNote());
            return line;
        }).collect(Collectors.toList());

        for (SalesOrderLine l : lines) {
            subTotalAmount = subTotalAmount.add(l.getLineAmount());
            taxAmount = taxAmount.add(l.getVatAmount());
        }
        BigDecimal totalAmount = subTotalAmount.add(taxAmount);

        SalesOrder so = new SalesOrder();
        so.initOrder(soCode, request.getPartnerId(), headerWh, request.getSoDate(), request.getPaymentDueDate(), request.getDeliveryAddress(), request.getNote(), actorUser.getId());

        lines.forEach(l -> so.addLine(l));
        SalesOrder saved = salesOrderRepository.save(so);

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

        if (!DocumentStatus.DRAFT.name().equals(so.getStatus())) {
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

        Long headerWh = request.getWarehouseId();
        if (headerWh == null && request.getLines() != null && !request.getLines().isEmpty()) {
            headerWh = request.getLines().get(0).getWarehouseId();
        }

        so.updateDetails(request.getPartnerId(), headerWh, request.getSoDate(), request.getPaymentDueDate(), request.getDeliveryAddress(), request.getNote());

        so.clearLines();
        final Long fallbackWh = headerWh;
        for (SalesOrderRequest.SalesOrderLineRequest lr : request.getLines()) {
            BigDecimal vatRate = lr.getVatRate() != null ? lr.getVatRate() : BigDecimal.ZERO;
            Long lineWh = lr.getWarehouseId() != null ? lr.getWarehouseId() : fallbackWh;
            
            SalesOrderLine line = new SalesOrderLine();
            line.initLine(lr.getVariantId(), lr.getQuantity(), lr.getUnitPrice(), vatRate, lineWh, lr.getWarrantyMonths(), lr.getNote());
            
            so.addLine(line);
        }

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

        if (!DocumentStatus.DRAFT.name().equals(so.getStatus())) {
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
            Long lineWh = line.getWarehouseId() != null ? line.getWarehouseId() : so.getWarehouseId();
            if (lineWh == null) {
                throw new BusinessException("Dòng sản phẩm " + line.getVariantId() + " chưa được chọn kho xuất");
            }

            // Kiểm tra tồn kho khả dụng (on_hand - reserved)
            BigDecimal available = inventoryBalanceRepository
                    .sumAvailableQuantityByWarehouseAndVariant(lineWh, line.getVariantId(), "GOOD");

            if (available == null) available = BigDecimal.ZERO;

            // Xác định trạng thái reservation dựa trên số lượng khả dụng
            String resStatus = (available.compareTo(line.getQuantity()) < 0) ? StockReservationStatus.BACKORDERED.name() : StockReservationStatus.HOLDING.name();

            // Tạo reservation
            StockReservation reservation = new StockReservation();
            reservation.initReservation(so.getId(), line.getVariantId(), lineWh, line.getQuantity(), resStatus, expiresAt);
            reservation.setVariant(line.getVariant());
            if (lineWh != null) {
                reservation.setWarehouse(warehouseRepository.getReferenceById(lineWh));
            }
            stockReservationRepository.save(reservation);

            // Tăng quantity_reserved trong INVENTORY_BALANCES
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariant(lineWh, line.getVariantId(), "GOOD")
                    .orElseGet(() -> {
                        InventoryBalance newBalance = new InventoryBalance();
                        newBalance.initBalance(lineWh, line.getVariantId(), null, "GOOD", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
                        return inventoryBalanceRepository.save(newBalance);
                    });
            balance.setQuantityReserved(balance.getQuantityReserved().add(line.getQuantity()));
            inventoryBalanceRepository.save(balance);
        }

        so.approve();
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

        if (DocumentStatus.POSTED.name().equals(so.getStatus()) || DocumentStatus.CANCELLED.name().equals(so.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.SO_ERR_005.getMessage(), so.getStatus()));
        }

        // Kiểm tra xem đơn hàng đã có phiếu xuất kho nào đã ghi sổ (POSTED) chưa
        List<InventoryDocument> exportDocs = inventoryDocumentRepository.findAllExports();
        boolean hasPostedExport = exportDocs.stream()
                .anyMatch(d -> id.equals(d.getSalesOrderId()) && DocumentStatus.POSTED.name().equalsIgnoreCase(d.getStatus()));
        if (hasPostedExport) {
            throw new BusinessException("Đơn bán hàng đã có phiếu xuất kho đã ghi sổ (hoàn tất xuất), không thể hủy đơn hàng.");
        }

        // Release tất cả reservations HOLDING
        releaseReservations(so.getId(), so.getWarehouseId());

        so.cancel();
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
        if (!DocumentStatus.APPROVED.name().equals(customer.getStatus())) {
            throw new BusinessException(SystemMessage.CHK_ERR_004.getMessage());
        }
        return customer;
    }

    /**
     * Release tất cả reservations đang giữ chỗ (HOLDING lẫn BACKORDERED) của một SO.
     * Gọi khi: hủy SO, hoặc scheduled job dọn expired reservations.
     *
     * approveSalesOrder() cộng quantity_reserved cho CẢ HAI trạng thái HOLDING và
     * BACKORDERED (xem trên) - trước đây hàm này chỉ release HOLDING, nên hủy một
     * SO bị backorder (hàng không đủ lúc duyệt) sẽ không bao giờ trả lại phần
     * quantity_reserved đó, làm tồn "khả dụng" của biến thể đó bị âm dần vĩnh viễn.
     */
    @Transactional
    public void releaseReservations(Long salesOrderId, Long warehouseId) {
        List<StockReservation> holdings = new java.util.ArrayList<>(stockReservationRepository
                .findBySalesOrderIdAndStatus(salesOrderId, StockReservationStatus.HOLDING.name()));
        holdings.addAll(stockReservationRepository
                .findBySalesOrderIdAndStatus(salesOrderId, StockReservationStatus.BACKORDERED.name()));

        for (StockReservation r : holdings) {
            Long whId = r.getWarehouseId() != null ? r.getWarehouseId() : warehouseId;
            if (whId != null) {
                // Giảm quantity_reserved trong INVENTORY_BALANCES
                inventoryBalanceRepository
                        .findByWarehouseAndVariant(whId, r.getVariantId(), "GOOD")
                        .ifPresent(balance -> {
                            BigDecimal newReserved = balance.getQuantityReserved().subtract(r.getQuantityReserved());
                            balance.setQuantityReserved(newReserved.max(BigDecimal.ZERO));
                            inventoryBalanceRepository.save(balance);
                        });
            }
            r.setStatus(StockReservationStatus.RELEASED.name());
            stockReservationRepository.save(r);
        }
    }

    /**
     * Sau khi phiếu xuất kho EX_SO được POST, gọi method này để fulfill reservation.
     */
    @Transactional
    public void fulfillReservation(Long salesOrderId, Long variantId, Long warehouseId, BigDecimal quantityFulfilled, BigDecimal costAmountFulfilled) {
        List<StockReservation> reservations = stockReservationRepository.findBySalesOrderId(salesOrderId).stream()
                .filter(r -> variantId.equals(r.getVariantId()) && (StockReservationStatus.HOLDING.name().equals(r.getStatus()) || StockReservationStatus.BACKORDERED.name().equals(r.getStatus())))
                .collect(Collectors.toList());

        BigDecimal remainingToFulfill = quantityFulfilled;
        for (StockReservation r : reservations) {
            if (remainingToFulfill.compareTo(BigDecimal.ZERO) <= 0) break;
            Long whId = r.getWarehouseId() != null ? r.getWarehouseId() : warehouseId;
            BigDecimal fulfillThis = remainingToFulfill.min(r.getQuantityReserved());

            if (whId != null && (StockReservationStatus.HOLDING.name().equals(r.getStatus()) || StockReservationStatus.BACKORDERED.name().equals(r.getStatus()))) {
                inventoryBalanceRepository
                        .findByWarehouseAndVariant(whId, variantId, "GOOD")
                        .ifPresent(balance -> {
                            BigDecimal newReserved = balance.getQuantityReserved().subtract(fulfillThis);
                            balance.setQuantityReserved(newReserved.max(BigDecimal.ZERO));
                            inventoryBalanceRepository.save(balance);
                        });
            }

            BigDecimal remainingRes = r.getQuantityReserved().subtract(fulfillThis);
            if (remainingRes.compareTo(BigDecimal.ZERO) <= 0) {
                r.setStatus(StockReservationStatus.FULFILLED.name());
                r.setQuantityReserved(BigDecimal.ZERO);
            } else {
                r.setQuantityReserved(remainingRes);
            }
            stockReservationRepository.save(r);
            remainingToFulfill = remainingToFulfill.subtract(fulfillThis);
        }

        // Cập nhật giá vốn FIFO vào SalesOrderLine
        adjustLineCost(salesOrderId, variantId, warehouseId,
                costAmountFulfilled != null ? costAmountFulfilled : BigDecimal.ZERO);

        // Kiểm tra nếu tất cả reservations đều FULFILLED → SO = POSTED. Với SO đa kho, mỗi
        // phiếu xuất (1 kho) ghi sổ xong chỉ fulfill phần reservation của kho đó - so.markAsPosted()
        // chỉ thực sự chạy ở lần gọi cuối cùng, khi TẤT CẢ các kho đã ghi sổ xong.
        List<StockReservation> all = stockReservationRepository.findBySalesOrderId(salesOrderId);
        boolean allFulfilled = !all.isEmpty()
                && all.stream().allMatch(r -> StockReservationStatus.FULFILLED.name().equals(r.getStatus()));
        if (allFulfilled) {
            salesOrderRepository.findById(salesOrderId).ifPresent(so -> {
                if (DocumentStatus.APPROVED.name().equals(so.getStatus())) {
                    so.markAsPosted();
                    salesOrderRepository.save(so);
                    log.info("Đơn bán hàng {} đã xuất kho đủ toàn bộ hàng hóa -> chuyển trạng thái POSTED", so.getSoCode());
                }
            });
        }
    }

    /**
     * Bỏ ghi sổ phiếu xuất: trừ lại giá vốn đã cộng vào dòng SO lúc ghi sổ. Thiếu bước này thì ghi sổ, bỏ ghi
     * sổ rồi ghi sổ lại sẽ cộng giá vốn hai lần và báo cáo lãi gộp bị thấp đi.
     */
    @Transactional
    public void reverseFulfilledCost(Long salesOrderId, Long variantId, Long warehouseId, BigDecimal costAmount) {
        if (costAmount == null || costAmount.signum() == 0) {
            return;
        }
        adjustLineCost(salesOrderId, variantId, warehouseId, costAmount.negate());
    }

    /**
     * Cộng (hoặc trừ, khi delta âm) giá vốn FIFO vào dòng SO của sản phẩm. SO bán đa kho có thể có cùng sản phẩm
     * ở 2 kho, nên ưu tiên dòng đúng kho xuất; ghi sổ và bỏ ghi sổ dùng chung quy tắc này để trừ đúng dòng đã cộng.
     */
    private void adjustLineCost(Long salesOrderId, Long variantId, Long warehouseId, BigDecimal delta) {
        salesOrderRepository.findByIdWithDetails(salesOrderId).ifPresent(so -> {
            SalesOrderLine target = so.getLines().stream()
                    .filter(line -> line.getVariantId().equals(variantId))
                    .filter(line -> java.util.Objects.equals(
                            line.getWarehouseId() != null ? line.getWarehouseId() : so.getWarehouseId(), warehouseId))
                    .findFirst()
                    .orElseGet(() -> so.getLines().stream()
                            .filter(line -> line.getVariantId().equals(variantId))
                            .findFirst().orElse(null));
            if (target == null) {
                return;
            }
            BigDecimal currentCost = target.getCostAmount() != null ? target.getCostAmount() : BigDecimal.ZERO;
            target.setCostAmount(currentCost.add(delta).max(BigDecimal.ZERO));
            salesOrderRepository.save(so);
        });
    }

    /**
     * Tự động rà soát các reservation BACKORDERED và chuyển sang HOLDING nếu tồn kho đã đủ.
     */
    @Transactional
    public void reEvaluateBackorders(Long warehouseId, Long variantId) {
        // Tìm tất cả BACKORDERED reservation theo FIFO
        List<StockReservation> backorderedList = stockReservationRepository
            .findBackorderedByVariantAndWarehouseOrderByCreatedAtAsc(variantId, warehouseId);
        
        if (backorderedList.isEmpty()) {
            return;
        }
        
        // Lấy quantityOnHand
        InventoryBalance balance = inventoryBalanceRepository
            .findByWarehouseAndVariant(warehouseId, variantId, "GOOD")
            .orElse(null);
            
        if (balance == null || balance.getQuantityOnHand().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        
        BigDecimal onHand = balance.getQuantityOnHand();
        
        // Tổng số lượng đang HOLDING
        BigDecimal holdingSum = stockReservationRepository.sumHoldingQuantity(variantId, warehouseId);
        if (holdingSum == null) holdingSum = BigDecimal.ZERO;
        
        // Đọc cài đặt thời gian giữ chỗ
        int expiryHours = 24;
        try {
            expiryHours = Integer.parseInt(systemSettingsService.getSetting("sales.reservation.expiry_hours", "24"));
            if (expiryHours <= 0) expiryHours = 24;
        } catch (Exception e) {
            log.warn("Invalid expiry_hours setting, defaulting to 24", e);
        }
        LocalDateTime newExpiresAt = LocalDateTime.now().plusHours(expiryHours);
        
        for (StockReservation r : backorderedList) {
            BigDecimal needed = holdingSum.add(r.getQuantityReserved());
            if (onHand.compareTo(needed) >= 0) {
                r.setStatus(StockReservationStatus.HOLDING.name());
                r.setExpiresAt(newExpiresAt);
                stockReservationRepository.save(r);
                holdingSum = holdingSum.add(r.getQuantityReserved());
                log.info("Chuyển trạng thái reservation {} từ BACKORDERED sang HOLDING. ExpiresAt mới: {}", r.getId(), newExpiresAt);
            } else {
                break;
            }
        }
    }

    @Transactional
    public SalesOrderResponse recordPayment(Long id, BigDecimal amount, String actor) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn bán hàng"));
        
        if (DocumentStatus.CANCELLED.name().equals(so.getStatus())) {
            throw new BusinessException(SystemMessage.SO_ERR_003.getMessage());
        }

        so.recordPayment(amount);

        salesOrderRepository.save(so);
        
        // Tự động tạo và ghi sổ phiếu thu
        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setPartnerId(so.getPartnerId());
        paymentRequest.setAmount(amount);
        paymentRequest.setPaymentMethod("CASH"); // Mặc định tiền mặt
        paymentRequest.setNote("Thanh toán cho đơn hàng " + so.getSoCode());
        paymentRequest.setStatus(DocumentStatus.POSTED.name()); // Ghi sổ luôn
        
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
        return salesOrderMapper.toSummaryResponse(so);
    }

    private SalesOrderResponse toDetailResponse(SalesOrder so, List<StockReservation> reservations) {
        // 1 truy vấn tổng hợp cho cả SO (mọi kho) thay vì 1 truy vấn mỗi dòng. Theo dõi theo (sản phẩm, kho)
        // khi SO bán đa kho, nếu không cùng một sản phẩm ở 2 kho sẽ trừ nhầm số lượng của nhau.
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(so.getLines(), so.getWarehouseId(),
                inventoryDocumentLineRepository.sumExportedBySalesOrder(so.getId(), null));

        List<SalesOrderResponse.SalesOrderLineResponse> lineResponses = so.getLines().stream()
                .map(line -> {
                    Long lineWh = line.getWarehouseId() != null ? line.getWarehouseId() : so.getWarehouseId();
                    BigDecimal available = lineWh != null ? inventoryBalanceRepository
                            .sumAvailableQuantityByWarehouseAndVariant(lineWh, line.getVariantId(), "GOOD") : BigDecimal.ZERO;

                    SalesOrderFulfillment.Group progress = fulfillment.forLine(line);
                    SalesOrderResponse.SalesOrderLineResponse lineResponse = salesOrderMapper.toLineResponse(line);
                    lineResponse.setAvailableQuantity(available != null ? available : BigDecimal.ZERO);
                    // exportedQuantity = đã ghi sổ; remainingQuantity = còn có thể đưa vào phiếu mới (trừ cả phiếu nháp)
                    lineResponse.setExportedQuantity(progress != null ? progress.getPosted() : BigDecimal.ZERO);
                    lineResponse.setRemainingQuantity(progress != null ? progress.remainingToAllocate() : line.getQuantity());
                    return lineResponse;
                })
                .collect(Collectors.toList());

        boolean isFullyExported = fulfillment.isFullyPosted();

        List<SalesOrderResponse.StockReservationResponse> reservationResponses = reservations.stream()
                .map(salesOrderMapper::toReservationResponse)
                .collect(Collectors.toList());

        SalesOrderResponse response = toSummaryResponse(so);
        response.setIsFullyExported(isFullyExported);
        response.setLines(lineResponses);
        response.setReservations(reservationResponses);
        return response;
    }

    // Gọi getSalesOrderById nội bộ không qua proxy nên @Transactional của nó không có tác dụng: transaction phải mở ở đây.
    @Transactional(readOnly = true)
    public void sendQuoteEmail(Long id, com.duylongtech.backend.feature.system.EmailQuoteRequest req) {
        SalesOrderResponse soResponse = getSalesOrderById(id);
        emailService.sendSalesOrderQuoteEmail(req.getToEmail(), soResponse, req.getMessage());
    }
}
