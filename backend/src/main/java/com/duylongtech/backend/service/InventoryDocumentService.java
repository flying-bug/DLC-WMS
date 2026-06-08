package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.repository.InventoryDocumentLineRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class InventoryDocumentService {

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getExportHistory(String docCode, LocalDate fromDate, LocalDate toDate, String status, Long warehouseId) {
        boolean noFilters = (docCode == null || docCode.trim().isEmpty()) && fromDate == null && toDate == null && (status == null || status.trim().isEmpty()) && warehouseId == null;
        List<InventoryDocument> docs;
        if (noFilters) {
            docs = inventoryDocumentRepository.findAllExports();
        } else {
            docs = inventoryDocumentRepository.searchExports(docCode, fromDate, toDate, status, warehouseId);
        }
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public InventoryDocumentResponse createExport(InventoryDocumentRequest req) {
        InventoryDocument doc = new InventoryDocument();
        String code = req.getDocCode() != null ? req.getDocCode() : ("EXP-" + System.currentTimeMillis());
        doc.setDocCode(code);
        doc.setDocType("EX_SO");
        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(req.getPurchaseOrderId());
        doc.setSalesOrderId(req.getSalesOrderId());
        doc.setPartnerId(req.getPartnerId());
        doc.setDocDate(req.getDocDate());
        doc.setStatus(req.getStatus() != null ? req.getStatus() : "DRAFT");
        doc.setNote(req.getNote());
        doc.setCreatedBy(req.getCreatedBy());
        doc.setCreatedAt(LocalDateTime.now());

        if (req.getLines() != null) {
            for (InventoryDocumentLineRequest lr : req.getLines()) {
                InventoryDocumentLine line = InventoryDocumentLine.builder()
                        .inventoryDocument(doc)
                        .variantId(lr.getVariantId())
                        .quantityIn(lr.getQuantityIn())
                        .quantityOut(lr.getQuantityOut())
                        .unitCost(lr.getUnitCost())
                        .unitPrice(lr.getUnitPrice())
                        .lineAmount(lr.getLineAmount())
                        .lotBatchId(lr.getLotBatchId())
                        .serialNumberId(lr.getSerialNumberId())
                        .note(lr.getNote())
                        .build();
                doc.getLines().add(line);
            }
        }

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        return toResponse(saved);
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
        r.setStatus(doc.getStatus());
        r.setNote(doc.getNote());
        r.setCreatedBy(doc.getCreatedBy());
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
