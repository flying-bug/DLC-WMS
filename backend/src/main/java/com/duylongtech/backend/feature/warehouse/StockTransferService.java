package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;

@Service
@Slf4j
public class StockTransferService {

    @Autowired
    private StockTransferRepository stockTransferRepository;

    @Autowired
    private StockTransferLineRepository stockTransferLineRepository;

    @Autowired
    private InventoryDocumentRepository inventoryDocumentRepository;

    @Autowired
    private com.duylongtech.backend.feature.warehouse.StockTransferMapper stockTransferMapper;

    @Autowired
    private InventoryBalanceRepository inventoryBalanceRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private InventoryDocumentService inventoryDocumentService;

    @Autowired
    private com.duylongtech.backend.feature.system.CodeGeneratorService codeGeneratorService;
    @Transactional(readOnly = true)
    public String generateNextTransferCode() {
        return codeGeneratorService.generateCode("stock_transfers", "transfer_code", "CK-", 5);
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    private BigDecimal resolveTransferUnitCost(Long warehouseId, Long variantId, BigDecimal providedCost) {
        if (providedCost != null && providedCost.compareTo(BigDecimal.ZERO) > 0) {
            return providedCost;
        }
        if (warehouseId != null && variantId != null) {
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, variantId, "GOOD")
                    .orElse(null);
            if (balance != null && balance.getAverageCost() != null && balance.getAverageCost().compareTo(BigDecimal.ZERO) > 0) {
                return balance.getAverageCost();
            }
        }
        if (variantId != null) {
            ProductVariant variant = productVariantRepository.findById(variantId).orElse(null);
            if (variant != null) {
                if (variant.getCostPrice() != null && variant.getCostPrice().compareTo(BigDecimal.ZERO) > 0) {
                    return variant.getCostPrice();
                }
                if (variant.getSalePrice() != null && variant.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {
                    return variant.getSalePrice();
                }
            }
        }
        return BigDecimal.ZERO;
    }
    @Transactional(readOnly = true)
    public List<StockTransferResponseDTO> getTransferHistory(String transferCode, java.time.LocalDate fromDate, java.time.LocalDate toDate, String status) {
        boolean noFilters = (transferCode == null || transferCode.trim().isEmpty()) && fromDate == null && toDate == null && (status == null || status.trim().isEmpty());
        List<StockTransfer> transfers = noFilters ?
                stockTransferRepository.findAllTransfers() :
                stockTransferRepository.searchTransfers(
                        transferCode != null && !transferCode.trim().isEmpty() ? transferCode.trim() : null,
                        fromDate,
                        toDate,
                        status != null && !status.trim().isEmpty() ? status.trim() : null
                );
        return transfers.stream().map(this::mapToResponseDTO).collect(Collectors.toList());
    }
    @Transactional(readOnly = true)
    public StockTransferResponseDTO getTransferDetail(Long transferId) {
        StockTransfer stockTransfer = stockTransferRepository.findByIdWithLines(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));
        return mapToResponseDTO(stockTransfer);
    }
    @Transactional
    public StockTransferResponseDTO createTransferRequest(StockTransferRequestDTO requestDTO, Long userId) {
        if (requestDTO.getFromWarehouseId().equals(requestDTO.getToWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_DIFF_WAREHOUSE_REQUIRED);
        }

        String transferCode = requestDTO.getTransferCode();
        if (transferCode == null || transferCode.trim().isEmpty()) {
            transferCode = generateNextTransferCode();
        }

        StockTransfer stockTransfer = new StockTransfer();
        stockTransfer.initDraft(transferCode, requestDTO.getFromWarehouseId(), requestDTO.getToWarehouseId(), requestDTO.getTransferDate());
        stockTransfer.setNote(requestDTO.getNote());
        stockTransfer.setDeliverer(requestDTO.getDeliverer());
        stockTransfer.setAttachedDocument(requestDTO.getAttachedDocument());
        stockTransfer.initReference(requestDTO.getReferenceId(), requestDTO.getReferenceType(), requestDTO.getReferenceCode());
        stockTransfer.assignCreator(userId);

        for (StockTransferLineDTO lineDTO : requestDTO.getLines()) {
            String serialsJson = null;
            if (lineDTO.getSerialNumbers() != null && !lineDTO.getSerialNumbers().isEmpty()) {
                try {
                    serialsJson = objectMapper.writeValueAsString(lineDTO.getSerialNumbers());
                } catch (JsonProcessingException e) {
                    throw new BusinessException(SystemMessage.ST_ERR_001.getMessage());
                }
            }

            BigDecimal unitCost = resolveTransferUnitCost(requestDTO.getFromWarehouseId(), lineDTO.getVariantId(), lineDTO.getUnitCost());
            StockTransferLine line = new StockTransferLine();
            line.initLine(lineDTO.getVariantId(), lineDTO.getQuantity(), unitCost, serialsJson, lineDTO.getNote());
            stockTransfer.addLine(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if (DocumentStatus.APPROVED.name().equals(requestDTO.getStatus())) {
            stockTransfer.approve(userId);
            stockTransfer = stockTransferRepository.save(stockTransfer);
            createExportDraftForTransfer(stockTransfer, userId);
        }

        return mapToResponseDTO(stockTransfer);
    }
    @Transactional
    public StockTransferResponseDTO updateTransferRequest(Long transferId, StockTransferRequestDTO requestDTO, Long userId) {
        StockTransfer stockTransfer = stockTransferRepository.findByIdWithLines(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));

        if (!DocumentStatus.DRAFT.name().equals(stockTransfer.getStatus()) && !DocumentStatus.SUBMITTED.name().equals(stockTransfer.getStatus())) {
            throw new BusinessException(SystemMessage.ST_ERR_002.getMessage());
        }

        if (requestDTO.getFromWarehouseId().equals(requestDTO.getToWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_DIFF_WAREHOUSE_REQUIRED);
        }

        if (requestDTO.getFromWarehouseId() != null && requestDTO.getToWarehouseId() != null) {
            stockTransfer.changeWarehouses(requestDTO.getFromWarehouseId(), requestDTO.getToWarehouseId());
        }

        stockTransfer.updateTransferDate(requestDTO.getTransferDate() != null ? requestDTO.getTransferDate() : stockTransfer.getTransferDate());
        boolean shouldCreateExportDraft = false;
        if (requestDTO.getStatus() != null && !stockTransfer.getStatus().equals(requestDTO.getStatus())) {
            if (DocumentStatus.CANCELLED.name().equals(requestDTO.getStatus())) {
                stockTransfer.cancel();
            } else if (DocumentStatus.APPROVED.name().equals(requestDTO.getStatus())) {
                stockTransfer.approve(userId); // Chuyển khỏi DRAFT, sẽ tự tạo phiếu xuất nháp bên dưới
                shouldCreateExportDraft = true;
            }
        }
        stockTransfer.setNote(requestDTO.getNote());
        stockTransfer.setDeliverer(requestDTO.getDeliverer());
        stockTransfer.setAttachedDocument(requestDTO.getAttachedDocument());
        stockTransfer.initReference(requestDTO.getReferenceId(), requestDTO.getReferenceType(), requestDTO.getReferenceCode());

        stockTransferLineRepository.deleteAll(stockTransfer.getLines());
        stockTransfer.clearLines();

        for (StockTransferLineDTO lineDTO : requestDTO.getLines()) {
            String serialsJson = null;
            if (lineDTO.getSerialNumbers() != null && !lineDTO.getSerialNumbers().isEmpty()) {
                try {
                    serialsJson = objectMapper.writeValueAsString(lineDTO.getSerialNumbers());
                } catch (JsonProcessingException e) {
                    throw new BusinessException(SystemMessage.ST_ERR_001.getMessage());
                }
            }

            BigDecimal unitCost = resolveTransferUnitCost(requestDTO.getFromWarehouseId(), lineDTO.getVariantId(), lineDTO.getUnitCost());
            StockTransferLine line = new StockTransferLine();
            line.initLine(lineDTO.getVariantId(), lineDTO.getQuantity(), unitCost, serialsJson, lineDTO.getNote());
            stockTransfer.addLine(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if (shouldCreateExportDraft) {
            createExportDraftForTransfer(stockTransfer, userId);
        }

        return mapToResponseDTO(stockTransfer);
    }

    /**
     * Gọi bởi {@link StockTransferInventoryEventListener} sau khi 1 chứng từ kho liên
     * kết với phiếu chuyển này (referenceType=STOCK_TRANSFER) được ghi sổ:
     * - Nếu đó là phiếu xuất (TRANSFER_EXPORT): tạo phiếu nhập kho nháp cho kho đích,
     *   lấy đúng số lượng/serial ĐÃ THỰC XUẤT (không phải số kế hoạch), rồi chuyển
     *   phiếu chuyển sang IN_TRANSIT.
     * - Nếu đó là phiếu nhập (TRANSFER_IMPORT): coi như phiếu chuyển đã hoàn tất.
     * Idempotent: bỏ qua nếu phiếu chuyển không còn ở trạng thái tương ứng (đã xử lý
     * rồi, hoặc sự kiện đến trùng lặp).
     */
    @Transactional
    public void handleLinkedDocumentPosted(Long transferId, Long documentId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId).orElse(null);
        if (stockTransfer == null) {
            return;
        }
        InventoryDocument doc = inventoryDocumentRepository.findById(documentId).orElse(null);
        if (doc == null) {
            return;
        }

        if (InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT.equals(doc.getIssuePurpose())) {
            if (!DocumentStatus.APPROVED.name().equals(stockTransfer.getStatus())) {
                return; // đã xử lý rồi hoặc chưa ở đúng trạng thái - bỏ qua để tránh tạo trùng
            }
            createImportDraftFromPostedExport(stockTransfer, documentId);
        } else if (InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN.equals(doc.getIssuePurpose())) {
            if (!DocumentStatus.IN_TRANSIT.name().equals(stockTransfer.getStatus())) {
                return;
            }
            stockTransfer.complete();
            stockTransferRepository.save(stockTransfer);
        }
    }

    /**
     * Parse JSON danh sách serial của 1 dòng chuyển kho. Lỗi parse (dữ liệu hỏng, JSON
     * không hợp lệ) được log lại kèm ngữ cảnh thay vì nuốt im lặng - trước đây 1 dòng
     * bị lỗi parse sẽ âm thầm biến thành "không có serial nào" mà không ai biết.
     */
    private List<String> parseSerialNumbers(String serialNumbersText, String context) {
        if (serialNumbersText == null || serialNumbersText.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(serialNumbersText, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Không parse được danh sách serial ({}): {} - raw: {}", context, e.getMessage(), serialNumbersText);
            return new ArrayList<>();
        }
    }

    /**
     * Chỉ TẠO phiếu xuất kho ở trạng thái nháp (DRAFT) cho kho nguồn - không ghi sổ.
     * Thủ kho A sẽ tự quét/kiểm đếm thực tế và ghi sổ chứng từ này qua màn Xuất kho
     * bình thường, giống hệt mọi phiếu xuất khác.
     */
    private void createExportDraftForTransfer(StockTransfer stockTransfer, Long userId) {
        InventoryDocumentRequest exportReq = new InventoryDocumentRequest();
        exportReq.setWarehouseId(stockTransfer.getFromWarehouseId());
        exportReq.setDocDate(java.time.LocalDate.now());
        exportReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT);
        exportReq.setReferenceType("STOCK_TRANSFER");
        exportReq.setReferenceId(stockTransfer.getId());
        exportReq.setCreatedBy(userId);
        exportReq.setNote("Chuyển kho " + stockTransfer.getTransferCode() + " - vui lòng quét/kiểm đếm thực tế trước khi ghi sổ.");
        List<InventoryDocumentLineRequest> lines = new ArrayList<>();

        for (StockTransferLine line : stockTransfer.getLines()) {
            BigDecimal qty = line.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
            lineReq.setVariantId(line.getVariantId());
            lineReq.setQuantityOut(qty);
            lineReq.setExpectedQuantity(qty);
            lineReq.setUnitCost(resolveTransferUnitCost(stockTransfer.getFromWarehouseId(), line.getVariantId(), line.getUnitCost()));
            List<String> serials = parseSerialNumbers(line.getSerialNumbersText(),
                    "tạo phiếu xuất nháp cho chuyển kho " + stockTransfer.getTransferCode());
            if (!serials.isEmpty()) {
                lineReq.setSerialNumbers(serials);
            }
            lines.add(lineReq);
        }
        exportReq.setLines(lines);

        inventoryDocumentService.createExport(exportReq);
    }

    /**
     * Tạo phiếu nhập kho nháp (DRAFT) cho kho đích ngay sau khi phiếu xuất kho tương
     * ứng được ghi sổ - lấy đúng số lượng/serial/giá vốn ĐÃ THỰC XUẤT (không phải số
     * kế hoạch ban đầu), để thủ kho B tự quét/kiểm đếm và ghi sổ như 1 phiếu nhập
     * bình thường. Idempotent: bỏ qua nếu đã có phiếu nhập cho phiếu chuyển này.
     */
    private void createImportDraftFromPostedExport(StockTransfer stockTransfer, Long postedExportDocumentId) {
        boolean alreadyHasImportDraft = !inventoryDocumentService.getImportHistory(
                null, null, null, null, stockTransfer.getToWarehouseId(),
                InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN, "STOCK_TRANSFER", stockTransfer.getId()
        ).isEmpty();
        if (alreadyHasImportDraft) {
            return;
        }

        InventoryDocumentResponse exportDoc = inventoryDocumentService.getExportDetail(postedExportDocumentId);

        InventoryDocumentRequest importReq = new InventoryDocumentRequest();
        importReq.setWarehouseId(stockTransfer.getToWarehouseId());
        importReq.setDocDate(java.time.LocalDate.now());
        importReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN);
        importReq.setReferenceType("STOCK_TRANSFER");
        importReq.setReferenceId(stockTransfer.getId());
        importReq.setCreatedBy(exportDoc.getApprovedBy() != null ? exportDoc.getApprovedBy() : stockTransfer.getCreatedBy());
        importReq.setNote("Chuyển kho " + stockTransfer.getTransferCode() + " - đã xuất kho phiếu " + exportDoc.getDocCode()
                + ", vui lòng quét/kiểm đếm thực nhận trước khi ghi sổ.");

        List<InventoryDocumentLineRequest> lines = new ArrayList<>();
        if (exportDoc.getLines() != null) {
            for (com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse l : exportDoc.getLines()) {
                BigDecimal qty = l.getQuantityOut();
                if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
                lineReq.setVariantId(l.getVariantId());
                lineReq.setQuantityIn(qty);
                lineReq.setExpectedQuantity(qty);
                lineReq.setUnitCost(l.getUnitCost());
                if (l.getSerialNumbers() != null && !l.getSerialNumbers().isEmpty()) {
                    lineReq.setSerialNumbers(l.getSerialNumbers());
                }
                lines.add(lineReq);
            }
        }
        importReq.setLines(lines);

        inventoryDocumentService.createImport(importReq);
        stockTransfer.dispatch();
        stockTransferRepository.save(stockTransfer);
    }
    @Transactional(readOnly = true)
    public List<StockTransferResponseDTO> getAllTransfers() {
        return stockTransferRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }
    @Transactional(readOnly = true)
    public StockTransferResponseDTO getTransferById(Long transferId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));
        return mapToResponseDTO(stockTransfer);
    }

    private StockTransferResponseDTO mapToResponseDTO(StockTransfer transfer) {
        StockTransferResponseDTO response = stockTransferMapper.toResponse(transfer);

        if (transfer.getFromWarehouseId() != null) {
            warehouseRepository.findById(transfer.getFromWarehouseId())
                    .ifPresent(w -> response.setFromWarehouseName(w.getName()));
        }
        if (transfer.getToWarehouseId() != null) {
            warehouseRepository.findById(transfer.getToWarehouseId())
                    .ifPresent(w -> response.setToWarehouseName(w.getName()));
        }

        List<InventoryDocument> linkedDocs = inventoryDocumentRepository.findByReferenceWithLines("STOCK_TRANSFER", transfer.getId());
        for (InventoryDocument doc : linkedDocs) {
            if (InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT.equals(doc.getIssuePurpose())) {
                response.setExportDocumentId(doc.getId());
                response.setExportDocumentCode(doc.getDocCode());
            } else if (InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN.equals(doc.getIssuePurpose())) {
                response.setImportDocumentId(doc.getId());
                response.setImportDocumentCode(doc.getDocCode());
            }
        }

        if (transfer.getLines() != null) {
            List<StockTransferLineDTO> lines = transfer.getLines().stream()
                    .map(line -> {
                        StockTransferLineDTO dto = stockTransferMapper.toLineDTO(line);
                        List<String> serials = parseSerialNumbers(line.getSerialNumbersText(),
                                "hiển thị dòng #" + line.getId() + " phiếu chuyển " + transfer.getTransferCode());
                        dto.setSerialNumbers(serials);
                        if (line.getVariantId() != null) {
                            productVariantRepository.findById(line.getVariantId()).ifPresent(v -> {
                                dto.setSku(v.getSku());
                                dto.setVariantName(v.getVariantName());
                                dto.setProductName(v.getProduct() != null ? v.getProduct().getProductName() : v.getVariantName());
                            });
                        }
                        return dto;
                    })
                    .collect(Collectors.toList());
            response.setLines(lines);
        } else {
            response.setLines(new ArrayList<>());
        }

        return response;
    }
}
