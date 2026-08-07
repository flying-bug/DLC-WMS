package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AssemblyBomLineRequest;
import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderLineRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderSerialRequest;
import com.duylongtech.backend.dto.request.AssemblyExecutionRequest;
import com.duylongtech.backend.dto.response.AssemblyBomLineResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderLineResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.AssemblyOrderSerialRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssemblyOrderService {
    private static final String ASSEMBLY = "ASSEMBLY";
    private static final String DISASSEMBLY = "DISASSEMBLY";
    private static final String DEFAULT_STATUS = "DRAFT";
    private static final Set<String> VALID_TYPES = Set.of(ASSEMBLY, DISASSEMBLY);
    private static final Set<String> VALID_BOM_STATUSES = Set.of("DRAFT", "APPROVED", "INACTIVE");
    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "APPROVED");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final AssemblyBomRepository assemblyBomRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    private final com.duylongtech.backend.repository.UserRepository userRepository;

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
                
        List<AssemblyBom> existingBoms = assemblyBomRepository.findAllWithLines(null, product.getId());
        BigDecimal nextVersion = BigDecimal.ONE;
        
        for (AssemblyBom existingBom : existingBoms) {
            if (existingBom.getVersionNo() != null && existingBom.getVersionNo().compareTo(nextVersion) >= 0) {
                nextVersion = existingBom.getVersionNo().add(BigDecimal.ONE);
            }
            if (isSameComponents(existingBom.getLines(), request.getLines())) {
                throw new BusinessException("Cấu hình này trùng với cấu hình " + existingBom.getBomCode());
            }
        }
        
        String productCode = trimToNull(product.getProductCode()) != null ? product.getProductCode().trim() : String.valueOf(product.getId());
        String bomCode = "CH-" + productCode + "-v" + nextVersion.stripTrailingZeros().toPlainString();
        
        AssemblyBom bom = AssemblyBom.builder()
                .product(product)
                .bomCode(bomCode)
                .bomName(trimToNull(request.getBomName()) != null ? request.getBomName().trim() : product.getProductName())
                .versionNo(nextVersion)
                .status(normalizeBomStatus(request.getStatus(), "APPROVED"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        rebuildBomLines(bom, request.getLines());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    @Transactional
    public AssemblyBomResponse updateBom(Long id, AssemblyBomRequest request) {
        validateBomRequest(request, false);
        if (assemblyOrderRepository.existsByBomIdAndStatusIn(id, List.of("DRAFT", "SUBMITTED", "APPROVED"))) {
            throw new BusinessException(com.duylongtech.backend.constant.SystemMessage.ASM_ORDER_LOCKED.getMessage());
        }
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy sản phẩm thành phẩm"));
                
        List<AssemblyBom> existingBoms = assemblyBomRepository.findAllWithLines(null, product.getId());
        for (AssemblyBom existingBom : existingBoms) {
            if (!existingBom.getId().equals(id) && isSameComponents(existingBom.getLines(), request.getLines())) {
                throw new BusinessException("Cấu hình này trùng với cấu hình " + existingBom.getBomCode());
            }
        }
        
        String bomCode = trimToNull(request.getBomCode());
        if (bomCode != null && !bomCode.equals(bom.getBomCode())) {
            if (assemblyBomRepository.existsByBomCodeAndIdNot(bomCode, id)) {
                throw new BusinessException("Mã cấu hình đã tồn tại");
            }
            bom.setBomCode(bomCode);
        }
        bom.setProduct(product);
        bom.setBomName(trimToNull(request.getBomName()) != null ? request.getBomName().trim() : product.getProductName());
        bom.setVersionNo(request.getVersionNo() != null ? request.getVersionNo() : bom.getVersionNo());
        bom.setStatus(normalizeBomStatus(request.getStatus(), bom.getStatus()));
        bom.setUpdatedAt(LocalDateTime.now());
        rebuildBomLines(bom, request.getLines());
        return toBomResponse(assemblyBomRepository.save(bom));
    }

    @Transactional(readOnly = true)
    public List<AssemblyOrderResponse> getAssemblyOrders(String keyword, String orderType, String status,
            Long warehouseId, LocalDate fromDate, LocalDate toDate) {
        String normalizedType = normalizeOptionalType(orderType);
        String normalizedStatus = normalizeOptionalStatus(status);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BusinessException("Từ ngày không được lớn hơn đến ngày");
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
                throw new BusinessException("Mã lệnh lắp ráp/tháo dỡ đã tồn tại");
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
        rebuildLines(order, bom, request);
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse updateOrderStatus(Long id, String newStatus) {
        AssemblyOrder order = findOrderOrThrow(id);
        String status = normalizeStatus(newStatus, order.getStatus());
        
        if ("CANCELLED".equals(status)) {
            if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", id)) {
                throw new BusinessException(com.duylongtech.backend.constant.SystemMessage.ASM_HAS_POSTED_DOCS.getMessage());
            }
        }
        
        if ("SUBMITTED".equals(status)) {
            List<InventoryDocument> exports = inventoryDocumentRepository.searchExports(null, null, null, null, null, null, "ASSEMBLY_ORDER", id);
            List<InventoryDocument> imports = inventoryDocumentRepository.searchImports(null, null, null, null, null, null, "ASSEMBLY_ORDER", id);
            
            boolean anyDraft = exports.stream().anyMatch(d -> "DRAFT".equals(d.getStatus())) ||
                               imports.stream().anyMatch(d -> "DRAFT".equals(d.getStatus()));
                               
            if (anyDraft) {
                throw new BusinessException("Các phiếu xuất và nhập kho liên kết đang lưu nháp phải được ghi sổ hoặc hủy bỏ.");
            }
            
            BigDecimal requiredComponents = order.getLines().stream()
                .map(AssemblyOrderLine::getQuantityRequired)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal requiredTarget = order.getQuantity();

            Set<Long> componentIds = order.getLines().stream()
                .map(l -> l.getComponentVariant().getId())
                .collect(java.util.stream.Collectors.toSet());
            Long targetId = order.getTargetVariant().getId();

            BigDecimal exportedComponents = exports.stream()
                .filter(d -> "POSTED".equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && componentIds.contains(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityOut)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal exportedTarget = exports.stream()
                .filter(d -> "POSTED".equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && targetId.equals(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityOut)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal importedComponents = imports.stream()
                .filter(d -> "POSTED".equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && componentIds.contains(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityIn)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal importedTarget = imports.stream()
                .filter(d -> "POSTED".equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && targetId.equals(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityIn)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (ASSEMBLY.equals(order.getOrderType())) {
                if (exportedComponents.compareTo(requiredComponents) < 0 || importedTarget.compareTo(requiredTarget) < 0) {
                    throw new BusinessException("Chưa hoàn tất xuất/nhập đủ số lượng yêu cầu để hoàn thành lệnh.");
                }
                
                // Validate Serial Mapping if Target tracks serial
                if (order.getTargetVariant().getProduct().getTrackSerial()) {
                    List<AssemblyOrderSerial> serials = assemblyOrderSerialRepository.findByAssemblyOrderId(id);
                    Set<String> mappedTargetSerials = serials.stream().map(AssemblyOrderSerial::getTargetSerial).collect(Collectors.toSet());
                    
                    // We expect the number of unique target serials mapped to be at least requiredTarget
                    if (mappedTargetSerials.size() < requiredTarget.intValue()) {
                        throw new BusinessException("Chưa gắn đủ Serial thành phẩm. Vui lòng vào mục Cấu hình Serial để hoàn tất.");
                    }
                    
                    // Also check if component mapping is full?
                    // We can assume if the user mapped the target, they mapped the components, but we could be stricter.
                    // For now, checking the target serial count is a good start.
                }
            } else {
                if (exportedTarget.compareTo(requiredTarget) < 0 || importedComponents.compareTo(requiredComponents) < 0) {
                    throw new BusinessException("Chưa hoàn tất xuất/nhập đủ số lượng yêu cầu để hoàn thành lệnh.");
                }
            }
        }

        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse updateNote(Long id, AssemblyOrderRequest request) {
        AssemblyOrder order = findOrderOrThrow(id);
        if ("SUBMITTED".equals(order.getStatus())) {
            throw new BusinessException("Lệnh đã hoàn thành, không thể sửa ghi chú");
        }
        order.setNote(request.getNote());
        order.setUpdatedAt(LocalDateTime.now());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public void generateInventoryDocument(Long id, com.duylongtech.backend.dto.request.GenerateInventoryDocumentRequest request, String actor) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (!"SUBMITTED".equals(order.getStatus()) && !"APPROVED".equals(order.getStatus())) {
            throw new BusinessException("Chỉ có thể tạo phiếu kho cho lệnh đã hoàn thành hoặc được duyệt");
        }
        
        com.duylongtech.backend.dto.request.InventoryDocumentRequest docReq = new com.duylongtech.backend.dto.request.InventoryDocumentRequest();
        docReq.setWarehouseId(order.getWarehouseId());
        docReq.setDocDate(LocalDate.now());
        docReq.setReferenceType("ASSEMBLY_ORDER");
        docReq.setReferenceId(order.getId());
        docReq.setIssuePurpose(order.getOrderType().equals(ASSEMBLY) ? "Lắp ráp" : "Tháo dỡ");
        docReq.setCreatedBy(order.getCreatedBy());
        docReq.setStatus("DRAFT");
        
        List<com.duylongtech.backend.dto.request.InventoryDocumentLineRequest> lines = request.getLines().stream().map(line -> {
            com.duylongtech.backend.dto.request.InventoryDocumentLineRequest lr = new com.duylongtech.backend.dto.request.InventoryDocumentLineRequest();
            lr.setVariantId(line.getVariantId());
            if ("GOODS_ISSUE".equals(request.getDocumentType())) {
                lr.setQuantityOut(line.getQuantity());
            } else {
                lr.setQuantityIn(line.getQuantity());
            }
            lr.setUnitCost(BigDecimal.ZERO);
            lr.setUnitPrice(BigDecimal.ZERO);
            lr.setSerialNumbers(line.getSerialNumbers());
            return lr;
        }).toList();
        docReq.setLines(lines);
        
        if ("GOODS_ISSUE".equals(request.getDocumentType())) {
            inventoryDocumentService.createExport(docReq);
        } else if ("GOODS_RECEIPT".equals(request.getDocumentType())) {
            inventoryDocumentService.createImport(docReq);
        } else {
            throw new BusinessException("Loại phiếu không hợp lệ");
        }
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
        rebuildLines(order, bom, request);
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    private void validateRequest(AssemblyOrderRequest request, boolean create) {
        if (request == null) {
            throw new BusinessException("Dữ liệu lệnh lắp ráp/tháo dỡ là bắt buộc");
        }
        if (request.getBomId() == null) {
            throw new BusinessException("Cấu hình là bắt buộc");
        }
        if (request.getWarehouseId() == null) {
            throw new BusinessException("Kho là bắt buộc");
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(ZERO) <= 0) {
            throw new BusinessException("Số lượng phải lớn hơn 0");
        }
        if (request.getExecutionDate() == null) {
            throw new BusinessException("Ngày thực hiện là bắt buộc");
        }
        if (create && request.getCreatedBy() == null) {
            throw new BusinessException("Người tạo là bắt buộc");
        }
    }

    private void validateBomRequest(AssemblyBomRequest request, boolean create) {
        if (request == null) {
            throw new BusinessException("Dữ liệu Cấu hình là bắt buộc");
        }
        if (request.getProductId() == null) {
            throw new BusinessException("Sản phẩm thành phẩm là bắt buộc");
        }
        if (create && trimToNull(request.getBomCode()) != null && assemblyBomRepository.existsByBomCode(request.getBomCode().trim())) {
            throw new BusinessException("Mã cấu hình đã tồn tại");
        }
        if (request.getVersionNo() != null && request.getVersionNo().compareTo(ZERO) <= 0) {
            throw new BusinessException("Phiên bản cấu hình phải lớn hơn 0");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessException("Cấu hình phải có ít nhất một linh kiện");
        }

        boolean isApproved = "APPROVED".equals(request.getStatus());

        for (int i = 0; i < request.getLines().size(); i++) {
            AssemblyBomLineRequest line = request.getLines().get(i);
            
            if (isApproved) {
                if (line == null || line.getComponentVariantId() == null) {
                    throw new BusinessException("Linh kiện dòng " + (i + 1) + " là bắt buộc");
                }
                if (line.getQuantity() == null || line.getQuantity().compareTo(ZERO) <= 0) {
                    throw new BusinessException("Định mức dòng " + (i + 1) + " phải lớn hơn 0");
                }
                try {
                    line.getQuantity().stripTrailingZeros().intValueExact();
                } catch (ArithmeticException ex) {
                    throw new BusinessException("Định mức dòng " + (i + 1) + " phải là số nguyên");
                }
            }
        }
    }

    private void rebuildBomLines(AssemblyBom bom, List<AssemblyBomLineRequest> lines) {
        bom.getLines().clear();
        for (AssemblyBomLineRequest requestLine : lines) {
            ProductVariant component = productVariantRepository.findById(requestLine.getComponentVariantId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy SKU linh kiện " + requestLine.getComponentVariantId()));
            AssemblyBomLine line = AssemblyBomLine.builder()
                    .assemblyBom(bom)
                    .componentVariant(component)
                    .quantity(requestLine.getQuantity())
                    .componentRole(requestLine.getComponentRole())
                    .note(requestLine.getNote())
                    .unitPrice(requestLine.getUnitPrice() != null ? requestLine.getUnitPrice() : component.getSalePrice())
                    .componentSku(requestLine.getComponentSku() != null ? requestLine.getComponentSku() : component.getSku())
                    .componentName(requestLine.getComponentName() != null ? requestLine.getComponentName() : variantName(component))
                    .warrantyMonths(requestLine.getWarrantyMonths() != null ? requestLine.getWarrantyMonths() : ((component.getWarrantyMonths() == null || component.getWarrantyMonths() <= 0) && component.getProduct() != null ? component.getProduct().getWarrantyPeriodMonths() : component.getWarrantyMonths()))
                    .build();
            bom.getLines().add(line);
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

    private AssemblyBom findBomOrThrow(Long bomId) {
        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(bomId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy định mức vật tư"));
        if (!"APPROVED".equalsIgnoreCase(bom.getStatus())) {
            throw new BusinessException("Chỉ được tạo lệnh từ cấu hình đã duyệt");
        }
        if (bom.getLines() == null || bom.getLines().isEmpty()) {
            throw new BusinessException("Cấu hình chưa có linh kiện");
        }
        return bom;
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID lệnh là bắt buộc");
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh lắp ráp/tháo dỡ"));
    }

    private ProductVariant resolveTargetVariant(AssemblyBom bom) {
        Product product = bom.getProduct();
        if (product == null) {
            throw new BusinessException("Sản phẩm thành phẩm của cấu hình chưa có SKU");
        }
        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(product.getId());
        if (variants.isEmpty()) {
            throw new BusinessException("Sản phẩm thành phẩm của cấu hình chưa có SKU");
        }
        return variants.stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getActive()))
                .findFirst()
                .orElse(variants.get(0));
    }

    private void rebuildLines(AssemblyOrder order, AssemblyBom bom, AssemblyOrderRequest request) {
        order.getLines().clear();
        BigDecimal orderQuantity = request.getQuantity();

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            for (AssemblyOrderLineRequest lineReq : request.getLines()) {
                ProductVariant variant = productVariantRepository.findById(lineReq.getComponentVariantId())
                        .orElseThrow(() -> new BusinessException("Không tìm thấy SKU linh kiện " + lineReq.getComponentVariantId()));
                AssemblyOrderLine line = AssemblyOrderLine.builder()
                        .assemblyOrder(order)
                        .componentVariant(variant)
                        .quantityRequired(lineReq.getQuantityRequired() != null ? lineReq.getQuantityRequired() : lineReq.getQuantityActual())
                        .quantityActual(lineReq.getQuantityActual() != null ? lineReq.getQuantityActual() : lineReq.getQuantityRequired())
                        .unitCost(ZERO)
                        .note(lineReq.getNote())
                        .build();
                order.getLines().add(line);
            }
        } else {
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
    }

    private void ensureEditable(AssemblyOrder order) {
        String status = normalizeStatus(order.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException("Chỉ có thể cập nhật lệnh DRAFT hoặc SUBMITTED");
        }
    }

    private String resolveCreateOrderCode(String requestedCode, String orderType) {
        String orderCode = trimToNull(requestedCode);
        if (orderCode == null) {
            orderCode = (ASSEMBLY.equals(orderType) ? "LR-" : "TD-") + System.currentTimeMillis();
        }
        if (assemblyOrderRepository.existsByOrderCode(orderCode)) {
            throw new BusinessException("Mã lệnh lắp ráp/tháo dỡ đã tồn tại");
        }
        return orderCode;
    }

    private String resolveCreateBomCode(String requestedCode, Product product) {
        String bomCode = trimToNull(requestedCode);
        if (bomCode == null) {
            String productCode = trimToNull(product.getProductCode()) != null ? product.getProductCode().trim() : String.valueOf(product.getId());
            bomCode = "CH-" + productCode + "-" + System.currentTimeMillis();
        }
        if (assemblyBomRepository.existsByBomCode(bomCode)) {
            throw new BusinessException("Mã cấu hình đã tồn tại");
        }
        return bomCode;
    }

    private String normalizeBomStatus(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_BOM_STATUSES.contains(normalized)) {
            throw new BusinessException("Trạng thái cấu hình không hợp lệ");
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
            throw new BusinessException("Trạng thái cấu hình không hợp lệ");
        }
        return normalized;
    }

    private String normalizeOptionalType(String orderType) {
        String normalized = trimToNull(orderType);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_TYPES.contains(normalized)) {
            throw new BusinessException("Loại lệnh không hợp lệ");
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
            throw new BusinessException("Trạng thái lệnh phải là DRAFT hoặc SUBMITTED");
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
            throw new BusinessException("Trạng thái lệnh không hợp lệ");
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
                .componentSku(line.getComponentSku() != null ? line.getComponentSku() : (variant != null ? variant.getSku() : null))
                .componentName(line.getComponentName() != null ? line.getComponentName() : variantName(variant))
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .quantity(line.getQuantity())
                .componentRole(line.getComponentRole())
                .note(line.getNote())
                .unitPrice(line.getUnitPrice() != null ? line.getUnitPrice() : (variant != null ? variant.getSalePrice() : null))
                .warrantyMonths(line.getWarrantyMonths() != null ? line.getWarrantyMonths() : (variant != null ? ((variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null ? product.getWarrantyPeriodMonths() : variant.getWarrantyMonths()) : null))
                .build();
    }

    private AssemblyOrderResponse toOrderResponse(AssemblyOrder order) {
        AssemblyBom bom = order.getBom();
        ProductVariant target = order.getTargetVariant();
        
        String createdByName = null;
        if (order.getCreatedBy() != null) {
            createdByName = userRepository.findById(order.getCreatedBy())
                    .map(com.duylongtech.backend.entity.User::getFullName)
                    .orElse(String.valueOf(order.getCreatedBy()));
        }
        
        List<com.duylongtech.backend.entity.AssemblyOrderSerial> serials = assemblyOrderSerialRepository.findByAssemblyOrderId(order.getId());
        List<com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse> mappedSerials = serials.stream().map(s -> {
            com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse res = new com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse();
            res.setId(s.getId());
            res.setAssemblyOrderId(s.getAssemblyOrder().getId());
            res.setTargetVariantId(s.getTargetVariant().getId());
            res.setTargetSerial(s.getTargetSerial());
            res.setComponentVariantId(s.getComponentVariant().getId());
            res.setComponentName(variantName(s.getComponentVariant()));
            res.setComponentSerial(s.getComponentSerial());
            return res;
        }).toList();

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
                .targetSalePrice(target != null ? target.getSalePrice() : null)
                .warehouseId(order.getWarehouseId())
                .quantity(order.getQuantity())
                .quantityProduced(order.getQuantityProduced())
                .status(order.getStatus())
                .executionDate(order.getExecutionDate())
                .note(order.getNote())
                .createdBy(order.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(order.getApprovedBy())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .lines(order.getLines() == null ? List.of() : order.getLines().stream().map(this::toOrderLineResponse).toList())
                .mappedSerials(mappedSerials)
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
                .salePrice(variant != null ? variant.getSalePrice() : null)
                .note(line.getNote())
                .trackSerial(product != null ? product.getTrackSerial() : false)
                .build();
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

    public List<AssemblyOrderSerialResponse> getSerials(Long orderId) {
        return assemblyOrderSerialRepository.findByAssemblyOrderId(orderId).stream().map(s -> {
            AssemblyOrderSerialResponse res = new AssemblyOrderSerialResponse();
            res.setId(s.getId());
            res.setAssemblyOrderId(s.getAssemblyOrder().getId());
            res.setTargetVariantId(s.getTargetVariant().getId());
            res.setTargetSerial(s.getTargetSerial());
            res.setComponentVariantId(s.getComponentVariant().getId());
            res.setComponentSerial(s.getComponentSerial());
            return res;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void saveSerials(Long orderId, List<AssemblyOrderSerialRequest> requests) {
        AssemblyOrder order = assemblyOrderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found with id: " + orderId));
        
        assemblyOrderSerialRepository.deleteByAssemblyOrderId(orderId);
        
        if (requests == null || requests.isEmpty()) {
            return;
        }
        
        List<AssemblyOrderSerial> newSerials = requests.stream().map(req -> {
            ProductVariant targetVar = productVariantRepository.findById(req.getTargetVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Target variant not found: " + req.getTargetVariantId()));
            ProductVariant compVar = productVariantRepository.findById(req.getComponentVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));
            
            return AssemblyOrderSerial.builder()
                    .assemblyOrder(order)
                    .targetVariant(targetVar)
                    .targetSerial(req.getTargetSerial())
                    .componentVariant(compVar)
                    .componentSerial(req.getComponentSerial())
                    .createdBy(order.getCreatedBy())
                    .build();
        }).collect(Collectors.toList());
        
        assemblyOrderSerialRepository.saveAll(newSerials);
    }

    @Transactional
    public void executeAssemblyOrder(Long id, AssemblyExecutionRequest request, Long userId) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (!"APPROVED".equals(order.getStatus())) {
            throw new BusinessException("Chỉ có thể thực thi lệnh đã được duyệt");
        }
        if (!ASSEMBLY.equals(order.getOrderType()) && !"DISASSEMBLY".equals(order.getOrderType())) {
            throw new BusinessException("Tính năng thực thi quét mã vạch hiện tại chỉ hỗ trợ Lắp ráp và Tháo dỡ");
        }

        ProductVariant targetVariant = order.getTargetVariant();
        if (targetVariant == null) {
            throw new BusinessException("Lệnh không có thành phẩm");
        }

        List<com.duylongtech.backend.dto.request.InventoryDocumentLineRequest> exportLines = new java.util.ArrayList<>();
        List<com.duylongtech.backend.dto.request.InventoryDocumentLineRequest> importLines = new java.util.ArrayList<>();
        List<AssemblyOrderSerialRequest> serialMappings = new java.util.ArrayList<>();

        java.util.Map<Long, java.util.List<String>> componentsToExport = new java.util.HashMap<>();

        for (AssemblyExecutionRequest.AssemblySetRequest set : request.getAssembledSets()) {
            com.duylongtech.backend.dto.request.InventoryDocumentLineRequest targetLine = new com.duylongtech.backend.dto.request.InventoryDocumentLineRequest();
            targetLine.setVariantId(targetVariant.getId());
            targetLine.setQuantityIn(BigDecimal.ONE);
            targetLine.setQuantityOut(BigDecimal.ONE); // Sets both, we will only use one based on the order type later
            targetLine.setUnitCost(BigDecimal.ZERO);
            targetLine.setUnitPrice(BigDecimal.ZERO);
            targetLine.setSerialNumbers(List.of(set.getParentSerial()));
            
            if (ASSEMBLY.equals(order.getOrderType())) {
                targetLine.setQuantityOut(null);
                importLines.add(targetLine);
            } else {
                targetLine.setQuantityIn(null);
                exportLines.add(targetLine);
            }

            for (AssemblyExecutionRequest.AssemblyComponentRequest comp : set.getComponents()) {
                componentsToExport.computeIfAbsent(comp.getVariantId(), k -> new java.util.ArrayList<>()).add(comp.getSerial());

                AssemblyOrderSerialRequest mapping = new AssemblyOrderSerialRequest();
                mapping.setTargetVariantId(targetVariant.getId());
                mapping.setTargetSerial(set.getParentSerial());
                mapping.setComponentVariantId(comp.getVariantId());
                mapping.setComponentSerial(comp.getSerial());
                serialMappings.add(mapping);
            }
        }

        for (java.util.Map.Entry<Long, java.util.List<String>> entry : componentsToExport.entrySet()) {
            com.duylongtech.backend.dto.request.InventoryDocumentLineRequest compLine = new com.duylongtech.backend.dto.request.InventoryDocumentLineRequest();
            compLine.setVariantId(entry.getKey());
            compLine.setUnitCost(BigDecimal.ZERO);
            compLine.setUnitPrice(BigDecimal.ZERO);
            compLine.setSerialNumbers(entry.getValue());
            
            if (ASSEMBLY.equals(order.getOrderType())) {
                compLine.setQuantityOut(new BigDecimal(entry.getValue().size()));
                exportLines.add(compLine);
            } else {
                compLine.setQuantityIn(new BigDecimal(entry.getValue().size()));
                importLines.add(compLine);
            }
        }

        com.duylongtech.backend.dto.request.InventoryDocumentRequest exportDoc = new com.duylongtech.backend.dto.request.InventoryDocumentRequest();
        exportDoc.setWarehouseId(request.getWarehouseId());
        exportDoc.setDocDate(request.getExecutionDate());
        exportDoc.setReferenceType("ASSEMBLY_ORDER");
        exportDoc.setReferenceId(order.getId());
        exportDoc.setIssuePurpose("ASSEMBLY"); // Xuất lắp ráp/tháo dỡ
        exportDoc.setCreatedBy(userId);
        exportDoc.setStatus("SUBMITTED");
        exportDoc.setLines(exportLines);
        com.duylongtech.backend.dto.response.InventoryDocumentResponse createdExport = inventoryDocumentService.createExport(exportDoc);
        inventoryDocumentService.postExport(createdExport.getId());

        com.duylongtech.backend.dto.request.InventoryDocumentRequest importDoc = new com.duylongtech.backend.dto.request.InventoryDocumentRequest();
        importDoc.setWarehouseId(request.getWarehouseId());
        importDoc.setDocDate(request.getExecutionDate());
        importDoc.setReferenceType("ASSEMBLY_ORDER");
        importDoc.setReferenceId(order.getId());
        importDoc.setIssuePurpose("PRODUCTION"); // Nhập kho sản xuất (thành phẩm sau lắp ráp)
        importDoc.setCreatedBy(userId);
        importDoc.setStatus("SUBMITTED");
        importDoc.setLines(importLines);
        com.duylongtech.backend.dto.response.InventoryDocumentResponse createdImport = inventoryDocumentService.createImport(importDoc);
        inventoryDocumentService.postImport(createdImport.getId());

        List<AssemblyOrderSerial> newSerials = serialMappings.stream().map(req -> {
            ProductVariant targetVar = productVariantRepository.findById(req.getTargetVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Target variant not found: " + req.getTargetVariantId()));
            ProductVariant compVar = productVariantRepository.findById(req.getComponentVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));
            
            return AssemblyOrderSerial.builder()
                    .assemblyOrder(order)
                    .targetVariant(targetVar)
                    .targetSerial(req.getTargetSerial())
                    .componentVariant(compVar)
                    .componentSerial(req.getComponentSerial())
                    .createdBy(userId)
                    .build();
        }).collect(Collectors.toList());
        
        assemblyOrderSerialRepository.saveAll(newSerials);

        // ── Cập nhật quantityProduced ──────────────────────────────────────────
        int executedCount = request.getAssembledSets().size();
        BigDecimal newProduced = order.getQuantityProduced().add(new BigDecimal(executedCount));
        order.setQuantityProduced(newProduced);

        // Nếu đã thực thi đủ toàn bộ → tự động chuyển SUBMITTED
        if (newProduced.compareTo(order.getQuantity()) >= 0) {
            order.setStatus("SUBMITTED");
        }
        order.setUpdatedAt(LocalDateTime.now());
        assemblyOrderRepository.save(order);
    }
}
