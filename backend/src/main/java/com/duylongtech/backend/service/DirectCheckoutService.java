package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.DirectCheckoutRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    @Transactional(rollbackFor = Exception.class)
    public SalesOrderResponse directCheckout(DirectCheckoutRequest request, String actor) {
        validateRequest(request);

        User actorUser = userRepository.findByUsername(actor)
                .orElseThrow(() -> new BusinessException("Không tìm thấy người dùng hiện tại"));
        Partner customer = resolveCustomer(request);
        requireActiveCustomer(customer);
        LocalDate checkoutDate = request.getCheckoutDate() != null ? request.getCheckoutDate() : LocalDate.now();

        SalesOrder savedOrder = createPostedSalesOrder(request, customer, actorUser, checkoutDate);
        InventoryDocumentResponse export = createAndPostExport(request, savedOrder, customer, actorUser, checkoutDate);

        recordDirectCheckoutLedger(savedOrder, request.getPaymentAmount(), export.getDocCode());

        return toResponse(savedOrder, export);
    }

    private void validateRequest(DirectCheckoutRequest request) {
        if (request == null) {
            throw new BusinessException("Dữ liệu bán hàng trực tiếp không hợp lệ");
        }
        warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new BusinessException("Kho không tồn tại"));
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessException("Phải có ít nhất 1 dòng sản phẩm");
        }
        for (int i = 0; i < request.getLines().size(); i++) {
            DirectCheckoutRequest.Line line = request.getLines().get(i);
            int rowNumber = i + 1;
            productVariantRepository.findById(line.getVariantId())
                    .orElseThrow(() -> new BusinessException("Dòng " + rowNumber + ": Sản phẩm không tồn tại"));
            if (line.getQuantity() == null || line.getQuantity().compareTo(ZERO) <= 0) {
                throw new BusinessException("Dòng " + rowNumber + ": Số lượng phải lớn hơn 0");
            }
            if (line.getUnitPrice() == null || line.getUnitPrice().compareTo(ZERO) < 0) {
                throw new BusinessException("Dòng " + rowNumber + ": Đơn giá không được âm");
            }
        }
    }

    private Partner resolveCustomer(DirectCheckoutRequest request) {
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
            throw new BusinessException("Khách hàng không tồn tại");
        }
        if (!"APPROVED".equals(customer.getStatus())) {
            throw new BusinessException("Khách hàng đã ngừng hoạt động, không thể tạo đơn bán hàng");
        }
    }

    private Partner createWalkInCustomer() {
        Partner customer = Partner.builder()
                .code(WALK_IN_CUSTOMER_CODE)
                .type("INDIVIDUAL")
                .name("Khách vãng lai")
                .groupType("RETAIL")
                .status("APPROVED")
                .isCustomer(true)
                .isSupplier(false)
                .build();
        return partnerRepository.save(customer);
    }

    private Partner createCustomerFromCheckout(DirectCheckoutRequest request, String phone) {
        String customerName = trimToNull(request.getCustomerName());
        if (customerName == null) {
            customerName = "Khách " + phone;
        }
        Partner customer = Partner.builder()
                .code(codeGeneratorService.generateCode("PARTNERS", "code", "KH", 6))
                .type("INDIVIDUAL")
                .name(customerName)
                .phone(phone)
                .address(trimToNull(request.getCustomerAddress()))
                .groupType("RETAIL")
                .status("APPROVED")
                .isCustomer(true)
                .isSupplier(false)
                .build();
        return partnerRepository.save(customer);
    }

    private SalesOrder createPostedSalesOrder(DirectCheckoutRequest request, Partner customer, User actorUser,
            LocalDate checkoutDate) {
        String soCode = generateNextSoCode();
        BigDecimal subTotal = ZERO;
        BigDecimal taxAmount = ZERO;
        List<SalesOrderLine> lines = new ArrayList<>();

        for (DirectCheckoutRequest.Line reqLine : request.getLines()) {
            BigDecimal qty = reqLine.getQuantity();
            BigDecimal lineSubtotal = qty.multiply(reqLine.getUnitPrice()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal vatRate = reqLine.getVatRate() != null ? reqLine.getVatRate() : ZERO;
            BigDecimal lineVat = lineSubtotal.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

            subTotal = subTotal.add(lineSubtotal);
            taxAmount = taxAmount.add(lineVat);
            lines.add(SalesOrderLine.builder()
                    .salesOrderId(0L)
                    .variantId(reqLine.getVariantId())
                    .quantity(qty)
                    .unitPrice(reqLine.getUnitPrice())
                    .vatRate(vatRate)
                    .vatAmount(lineVat)
                    .warrantyMonths(reqLine.getWarrantyMonths())
                    .lineAmount(lineSubtotal)
                    .note(reqLine.getNote())
                    .build());
        }

        BigDecimal total = subTotal.add(taxAmount);
        BigDecimal paidAmount = normalizePaymentAmount(request.getPaymentAmount(), total);
        ensureDebtAllowedForCustomer(customer, paidAmount, total);

        SalesOrder order = SalesOrder.builder()
                .partnerId(customer.getId())
                .warehouseId(request.getWarehouseId())
                .soCode(soCode)
                .soDate(checkoutDate)
                .status("POSTED")
                .subTotalAmount(subTotal)
                .taxAmount(taxAmount)
                .totalAmount(total)
                .paidAmount(paidAmount)
                .paymentStatus(resolvePaymentStatus(paidAmount, total))
                .deliveryAddress(trimToNull(request.getCustomerAddress()))
                .note(trimToNull(request.getNote()))
                .createdBy(actorUser.getId())
                .build();

        order.setLines(new ArrayList<>());
        SalesOrder saved = salesOrderRepository.save(order);
        lines.forEach(line -> line.setSalesOrderId(saved.getId()));
        saved.getLines().addAll(lines);
        return salesOrderRepository.save(saved);
    }

    private InventoryDocumentResponse createAndPostExport(DirectCheckoutRequest request, SalesOrder order,
            Partner customer, User actorUser, LocalDate checkoutDate) {
        InventoryDocumentRequest exportReq = new InventoryDocumentRequest();
        exportReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_SALES);
        exportReq.setReferenceType("SALES_ORDER");
        exportReq.setReferenceId(order.getId());
        exportReq.setSalesOrderId(order.getId());
        exportReq.setPartnerId(customer.getId());
        exportReq.setWarehouseId(request.getWarehouseId());
        exportReq.setDocDate(checkoutDate);
        exportReq.setStatus("DRAFT");
        exportReq.setCreatedBy(actorUser.getId());
        exportReq.setRecipientName(customer.getName());
        exportReq.setRecipientAddress(trimToNull(request.getCustomerAddress()));
        exportReq.setSalespersonId(actorUser.getId());
        exportReq.setNote("Bán hàng trực tiếp từ đơn " + order.getSoCode());

        List<InventoryDocumentLineRequest> exportLines = new ArrayList<>();
        for (DirectCheckoutRequest.Line reqLine : request.getLines()) {
            InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
            line.setVariantId(reqLine.getVariantId());
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

        InventoryDocumentResponse created = inventoryDocumentService.createExport(exportReq);
        return inventoryDocumentService.postExport(created.getId());
    }

    private void recordDirectCheckoutLedger(SalesOrder order, BigDecimal requestedPayment, String exportCode) {
        partnerLedgerService.recordLedger(
                order.getPartnerId(),
                "SALES_ORDER",
                order.getId(),
                order.getSoCode(),
                order.getTotalAmount(),
                ZERO,
                "Ghi nhận doanh thu bán hàng trực tiếp " + order.getSoCode()
        );

        BigDecimal paidAmount = normalizePaymentAmount(requestedPayment, order.getTotalAmount());
        if (paidAmount.compareTo(ZERO) > 0) {
            partnerLedgerService.recordLedger(
                    order.getPartnerId(),
                    "PAYMENT_RECEIPT",
                    order.getId(),
                    order.getSoCode(),
                    ZERO,
                    paidAmount,
                    "Thu tiền bán hàng trực tiếp " + order.getSoCode() + " / " + exportCode
            );
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
        String prefix = "SO";
        List<String> existing = salesOrderRepository.findCodesByPrefix(prefix + "%");
        long max = 0;
        for (String code : existing) {
            if (code != null && code.length() > prefix.length()) {
                try {
                    long val = Long.parseLong(code.substring(prefix.length()));
                    if (val > max) {
                        max = val;
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }
        long next = max + 1;
        String candidate = String.format("%s%04d", prefix, next);
        while (salesOrderRepository.existsBySoCode(candidate)) {
            candidate = String.format("%s%04d", prefix, ++next);
        }
        return candidate;
    }

    private BigDecimal normalizePaymentAmount(BigDecimal amount, BigDecimal total) {
        BigDecimal safeAmount = amount != null ? amount : total;
        if (safeAmount.compareTo(ZERO) < 0) {
            throw new BusinessException("Số tiền thanh toán không được âm");
        }
        if (safeAmount.compareTo(total) > 0) {
            throw new BusinessException("Số tiền thanh toán vượt quá tổng đơn hàng");
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
            throw new BusinessException("Khách nợ phải có đầy đủ thông tin khách hàng, không được dùng khách vãng lai");
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
