package com.duylongtech.backend.feature.sales_order;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.feature.sales_order.DirectCheckoutRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.DirectCheckoutRequest;
import com.duylongtech.backend.feature.sales_order.DirectCheckoutService;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;

@Service
@RequiredArgsConstructor
public class DirectCheckoutService {

    private static final String WALK_IN_CUSTOMER_CODE = "KH-0000";
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final SalesOrderRepository salesOrderRepository;
    private final PartnerRepository partnerRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final InventoryDocumentService inventoryDocumentService;
    private final PartnerLedgerService partnerLedgerService;
    private final PaymentService paymentService;

    @Transactional(rollbackFor = Exception.class)
    public SalesOrderResponse directCheckout(DirectCheckoutRequest request, String actor) {
        validateRequest(request);

        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));
        Partner customer = resolveCustomer(request);
        requireActiveCustomer(customer);
        LocalDate checkoutDate = request.getCheckoutDate() != null ? request.getCheckoutDate() : LocalDate.now();

        SalesOrder savedOrder = createApprovedSalesOrder(request, customer, actorUser, checkoutDate);
        InventoryDocumentResponse export = createDraftExport(request, savedOrder, customer, actorUser, checkoutDate);

        recordDirectCheckoutLedger(savedOrder, request.getPaymentAmount(), export.getDocCode());

        return toResponse(savedOrder, export);
    }

    private void validateRequest(DirectCheckoutRequest request) {
        if (request == null) {
            throw new BusinessException(SystemMessage.CHK_ERR_009.getMessage());
        }
        warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new BusinessException("Kho không tồn tại"));
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessException(SystemMessage.CHK_ERR_008.getMessage());
        }
        for (int i = 0; i < request.getLines().size(); i++) {
            DirectCheckoutRequest.Line line = request.getLines().get(i);
            int rowNumber = i + 1;
            productVariantRepository.findById(line.getVariantId())
                    .orElseThrow(() -> new BusinessException("Dòng " + rowNumber + ": Sản phẩm không tồn tại"));
            if (line.getQuantity() == null || line.getQuantity().compareTo(ZERO) <= 0) {
                throw new BusinessException(String.format(SystemMessage.CHK_ERR_007.getMessage(), rowNumber));
            }
            if (line.getUnitPrice() == null || line.getUnitPrice().compareTo(ZERO) < 0) {
                throw new BusinessException(String.format(SystemMessage.CHK_ERR_006.getMessage(), rowNumber));
            }
        }
    }

    private Partner resolveCustomer(DirectCheckoutRequest request) {
        if (request.getPartnerId() != null) {
            Partner customer = partnerRepository.findById(request.getPartnerId())
                    .orElseThrow(() -> new BusinessException("Khách hàng không tồn tại: " + request.getPartnerId()));
            requireActiveCustomer(customer);
            return customer;
        }

        String phone = trimToNull(request.getCustomerPhone());
        if (phone == null) {
            return partnerRepository.findByCode(WALK_IN_CUSTOMER_CODE)
                    .orElseGet(this::createWalkInCustomer);
        }

        return partnerRepository.findByPhoneAndIsCustomerTrue(phone)
                .orElseGet(() -> createCustomerFromCheckout(request, phone));
    }

    private void requireActiveCustomer(Partner customer) {
        if (customer == null || !Boolean.TRUE.equals(customer.getIsCustomer())) {
            throw new BusinessException(SystemMessage.CHK_ERR_005.getMessage());
        }
        if (!DocumentStatus.APPROVED.name().equals(customer.getStatus())) {
            throw new BusinessException(SystemMessage.CHK_ERR_004.getMessage());
        }
    }

    private Partner createWalkInCustomer() {
        Partner customer = new Partner();
        customer.initPartner(WALK_IN_CUSTOMER_CODE, "Khách vãng lai", "INDIVIDUAL", true, false, "RETAIL");
        return partnerRepository.save(customer);
    }

    private Partner createCustomerFromCheckout(DirectCheckoutRequest request, String phone) {
        String customerName = trimToNull(request.getCustomerName());
        if (customerName == null) {
            customerName = "Khách " + phone;
        }
        Partner customer = new Partner();
        customer.initPartner(codeGeneratorService.generateCode("PARTNERS", "code", "KH", 6), customerName, "INDIVIDUAL", true, false, "RETAIL");
        customer.updateContact(phone, null, trimToNull(request.getCustomerAddress()), null);
        return partnerRepository.save(customer);
    }

    private SalesOrder createApprovedSalesOrder(DirectCheckoutRequest request, Partner customer, User actorUser,
            LocalDate checkoutDate) {
        String soCode = generateNextSoCode();
        SalesOrder order = new SalesOrder();
        order.initOrder(soCode, customer.getId(), request.getWarehouseId(), checkoutDate, checkoutDate, trimToNull(request.getCustomerAddress()), trimToNull(request.getNote()), actorUser.getId());

        for (DirectCheckoutRequest.Line reqLine : request.getLines()) {
            BigDecimal qty = reqLine.getQuantity();
            BigDecimal vatRate = reqLine.getVatRate() != null ? reqLine.getVatRate() : ZERO;
            Long lineWh = reqLine.getWarehouseId() != null ? reqLine.getWarehouseId() : request.getWarehouseId();

            SalesOrderLine line = new SalesOrderLine();
            line.initLine(reqLine.getVariantId(), qty, reqLine.getUnitPrice(), vatRate, lineWh, reqLine.getWarrantyMonths(), reqLine.getNote());
            order.addLine(line);
        }

        BigDecimal total = order.getTotalAmount();
        BigDecimal paidAmount = normalizePaymentAmount(request.getPaymentAmount(), total);
        ensureDebtAllowedForCustomer(customer, paidAmount, total);

        order.approve();
        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            order.recordPayment(paidAmount);
        }
        return salesOrderRepository.save(order);
    }

    private InventoryDocumentResponse createDraftExport(DirectCheckoutRequest request, SalesOrder order,
            Partner customer, User actorUser, LocalDate checkoutDate) {
        InventoryDocumentRequest exportReq = new InventoryDocumentRequest();
        exportReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_SALES);
        exportReq.setReferenceType("SALES_ORDER");
        exportReq.setReferenceId(order.getId());
        exportReq.setSalesOrderId(order.getId());
        exportReq.setPartnerId(customer.getId());
        exportReq.setWarehouseId(request.getWarehouseId());
        exportReq.setDocDate(checkoutDate);
        exportReq.setStatus(DocumentStatus.DRAFT.name());
        exportReq.setCreatedBy(actorUser.getId());
        exportReq.setRecipientName(customer.getName());
        exportReq.setRecipientAddress(trimToNull(request.getCustomerAddress()));
        exportReq.setSalespersonId(actorUser.getId());
        exportReq.setNote("Bán hàng trực tiếp từ đơn " + order.getSoCode());

        List<InventoryDocumentLineRequest> exportLines = new ArrayList<>();
        for (DirectCheckoutRequest.Line reqLine : request.getLines()) {
            Long lineWh = reqLine.getWarehouseId() != null ? reqLine.getWarehouseId() : request.getWarehouseId();
            InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
            line.setVariantId(reqLine.getVariantId());
            line.setWarehouseId(lineWh);
            line.setQuantityOut(reqLine.getQuantity());
            line.setUnitPrice(reqLine.getUnitPrice());
            line.setUnitCost(ZERO);
            line.setVatRate(reqLine.getVatRate() != null ? reqLine.getVatRate() : ZERO);
            line.setVatPercent(reqLine.getVatRate() != null ? reqLine.getVatRate() : ZERO);
            line.setWarrantyMonths(reqLine.getWarrantyMonths());
            line.setSerialNumbers(reqLine.getSerialNumbers());
            line.setNote(reqLine.getNote());
            exportLines.add(line);
        }
        exportReq.setLines(exportLines);

        // Chỉ tạo phiếu xuất ở trạng thái nháp — Thủ kho là người ghi sổ (xác nhận
        // xuất kho thật) qua màn Phiếu xuất, giống mọi phiếu xuất khác trong hệ thống.
        return inventoryDocumentService.createExport(exportReq);
    }

    private void recordDirectCheckoutLedger(SalesOrder order, BigDecimal requestedPayment, String exportCode) {
        // Ghi chú: công nợ (Debt) chỉ tăng khi Thủ kho thực sự ghi sổ phiếu xuất (postExport),
        // và số tiền dưới đây chỉ ghi sổ (ảnh hưởng công nợ/sổ quỹ) khi Thủ quỹ post phiếu thu —
        // không có bước nào ở đây làm thay đổi công nợ/sổ quỹ ngay lập tức.

        BigDecimal paidAmount = normalizePaymentAmount(requestedPayment, order.getTotalAmount());
        if (paidAmount.compareTo(ZERO) > 0) {
            // Chỉ tạo phiếu thu ở trạng thái nháp — Thủ quỹ là người ghi sổ (xác nhận tiền
            // mặt đã thực nhận) qua màn Phiếu thu/chi, giống mọi phiếu thu khác trong hệ thống.
            PaymentRequest paymentRequest = new PaymentRequest();
            paymentRequest.setPartnerId(order.getPartnerId());
            paymentRequest.setAmount(paidAmount);
            paymentRequest.setPaymentMethod("CASH"); // Mặc định bán hàng trực tiếp dùng tiền mặt
            paymentRequest.setNote("Thu tiền bán hàng trực tiếp " + order.getSoCode() + " / " + exportCode);
            paymentRequest.setStatus(DocumentStatus.DRAFT.name());

            paymentService.createPaymentReceipt(paymentRequest);
        }
    }

    private SalesOrderResponse toResponse(SalesOrder order, InventoryDocumentResponse export) {
        SalesOrder reloaded = salesOrderRepository.findByIdWithDetails(order.getId()).orElse(order);
        SalesOrderResponse response = SalesOrderResponse.builder()
                .id(reloaded.getId())
                .soCode(reloaded.getSoCode())
                .soDate(reloaded.getSoDate())
                .status(reloaded.getStatus())
                .partnerId(reloaded.getPartnerId())
                .partnerCode(reloaded.getPartner() != null ? reloaded.getPartner().getCode() : null)
                .partnerName(reloaded.getPartner() != null ? reloaded.getPartner().getName() : null)
                .partnerPhone(reloaded.getPartner() != null ? reloaded.getPartner().getPhone() : null)
                .warehouseId(reloaded.getWarehouseId())
                .warehouseCode(reloaded.getWarehouse() != null ? reloaded.getWarehouse().getCode() : null)
                .warehouseName(reloaded.getWarehouse() != null ? reloaded.getWarehouse().getName() : null)
                .build();
        response.setSubTotalAmount(reloaded.getSubTotalAmount());
        response.setTaxAmount(reloaded.getTaxAmount());
        response.setTotalAmount(reloaded.getTotalAmount());
        response.setPaidAmount(reloaded.getPaidAmount());
        response.setPaymentStatus(reloaded.getPaymentStatus());
        response.setDeliveryAddress(reloaded.getDeliveryAddress());
        response.setNote((reloaded.getNote() != null ? reloaded.getNote() + "\n" : "") + "Phiếu xuất: " + export.getDocCode());
        response.setCreatedBy(reloaded.getCreatedBy());
        response.setCreatedByName(reloaded.getCreatedByUser() != null ? reloaded.getCreatedByUser().getFullName() : null);
        response.setCreatedAt(reloaded.getCreatedAt());
        response.setUpdatedAt(reloaded.getUpdatedAt());
        return response;
    }

    private String generateNextSoCode() {
        return codeGeneratorService.generateCode("sales_orders", "so_code", "SO", 4);
    }

    private BigDecimal normalizePaymentAmount(BigDecimal amount, BigDecimal total) {
        BigDecimal safeAmount = amount != null ? amount : total;
        if (safeAmount.compareTo(ZERO) < 0) {
            throw new BusinessException(SystemMessage.CHK_ERR_003.getMessage());
        }
        if (safeAmount.compareTo(total) > 0) {
            throw new BusinessException(SystemMessage.CHK_ERR_002.getMessage());
        }
        return safeAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private String resolvePaymentStatus(BigDecimal paidAmount, BigDecimal total) {
        if (paidAmount.compareTo(total) >= 0) {
            return "PAID";
        }
        if (paidAmount.compareTo(ZERO) > 0) {
            return "PARTIAL";
        }
        return "UNPAID";
    }

    private void ensureDebtAllowedForCustomer(Partner customer, BigDecimal paidAmount, BigDecimal total) {
        if (paidAmount.compareTo(total) >= 0) {
            return;
        }
        if (customer == null || WALK_IN_CUSTOMER_CODE.equals(customer.getCode())
                || trimToNull(customer.getPhone()) == null
                || trimToNull(customer.getName()) == null) {
            throw new BusinessException(SystemMessage.CHK_ERR_001.getMessage());
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
