package com.duylongtech.backend.feature.purchase_order;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderResponse;

import com.duylongtech.backend.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderMapper;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderMapper;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRequest;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderResponse;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderService;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final com.duylongtech.backend.feature.system.CodeGeneratorService codeGeneratorService;

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

    /** Mã dự kiến cho màn tạo mới: chỉ xem trước, không cấp số (mã thật cấp khi lưu). */
    public String previewNextPoCode() {
        return codeGeneratorService.previewNewCode("purchase_orders", "po_code", "PO", 4, purchaseOrderRepository::existsByPoCode);
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

        // Mã cấp lúc lưu: để trống -> số tiếp theo; tự nhập -> giữ nguyên nếu chưa trùng
        String poCode = codeGeneratorService.resolveNewCode("purchase_orders", "po_code", "PO", 4, request.getPoCode(),
                purchaseOrderRepository::existsByPoCode,
                code -> new BusinessException(String.format(SystemMessage.PO_ERR_005.getMessage(), code)));

        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));

        PurchaseOrder po = new PurchaseOrder();
        po.initOrder(poCode, request.getPartnerId(), request.getPoDate(), request.getPaymentDueDate(), request.getExpectedDeliveryDate(), request.getNote(), actorUser.getId());

        for (PurchaseOrderRequest.PurchaseOrderLineRequest lr : request.getLines()) {
            PurchaseOrderLine line = new PurchaseOrderLine();
            line.initLine(lr.getVariantId(), lr.getQuantity(), lr.getUnitPrice(), lr.getVatRate(), lr.getWarehouseId(), lr.getNote());
            po.addLine(line);
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);

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

        if (!DocumentStatus.DRAFT.name().equals(po.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.PO_ERR_004.getMessage(), po.getStatus()));
        }

        if (request.getPaymentDueDate() != null && request.getPaymentDueDate().isBefore(request.getPoDate())) {
            throw new BusinessException(SystemMessage.PO_ERR_003.getMessage());
        }

        po.updateDetails(request.getPartnerId(), request.getPoDate(), request.getPaymentDueDate(), request.getExpectedDeliveryDate(), request.getNote());

        po.clearLines();

        for (PurchaseOrderRequest.PurchaseOrderLineRequest lr : request.getLines()) {
            PurchaseOrderLine line = new PurchaseOrderLine();
            line.initLine(lr.getVariantId(), lr.getQuantity(), lr.getUnitPrice(), lr.getVatRate(), lr.getWarehouseId(), lr.getNote());
            po.addLine(line);
        }

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

        po.approve();
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

        po.cancel();
        PurchaseOrder cancelled = purchaseOrderRepository.save(po);
        log.info("Hủy đơn mua hàng {} bởi {}", cancelled.getPoCode(), actor);

        return toSummaryResponse(cancelled);
    }

    // =========================================================
    // SHORT CLOSE — đóng đơn hụt khi không nhận thêm hàng dù chưa đủ số lượng
    // =========================================================

    @Transactional
    public PurchaseOrderResponse shortClosePurchaseOrder(Long id, String actor) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));

        po.shortClose();
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        log.info("Đóng đơn hụt (short close) đơn mua hàng {} bởi {}", saved.getPoCode(), actor);

        return toSummaryResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse revertShortClosePurchaseOrder(Long id, String actor) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + id));

        po.revertShortClose();
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        log.info("Hủy đóng đơn hụt (revert short close) đơn mua hàng {} bởi {}", saved.getPoCode(), actor);

        return toSummaryResponse(saved);
    }

    // =========================================================
    // MAPPING
    // =========================================================

    private PurchaseOrderResponse toSummaryResponse(PurchaseOrder po) {
        return purchaseOrderMapper.toSummaryResponse(po);
    }

    private PurchaseOrderResponse toDetailResponse(PurchaseOrder po) {
        // 1 truy vấn tổng hợp cho cả PO (mọi kho) thay vì 1 truy vấn mỗi dòng.
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(po.getLines(),
                inventoryDocumentLineRepository.sumReceivedByPurchaseOrder(po.getId(), null));

        List<PurchaseOrderResponse.PurchaseOrderLineResponse> lineResponses = po.getLines().stream()
                .map(line -> {
                    PurchaseOrderReceiving.Group progress = receiving.forLine(line);
                    PurchaseOrderResponse.PurchaseOrderLineResponse lineResponse = purchaseOrderMapper.toLineResponse(line);
                    // importedQuantity = đã ghi sổ; remainingQuantity = còn có thể đưa vào phiếu mới (trừ cả phiếu nháp)
                    lineResponse.setImportedQuantity(progress.getPosted());
                    lineResponse.setRemainingQuantity(progress.remainingToAllocate());
                    return lineResponse;
                })
                .collect(Collectors.toList());

        PurchaseOrderResponse response = toSummaryResponse(po);
        response.setIsFullyImported(receiving.isFullyPosted());
        response.setLines(lineResponses);
        return response;
    }
}
