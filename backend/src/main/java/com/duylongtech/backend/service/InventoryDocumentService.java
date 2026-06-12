package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryDocumentService {

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String DEFAULT_STATUS = "DRAFT";
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "SUBMITTED");

    private final InventoryDocumentRepository inventoryDocumentRepository;

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getExportHistory(String docCode, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId) {
        String normalizedDocCode = trimToNull(docCode);
        String normalizedStatus = normalizeOptionalStatus(status);
        boolean noFilters = normalizedDocCode == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null;
        List<InventoryDocument> docs;
        if (noFilters) {
            docs = inventoryDocumentRepository.findAllExports();
        } else {
            docs = inventoryDocumentRepository.searchExports(normalizedDocCode, fromDate, toDate, normalizedStatus,
                    warehouseId);
        }
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getExportDetail(Long id) {
        return toResponse(findExportOrThrow(id));
    }

    @Transactional
    public InventoryDocumentResponse createExport(InventoryDocumentRequest req) {
        validateCreateRequest(req);

        InventoryDocument doc = new InventoryDocument();
        doc.setDocCode(resolveCreateDocCode(req.getDocCode()));
        doc.setDocType(EXPORT_DOC_TYPE);
        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(req.getPurchaseOrderId());
        doc.setSalesOrderId(req.getSalesOrderId());
        doc.setPartnerId(req.getPartnerId());
        doc.setDocDate(req.getDocDate());
        doc.setStatus(normalizeEditableStatus(req.getStatus(), DEFAULT_STATUS));
        doc.setNote(req.getNote());
        doc.setCreatedBy(req.getCreatedBy());
        doc.setCreatedAt(LocalDateTime.now());
        doc.setUpdatedAt(LocalDateTime.now());

        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toExportLineEntity(doc, req.getLines().get(i), i));
        }

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        return toResponse(saved);
    }

    @Transactional
    public InventoryDocumentResponse updateExport(Long id, InventoryDocumentRequest req) {
        validateUpdateRequest(req);

        InventoryDocument doc = findExportOrThrow(id);
        ensureEditable(doc);

        String requestedCode = trimToNull(req.getDocCode());
        if (requestedCode != null && !requestedCode.equals(doc.getDocCode())) {
            if (inventoryDocumentRepository.existsByDocCodeAndIdNot(requestedCode, id)) {
                throw new RuntimeException("Export slip code already exists");
            }
            doc.setDocCode(requestedCode);
        }

        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(req.getPurchaseOrderId());
        doc.setSalesOrderId(req.getSalesOrderId());
        doc.setPartnerId(req.getPartnerId());
        doc.setDocDate(req.getDocDate());
        doc.setStatus(normalizeEditableStatus(req.getStatus(), doc.getStatus()));
        doc.setNote(req.getNote());
        doc.setUpdatedAt(LocalDateTime.now());

        doc.getLines().clear();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toExportLineEntity(doc, req.getLines().get(i), i));
        }

        return toResponse(inventoryDocumentRepository.save(doc));
    }

    private InventoryDocument findExportOrThrow(Long id) {
        if (id == null) {
            throw new RuntimeException("Export slip id is required");
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new RuntimeException("Export slip not found"));
    }

    private void validateCreateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
        if (req.getCreatedBy() == null) {
            throw new RuntimeException("createdBy is required");
        }
    }

    private void validateUpdateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
    }

    private void validateRequiredExportFields(InventoryDocumentRequest req) {
        if (req == null) {
            throw new RuntimeException("Export slip request is required");
        }
        if (req.getWarehouseId() == null) {
            throw new RuntimeException("warehouseId is required");
        }
        if (req.getDocDate() == null) {
            throw new RuntimeException("docDate is required");
        }
        if (req.getLines() == null || req.getLines().isEmpty()) {
            throw new RuntimeException("Export slip must contain at least one line");
        }
    }

    private void ensureEditable(InventoryDocument doc) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new RuntimeException("Only DRAFT or SUBMITTED export slips can be updated");
        }
    }

    private String resolveCreateDocCode(String requestedCode) {
        String docCode = trimToNull(requestedCode);
        if (docCode == null) {
            docCode = "EXP-" + System.currentTimeMillis();
        }
        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            throw new RuntimeException("Export slip code already exists");
        }
        return docCode;
    }

    private InventoryDocumentLine toExportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr,
            int index) {
        if (lr == null) {
            throw new RuntimeException("lines[" + index + "] is required");
        }
        if (lr.getVariantId() == null) {
            throw new RuntimeException("lines[" + index + "].variantId is required");
        }
        if (lr.getQuantityIn() != null && lr.getQuantityIn().compareTo(ZERO) > 0) {
            throw new RuntimeException("Export slip lines must not contain quantityIn");
        }

        BigDecimal quantityOut = requirePositive(lr.getQuantityOut(), "lines[" + index + "].quantityOut");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal unitPrice = nonNegativeOrZero(lr.getUnitPrice(), "lines[" + index + "].unitPrice");
        BigDecimal lineAmount = quantityOut.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

        return InventoryDocumentLine.builder()
                .inventoryDocument(doc)
                .variantId(lr.getVariantId())
                .quantityIn(ZERO)
                .quantityOut(quantityOut)
                .unitCost(unitCost)
                .unitPrice(unitPrice)
                .lineAmount(lineAmount)
                .lotBatchId(lr.getLotBatchId())
                .serialNumberId(lr.getSerialNumberId())
                .note(lr.getNote())
                .build();
    }

    private BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(ZERO) <= 0) {
            throw new RuntimeException(fieldName + " must be greater than 0");
        }
        return value;
    }

    private BigDecimal nonNegativeOrZero(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0) {
            throw new RuntimeException(fieldName + " must be greater than or equal to 0");
        }
        return value;
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return null;
        }
        return normalizeStatusValue(normalized, null);
    }

    private String normalizeEditableStatus(String status, String fallback) {
        String normalized = normalizeStatusValue(status, fallback);
        if (!EDITABLE_STATUSES.contains(normalized)) {
            throw new RuntimeException("Export slip status must be DRAFT or SUBMITTED");
        }
        return normalized;
    }

    private String normalizeStatusValue(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid export slip status");
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

    private InventoryDocumentResponse toResponse(InventoryDocument doc) {
        InventoryDocumentResponse r = new InventoryDocumentResponse();
        r.setId(doc.getId());
        r.setDocCode(doc.getDocCode());
        r.setDocType(doc.getDocType());
        r.setWarehouseId(doc.getWarehouseId());
        r.setSourceWarehouseId(doc.getSourceWarehouseId());
        r.setPurchaseOrderId(doc.getPurchaseOrderId());
        r.setSalesOrderId(doc.getSalesOrderId());
        r.setPartnerId(doc.getPartnerId());
        r.setDocDate(doc.getDocDate());
        r.setPostedAt(doc.getPostedAt());
        r.setStatus(doc.getStatus());
        r.setNote(doc.getNote());
        r.setCreatedBy(doc.getCreatedBy());
        r.setApprovedBy(doc.getApprovedBy());
        r.setCreatedAt(doc.getCreatedAt());
        r.setUpdatedAt(doc.getUpdatedAt());
        if (doc.getLines() != null) {
            List<InventoryDocumentLineResponse> lines = doc.getLines().stream().map(l -> {
                InventoryDocumentLineResponse lr = new InventoryDocumentLineResponse();
                lr.setId(l.getId());
                lr.setVariantId(l.getVariantId());
                lr.setQuantityIn(l.getQuantityIn());
                lr.setQuantityOut(l.getQuantityOut());
                lr.setUnitCost(l.getUnitCost());
                lr.setUnitPrice(l.getUnitPrice());
                lr.setLineAmount(l.getLineAmount());
                lr.setLotBatchId(l.getLotBatchId());
                lr.setSerialNumberId(l.getSerialNumberId());
                lr.setNote(l.getNote());
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }
        return r;
    }
}
