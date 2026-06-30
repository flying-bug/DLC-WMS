package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.response.AssemblyBomLineResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderLineResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssemblyOrderService {
    private static final String ASSEMBLY = "ASSEMBLY";
    private static final String DISASSEMBLY = "DISASSEMBLY";
    private static final String DEFAULT_STATUS = "DRAFT";
    private static final Set<String> VALID_TYPES = Set.of(ASSEMBLY, DISASSEMBLY);
    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "SUBMITTED");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final AssemblyBomRepository assemblyBomRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional(readOnly = true)
    public List<AssemblyBomResponse> getApprovedBoms() {
        return assemblyBomRepository.findAllWithLines("APPROVED").stream()
                .map(this::toBomResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssemblyOrderResponse> getAssemblyOrders(String keyword, String orderType, String status,
            Long warehouseId, LocalDate fromDate, LocalDate toDate) {
        String normalizedType = normalizeOptionalType(orderType);
        String normalizedStatus = normalizeOptionalStatus(status);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BusinessException("Tu ngay khong duoc lon hon den ngay");
        }
        return assemblyOrderRepository.search(trimToNull(keyword), normalizedType, normalizedStatus, warehouseId, fromDate, toDate)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssemblyOrderResponse getAssemblyOrderById(Long id) {
        return toOrderResponse(findOrderOrThrow(id));
    }

    @Transactional
    public AssemblyOrderResponse createAssemblyOrder(AssemblyOrderRequest request) {
        return createOrder(request, ASSEMBLY);
    }

    @Transactional
    public AssemblyOrderResponse createDisassemblyOrder(AssemblyOrderRequest request) {
        return createOrder(request, DISASSEMBLY);
    }

    @Transactional
    public AssemblyOrderResponse updateAssemblyOrder(Long id, AssemblyOrderRequest request) {
        validateRequest(request, false);
        AssemblyOrder order = findOrderOrThrow(id);
        ensureEditable(order);

        AssemblyBom bom = findBomOrThrow(request.getBomId());
        String requestedCode = trimToNull(request.getOrderCode());
        if (requestedCode != null && !requestedCode.equals(order.getOrderCode())) {
            if (assemblyOrderRepository.existsByOrderCodeAndIdNot(requestedCode, id)) {
                throw new BusinessException("Ma lenh lap rap/thao do da ton tai");
            }
            order.setOrderCode(requestedCode);
        }

        order.setBom(bom);
        order.setTargetVariant(resolveTargetVariant(bom));
        order.setWarehouseId(request.getWarehouseId());
        order.setQuantity(request.getQuantity());
        order.setExecutionDate(request.getExecutionDate());
        order.setStatus(normalizeEditableStatus(request.getStatus(), order.getStatus()));
        order.setNote(request.getNote());
        order.setUpdatedAt(LocalDateTime.now());
        rebuildLines(order, bom, request.getQuantity());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    private AssemblyOrderResponse createOrder(AssemblyOrderRequest request, String orderType) {
        validateRequest(request, true);
        AssemblyBom bom = findBomOrThrow(request.getBomId());
        String orderCode = resolveCreateOrderCode(request.getOrderCode(), orderType);

        AssemblyOrder order = AssemblyOrder.builder()
                .orderCode(orderCode)
                .orderType(orderType)
                .bom(bom)
                .targetVariant(resolveTargetVariant(bom))
                .warehouseId(request.getWarehouseId())
                .quantity(request.getQuantity())
                .status(normalizeEditableStatus(request.getStatus(), DEFAULT_STATUS))
                .executionDate(request.getExecutionDate())
                .note(request.getNote())
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        rebuildLines(order, bom, request.getQuantity());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    private void validateRequest(AssemblyOrderRequest request, boolean create) {
        if (request == null) {
            throw new BusinessException("Du lieu lenh lap rap/thao do la bat buoc");
        }
        if (request.getBomId() == null) {
            throw new BusinessException("bomId la bat buoc");
        }
        if (request.getWarehouseId() == null) {
            throw new BusinessException("warehouseId la bat buoc");
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(ZERO) <= 0) {
            throw new BusinessException("quantity phai lon hon 0");
        }
        if (request.getExecutionDate() == null) {
            throw new BusinessException("executionDate la bat buoc");
        }
        if (create && request.getCreatedBy() == null) {
            throw new BusinessException("createdBy la bat buoc");
        }
    }

    private AssemblyBom findBomOrThrow(Long bomId) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(bomId)
                .orElseThrow(() -> new BusinessException("Khong tim thay dinh muc vat tu"));
        if (!"APPROVED".equalsIgnoreCase(bom.getStatus())) {
            throw new BusinessException("Chi duoc tao lenh tu BOM da duyet");
        }
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            throw new BusinessException("BOM chua co linh kien");
        }
        return bom;
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID lenh la bat buoc");
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Khong tim thay lenh lap rap/thao do"));
    }

    private ProductVariant resolveTargetVariant(AssemblyBom bom) {
        Product product = bom.getProduct();
        if (product == null) {
            throw new BusinessException("San pham thanh pham cua BOM chua co SKU");
        }
        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(product.getId());
        if (variants.isEmpty()) {
            throw new BusinessException("San pham thanh pham cua BOM chua co SKU");
        }
        return variants.stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getActive()))
                .findFirst()
                .orElse(variants.get(0));
    }

    private void rebuildLines(AssemblyOrder order, AssemblyBom bom, BigDecimal orderQuantity) {
        order.getLines().clear();
        for (AssemblyBomLine bomLine : bom.getLines()) {
            BigDecimal required = bomLine.getQuantity().multiply(orderQuantity);
            AssemblyOrderLine line = AssemblyOrderLine.builder()
                    .assemblyOrder(order)
                    .componentVariant(bomLine.getComponentVariant())
                    .quantityRequired(required)
                    .quantityActual(required)
                    .unitCost(ZERO)
                    .note(bomLine.getNote())
                    .build();
            order.getLines().add(line);
        }
    }

    private void ensureEditable(AssemblyOrder order) {
        String status = normalizeStatus(order.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException("Chi co the cap nhat lenh DRAFT hoac SUBMITTED");
        }
    }

    private String resolveCreateOrderCode(String requestedCode, String orderType) {
        String orderCode = trimToNull(requestedCode);
        if (orderCode == null) {
            orderCode = (ASSEMBLY.equals(orderType) ? "ASM-" : "DIS-") + System.currentTimeMillis();
        }
        if (assemblyOrderRepository.existsByOrderCode(orderCode)) {
            throw new BusinessException("Ma lenh lap rap/thao do da ton tai");
        }
        return orderCode;
    }

    private String normalizeOptionalType(String orderType) {
        String normalized = trimToNull(orderType);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_TYPES.contains(normalized)) {
            throw new BusinessException("Loai lenh khong hop le");
        }
        return normalized;
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = trimToNull(status);
        return normalized == null ? null : normalizeStatus(normalized, null);
    }

    private String normalizeEditableStatus(String status, String fallback) {
        String normalized = normalizeStatus(status, fallback);
        if (!EDITABLE_STATUSES.contains(normalized)) {
            throw new BusinessException("Trang thai lenh phai la DRAFT hoac SUBMITTED");
        }
        return normalized;
    }

    private String normalizeStatus(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new BusinessException("Trang thai lenh khong hop le");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private AssemblyBomResponse toBomResponse(AssemblyBom bom) {
        Product product = bom.getProduct();
        return AssemblyBomResponse.builder()
                .id(bom.getId())
                .bomCode(bom.getBomCode())
                .bomName(bom.getBomName())
                .versionNo(bom.getVersionNo())
                .status(bom.getStatus())
                .productId(product != null ? product.getId() : null)
                .productCode(product != null ? product.getProductCode() : null)
                .productName(product != null ? product.getProductName() : null)
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .lines(bom.getLines() == null ? List.of() : bom.getLines().stream().map(this::toBomLineResponse).toList())
                .build();
    }

    private AssemblyBomLineResponse toBomLineResponse(AssemblyBomLine line) {
        ProductVariant variant = line.getComponentVariant();
        Product product = variant != null ? variant.getProduct() : null;
        return AssemblyBomLineResponse.builder()
                .id(line.getId())
                .componentVariantId(variant != null ? variant.getId() : null)
                .componentSku(variant != null ? variant.getSku() : null)
                .componentName(variantName(variant))
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .quantity(line.getQuantity())
                .note(line.getNote())
                .build();
    }

    private AssemblyOrderResponse toOrderResponse(AssemblyOrder order) {
        AssemblyBom bom = order.getBom();
        ProductVariant target = order.getTargetVariant();
        return AssemblyOrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .orderType(order.getOrderType())
                .bomId(bom != null ? bom.getId() : null)
                .bomCode(bom != null ? bom.getBomCode() : null)
                .bomName(bom != null ? bom.getBomName() : null)
                .targetVariantId(target != null ? target.getId() : null)
                .targetSku(target != null ? target.getSku() : null)
                .targetName(variantName(target))
                .warehouseId(order.getWarehouseId())
                .quantity(order.getQuantity())
                .status(order.getStatus())
                .executionDate(order.getExecutionDate())
                .note(order.getNote())
                .createdBy(order.getCreatedBy())
                .approvedBy(order.getApprovedBy())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .lines(order.getLines() == null ? List.of() : order.getLines().stream().map(this::toOrderLineResponse).toList())
                .build();
    }

    private AssemblyOrderLineResponse toOrderLineResponse(AssemblyOrderLine line) {
        ProductVariant variant = line.getComponentVariant();
        Product product = variant != null ? variant.getProduct() : null;
        return AssemblyOrderLineResponse.builder()
                .id(line.getId())
                .componentVariantId(variant != null ? variant.getId() : null)
                .componentSku(variant != null ? variant.getSku() : null)
                .componentName(variantName(variant))
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .quantityRequired(line.getQuantityRequired())
                .quantityActual(line.getQuantityActual())
                .unitCost(line.getUnitCost())
                .note(line.getNote())
                .build();
    }

    private String variantName(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        Product product = variant.getProduct();
        if (product != null && product.getProductName() != null) {
            return product.getProductName() + " - " + variant.getVariantName();
        }
        return variant.getVariantName();
    }
}
