package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * BOM CRUD + BOM approval workflow. Split out of the former AssemblyOrderService
 * (see AssemblyOrderService / AssemblyOrderWorkflowService / AssemblyExecutionService
 * for the order CRUD, order workflow, and execution/serial-tracking counterparts).
 */
@Service
@RequiredArgsConstructor
public class AssemblyBomService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_BOM_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.APPROVED.name(), com.duylongtech.backend.enums.EntityStatus.INACTIVE.name());

    private final AssemblyBomRepository assemblyBomRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final AppNotificationService appNotificationService;
    private final AssemblyOrderMapper assemblyOrderMapper;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AssemblyBomResponse> getBoms(String status, Long productId) {
        String normalizedStatus = normalizeOptionalBomStatus(status);
        return assemblyBomRepository.findAllWithLines(normalizedStatus, productId).stream()
                .map(this::toBomResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssemblyBomResponse getBomById(Long id) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        return toBomResponse(bom);
    }

    @Transactional
    public AssemblyBomResponse createBom(AssemblyBomRequest request) {
        validateBomRequest(request, true);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy sản phẩm thành phẩm"));

        // bomCode embeds a version number derived from existing BOMs for this product;
        // re-reading that list each attempt means a retry after a concurrent create
        // naturally computes the next version instead of colliding again.
        org.springframework.dao.DataIntegrityViolationException lastConflict = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                List<AssemblyBom> existingBoms = assemblyBomRepository.findAllWithLines(null, product.getId());
                BigDecimal nextVersion = BigDecimal.ONE;

                for (AssemblyBom existingBom : existingBoms) {
                    if (existingBom.getVersionNo() != null && existingBom.getVersionNo().compareTo(nextVersion) >= 0) {
                        nextVersion = existingBom.getVersionNo().add(BigDecimal.ONE);
                    }
                    if (isSameComponents(existingBom.getLines(), request.getLines())) {
                        throw new BusinessException(String.format(SystemMessage.ASM_ERR_039.getMessage(), existingBom.getBomCode()));
                    }
                }

                String productCode = trimToNull(product.getProductCode()) != null ? product.getProductCode().trim() : String.valueOf(product.getId());
                String bomCode = "CH-" + productCode + "-v" + nextVersion.stripTrailingZeros().toPlainString();

                AssemblyBom bom = new AssemblyBom();
                bom.initBom(product, bomCode, trimToNull(request.getBomName()) != null ? request.getBomName().trim() : product.getProductName(), nextVersion, null);
                bom.forceUpdateStatus(normalizeBomStatus(request.getStatus(), DocumentStatus.APPROVED.name()));
                rebuildBomLines(bom, request.getLines());
                return toBomResponse(assemblyBomRepository.saveAndFlush(bom));
            } catch (org.springframework.dao.DataIntegrityViolationException conflict) {
                lastConflict = conflict;
            }
        }
        throw lastConflict;
    }

    @Transactional
    public AssemblyBomResponse updateBom(Long id, AssemblyBomRequest request) {
        validateBomRequest(request, false);
        if (assemblyOrderRepository.existsByBomIdAndStatusIn(id, List.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.APPROVED.name()))) {
            throw new BusinessException(SystemMessage.ASM_ORDER_LOCKED.getMessage());
        }
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy sản phẩm thành phẩm"));

        List<AssemblyBom> existingBoms = assemblyBomRepository.findAllWithLines(null, product.getId());
        for (AssemblyBom existingBom : existingBoms) {
            if (!existingBom.getId().equals(id) && isSameComponents(existingBom.getLines(), request.getLines())) {
                throw new BusinessException(String.format(SystemMessage.ASM_ERR_039.getMessage(), existingBom.getBomCode()));
            }
        }

        String bomCode = trimToNull(request.getBomCode());
        if (bomCode != null && !bomCode.equals(bom.getBomCode())) {
            if (assemblyBomRepository.existsByBomCodeAndIdNot(bomCode, id)) {
                throw new BusinessException(SystemMessage.ASM_ERR_012.getMessage());
            }
        }
        bom.updateDetails(product, null, trimToNull(request.getBomName()) != null ? request.getBomName().trim() : product.getProductName(), request.getVersionNo() != null ? request.getVersionNo() : bom.getVersionNo());
        rebuildBomLines(bom, request.getLines());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    @Transactional
    public AssemblyBomResponse submitBom(Long id, Long actorId) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        requireState(bom.getStatus(), DocumentStatus.DRAFT.name(), DocumentStatus.REJECTED.name());
        validateBomEntity(bom);
        bom.submitForApproval(actorId);
        
        String technicianName = userRepository.findById(actorId)
                .map(User::getFullName)
                .orElse("Một kỹ thuật viên");
                
        notifyRole("ROLE_ACCOUNTANT", "BOM chờ duyệt: " + bom.getBomCode(),
                "Kỹ thuật viên " + technicianName + " vừa tạo BOM " + bom.getBomCode() + " cần duyệt.", "ASSEMBLY_BOM", bom.getId(),
                "/assembly-boms/" + bom.getId());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    @Transactional
    public AssemblyBomResponse approveBom(Long id, Long actorId) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        requireState(bom.getStatus(), DocumentStatus.PENDING_APPROVAL.name());
        validateBomEntity(bom);
        bom.approve(actorId);
        notifyUser(bom.getSubmittedBy(), "BOM đã được duyệt: " + bom.getBomCode(),
                "Kế toán đã duyệt BOM " + bom.getBomCode() + ".", "ASSEMBLY_BOM", bom.getId(),
                "/assembly-boms/" + bom.getId());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    @Transactional
    public AssemblyBomResponse rejectBom(Long id, Long actorId, String reason) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        requireState(bom.getStatus(), DocumentStatus.PENDING_APPROVAL.name());
        String normalizedReason = requireReason(reason);
        bom.reject(actorId, normalizedReason);
        notifyUser(bom.getSubmittedBy(), "BOM bị từ chối: " + bom.getBomCode(), normalizedReason,
                "ASSEMBLY_BOM", bom.getId(), "/assembly-boms/" + bom.getId());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    /**
     * Load an APPROVED BOM with lines, or throw. Used by AssemblyOrderService when
     * creating/updating an order against a BOM.
     */
    public AssemblyBom getApprovedBomOrThrow(Long bomId) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(bomId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        if (!DocumentStatus.APPROVED.name().equalsIgnoreCase(bom.getStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_018.getMessage());
        }
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            throw new BusinessException(SystemMessage.ASM_ERR_017.getMessage());
        }
        return bom;
    }

    private void validateBomRequest(AssemblyBomRequest request, boolean create) {
        if (request == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_025.getMessage());
        }
        if (request.getProductId() == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_024.getMessage());
        }
        if (create && trimToNull(request.getBomCode()) != null && assemblyBomRepository.existsByBomCode(request.getBomCode().trim())) {
            throw new BusinessException(SystemMessage.ASM_ERR_012.getMessage());
        }
        if (request.getVersionNo() != null && request.getVersionNo().compareTo(ZERO) <= 0) {
            throw new BusinessException(SystemMessage.ASM_ERR_023.getMessage());
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessException(SystemMessage.ASM_ERR_022.getMessage());
        }

        boolean isApproved = DocumentStatus.APPROVED.name().equals(request.getStatus());

        for (int i = 0; i < request.getLines().size(); i++) {
            AssemblyBomLineRequest line = request.getLines().get(i);

            if (isApproved) {
                if (line == null || line.getComponentVariantId() == null) {
                    throw new BusinessException(String.format(SystemMessage.ASM_ERR_021.getMessage(), (i + 1)));
                }
                if (line.getQuantity() == null || line.getQuantity().compareTo(ZERO) <= 0) {
                    throw new BusinessException(String.format(SystemMessage.ASM_ERR_020.getMessage(), (i + 1)));
                }
                try {
                    line.getQuantity().stripTrailingZeros().intValueExact();
                } catch (ArithmeticException ex) {
                    throw new BusinessException(String.format(SystemMessage.ASM_ERR_019.getMessage(), (i + 1)));
                }
            }
        }
    }

    private void rebuildBomLines(AssemblyBom bom, List<AssemblyBomLineRequest> lines) {
        bom.getLines().clear();
        for (AssemblyBomLineRequest requestLine : lines) {
            ProductVariant component = productVariantRepository.findById(requestLine.getComponentVariantId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy SKU linh kiện " + requestLine.getComponentVariantId()));
            AssemblyBomLine line = new AssemblyBomLine();
            line.initLine(component, requestLine.getQuantity(), requestLine.getComponentRole(), requestLine.getNote(), requestLine.getUnitPrice() != null ? requestLine.getUnitPrice() : component.getSalePrice(), requestLine.getComponentSku() != null ? requestLine.getComponentSku() : component.getSku(), requestLine.getComponentName() != null ? requestLine.getComponentName() : variantName(component), requestLine.getWarrantyMonths() != null ? requestLine.getWarrantyMonths() : ((component.getWarrantyMonths() == null || component.getWarrantyMonths() <= 0) && component.getProduct() != null ? component.getProduct().getWarrantyPeriodMonths() : component.getWarrantyMonths()));
            bom.addLine(line);
        }
    }

    private boolean isSameComponents(List<AssemblyBomLine> existingLines, List<AssemblyBomLineRequest> requestLines) {
        if (existingLines == null || requestLines == null) return false;

        java.util.Map<Long, BigDecimal> reqMap = requestLines.stream()
                .filter(r -> r.getComponentVariantId() != null)
                .collect(Collectors.toMap(AssemblyBomLineRequest::getComponentVariantId,
                    r -> r.getQuantity() != null ? r.getQuantity() : BigDecimal.ONE,
                    BigDecimal::add));

        java.util.Map<Long, BigDecimal> existMap = existingLines.stream()
                .filter(l -> l.getComponentVariant() != null && l.getComponentVariant().getId() != null)
                .collect(Collectors.toMap(
                    l -> l.getComponentVariant().getId(),
                    l -> l.getQuantity() != null ? l.getQuantity() : BigDecimal.ONE,
                    BigDecimal::add));

        if (reqMap.size() != existMap.size()) return false;

        for (java.util.Map.Entry<Long, BigDecimal> entry : reqMap.entrySet()) {
            BigDecimal existQty = existMap.get(entry.getKey());
            if (existQty == null || existQty.compareTo(entry.getValue()) != 0) {
                return false;
            }
        }
        return true;
    }

    private void validateBomEntity(AssemblyBom bom) {
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            throw new BusinessException(SystemMessage.ASM_ERR_022.getMessage());
        }
        for (int i = 0; i < bom.getLines().size(); i++) {
            AssemblyBomLine line = bom.getLines().get(i);
            if (line.getComponentVariant() == null || line.getQuantity() == null || line.getQuantity().compareTo(ZERO) <= 0) {
                throw new BusinessException(String.format(SystemMessage.ASM_ERR_020.getMessage(), i + 1));
            }
        }
    }

    private String normalizeBomStatus(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_BOM_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.ASM_ERR_011.getMessage());
        }
        return normalized;
    }

    private String normalizeOptionalBomStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_BOM_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.ASM_ERR_011.getMessage());
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
        AssemblyBomResponse response = assemblyOrderMapper.toBomResponse(bom);
        if (bom.getLines() != null) {
            response.setLines(bom.getLines().stream().map(this::toBomLineResponse).toList());
        } else {
            response.setLines(List.of());
        }
        return response;
    }

    private AssemblyBomLineResponse toBomLineResponse(AssemblyBomLine line) {
        AssemblyBomLineResponse response = assemblyOrderMapper.toBomLineResponse(line);
        ProductVariant variant = line.getComponentVariant();
        Product product = variant != null ? variant.getProduct() : null;

        if (response.getComponentSku() == null && variant != null) {
            response.setComponentSku(variant.getSku());
        }
        if (response.getComponentName() == null) {
            response.setComponentName(variantName(variant));
        }
        if (response.getUnitName() == null && product != null && product.getUnit() != null) {
            response.setUnitName(product.getUnit().getName());
        }
        if (response.getUnitPrice() == null && variant != null) {
            response.setUnitPrice(variant.getSalePrice());
        }
        if (response.getWarrantyMonths() == null && variant != null) {
            response.setWarrantyMonths((variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null ? product.getWarrantyPeriodMonths() : variant.getWarrantyMonths());
        }
        return response;
    }

    private String variantName(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        Product product = variant.getProduct();
        String prodName = product != null ? product.getProductName() : null;
        String varName = variant.getVariantName();

        if (prodName != null) {
            if (varName == null || varName.isEmpty() || prodName.equals(varName)) {
                return prodName;
            }
            return prodName + " - " + varName;
        }
        return varName;
    }

    private void requireState(String actual, String... allowed) {
        if (!Set.of(allowed).contains(actual)) {
            throw new BusinessException(SystemMessage.ASM_ERR_040.getMessage());
        }
    }

    private String requireReason(String reason) {
        String normalized = trimToNull(reason);
        if (normalized == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_041.getMessage());
        }
        return normalized;
    }

    private void notifyRole(String role, String title, String message, String type, Long id, String link) {
        try {
            appNotificationService.createNotification(role, null, title, message, type, type, id, link);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }

    private void notifyUser(Long userId, String title, String message, String type, Long id, String link) {
        if (userId == null) {
            return;
        }
        try {
            appNotificationService.createNotification(null, userId, title, message, type, type, id, link);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }
}
