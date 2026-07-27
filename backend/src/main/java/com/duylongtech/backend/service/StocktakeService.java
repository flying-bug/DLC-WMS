package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.dto.response.StocktakeLineResponse;
import com.duylongtech.backend.dto.response.StocktakeParticipantResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StocktakeService {

    private final StocktakeRepository stocktakeRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryDocumentService inventoryDocumentService;

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        String normalizedCode = stocktakeCode != null && !stocktakeCode.trim().isEmpty() ? stocktakeCode.trim() : null;
        String normalizedStatus = status != null && !status.trim().isEmpty() ? status.trim() : null;
        Page<Stocktake> page = stocktakeRepository.searchStocktakes(normalizedCode, normalizedStatus, fromDate, toDate, pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        return toResponse(stocktake);
    }

    @Transactional
    public StocktakeResponse createStocktake(StocktakeRequest req) {
        validateRequest(req);
        String docCode = resolveDocCode(req.getStocktakeCode());
        
        Stocktake stocktake = Stocktake.builder()
                .stocktakeCode(docCode)
                .warehouseId(req.getWarehouseId())
                .purpose(req.getPurpose())
                .stocktakeDate(req.getStocktakeDate() != null ? req.getStocktakeDate() : LocalDate.now())
                .conclusion(req.getConclusion())
                .status("DRAFT")
                .createdBy(req.getCreatedBy())
                .build();
                
        mapLinesAndParticipants(stocktake, req);
        
        return toResponse(stocktakeRepository.save(stocktake));
    }

    @Transactional
    public StocktakeResponse updateStocktake(Long id, StocktakeRequest req) {
        validateRequest(req);
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
                
        if (!"DRAFT".equals(stocktake.getStatus())) {
            throw new BusinessException("Chỉ có thể cập nhật phiếu lưu tạm");
        }

        String requestedCode = req.getStocktakeCode() != null ? req.getStocktakeCode().trim() : null;
        if (requestedCode != null && !requestedCode.equals(stocktake.getStocktakeCode())) {
            if (stocktakeRepository.existsByStocktakeCode(requestedCode)) {
                throw new BusinessException("Mã phiếu kiểm kê đã tồn tại");
            }
            stocktake.setStocktakeCode(requestedCode);
        }

        stocktake.setWarehouseId(req.getWarehouseId());
        stocktake.setPurpose(req.getPurpose());
        stocktake.setStocktakeDate(req.getStocktakeDate() != null ? req.getStocktakeDate() : stocktake.getStocktakeDate());
        stocktake.setConclusion(req.getConclusion());
        stocktake.setCreatedBy(req.getCreatedBy());

        stocktake.getLines().clear();
        stocktake.getParticipants().clear();
        
        mapLinesAndParticipants(stocktake, req);
        
        return toResponse(stocktakeRepository.save(stocktake));
    }

    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse postStocktake(Long id, Long processedBy) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        if (!"DRAFT".equals(stocktake.getStatus())) {
            throw new BusinessException("Chỉ phiếu lưu tạm mới có thể xử lý chênh lệch");
        }

        // Tách các dòng thừa và thiếu
        List<InventoryDocumentLineRequest> surplusLines = new ArrayList<>();
        List<InventoryDocumentLineRequest> shortageLines = new ArrayList<>();

        for (StocktakeLine line : stocktake.getLines()) {
            if ("Xử lý chênh lệch".equals(line.getAction())) {
                BigDecimal diff = line.getDiffQty();
                if (diff.compareTo(BigDecimal.ZERO) > 0) {
                    InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
                    lineReq.setVariantId(line.getVariantId());
                    lineReq.setQuantityIn(diff);
                    lineReq.setUnitCost(BigDecimal.ZERO); // Sẽ được hệ thống tính tự động dựa trên tồn kho hoặc 0
                    surplusLines.add(lineReq);
                } else if (diff.compareTo(BigDecimal.ZERO) < 0) {
                    InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
                    lineReq.setVariantId(line.getVariantId());
                    lineReq.setQuantityOut(diff.abs());
                    shortageLines.add(lineReq);
                }
            }
        }

        // Tạo phiếu nhập kho cho hàng thừa
        if (!surplusLines.isEmpty()) {
            InventoryDocumentRequest importReq = new InventoryDocumentRequest();
            importReq.setWarehouseId(stocktake.getWarehouseId());
            importReq.setDocDate(LocalDate.now());
            importReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_INVENTORY_ADJUSTMENT);
            importReq.setNote("Phiếu nhập kho điều chỉnh tăng tồn kho theo kiểm kê " + stocktake.getStocktakeCode());
            importReq.setCreatedBy(processedBy != null ? processedBy : stocktake.getCreatedBy());
            importReq.setLines(surplusLines);
            importReq.setStatus("DRAFT"); // Lưu nháp chờ duyệt thủ công theo thống nhất
            var importDoc = inventoryDocumentService.createImport(importReq);
            stocktake.setReferenceImportId(importDoc.getId());
        }

        // Tạo phiếu xuất kho cho hàng thiếu
        if (!shortageLines.isEmpty()) {
            InventoryDocumentRequest exportReq = new InventoryDocumentRequest();
            exportReq.setWarehouseId(stocktake.getWarehouseId());
            exportReq.setDocDate(LocalDate.now());
            exportReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_INVENTORY_ADJUSTMENT);
            exportReq.setNote("Phiếu xuất kho xử lý chênh lệch kiểm kê " + stocktake.getStocktakeCode());
            exportReq.setCreatedBy(processedBy != null ? processedBy : stocktake.getCreatedBy());
            exportReq.setLines(shortageLines);
            exportReq.setStatus("DRAFT"); // Lưu nháp chờ duyệt thủ công
            var exportDoc = inventoryDocumentService.createExport(exportReq);
            stocktake.setReferenceExportId(exportDoc.getId());
        }

        stocktake.setStatus("POSTED");
        return toResponse(stocktakeRepository.save(stocktake));
    }

    private void validateRequest(StocktakeRequest req) {
        if (req == null) throw new BusinessException("Dữ liệu không hợp lệ");
        if (req.getWarehouseId() == null) throw new BusinessException("Kho kiểm kê là bắt buộc");
        if (req.getLines() == null || req.getLines().isEmpty()) throw new BusinessException("Phiếu kiểm kê phải có ít nhất một dòng");
        if (req.getCreatedBy() == null) throw new BusinessException("Người tạo là bắt buộc");
    }

    private String resolveDocCode(String requestedCode) {
        String docCode = requestedCode != null && !requestedCode.trim().isEmpty() ? requestedCode.trim() : null;
        if (docCode == null) {
            docCode = codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
        }
        if (stocktakeRepository.existsByStocktakeCode(docCode)) {
            throw new BusinessException("Mã kiểm kê đã tồn tại: " + docCode);
        }
        return docCode;
    }

    private void mapLinesAndParticipants(Stocktake stocktake, StocktakeRequest req) {
        if (req.getLines() != null) {
            req.getLines().forEach(lineReq -> {
                stocktake.getLines().add(StocktakeLine.builder()
                        .stocktake(stocktake)
                        .variantId(lineReq.getVariantId())
                        .bookQty(lineReq.getBookQty())
                        .countQty(lineReq.getCountQty())
                        .diffQty(lineReq.getDiffQty())
                        .goodQty(lineReq.getGoodQty())
                        .badQty(lineReq.getBadQty())
                        .lostQty(lineReq.getLostQty())
                        .action(lineReq.getAction())
                        .build());
            });
        }
        if (req.getParticipants() != null) {
            req.getParticipants().forEach(partReq -> {
                stocktake.getParticipants().add(StocktakeParticipant.builder()
                        .stocktake(stocktake)
                        .fullName(partReq.getFullName())
                        .title(partReq.getTitle())
                        .represent(partReq.getRepresent())
                        .build());
            });
        }
    }

    private StocktakeResponse toResponse(Stocktake entity) {
        Warehouse warehouse = null;
        if (entity.getWarehouseId() != null) {
            warehouse = warehouseRepository.findById(entity.getWarehouseId()).orElse(null);
        }

        List<StocktakeLineResponse> lineResponses = entity.getLines().stream().map(line -> {
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
            Product product = variant != null ? variant.getProduct() : null;
            return StocktakeLineResponse.builder()
                    .id(line.getId())
                    .variantId(line.getVariantId())
                    .itemCode(product != null ? product.getProductCode() : (variant != null ? "VT-" + variant.getId() : null))
                    .sku(variant != null ? variant.getSku() : null)
                    .itemName(product != null ? product.getProductName() + (variant.getVariantName() != null ? " (" + variant.getVariantName() + ")" : "") : null)
                    .unit(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                    .bookQty(line.getBookQty())
                    .countQty(line.getCountQty())
                    .diffQty(line.getDiffQty())
                    .goodQty(line.getGoodQty())
                    .badQty(line.getBadQty())
                    .lostQty(line.getLostQty())
                    .action(line.getAction())
                    .build();
        }).collect(Collectors.toList());

        List<StocktakeParticipantResponse> participantResponses = entity.getParticipants().stream().map(p ->
                StocktakeParticipantResponse.builder()
                        .id(p.getId())
                        .fullName(p.getFullName())
                        .title(p.getTitle())
                        .represent(p.getRepresent())
                        .build()
        ).collect(Collectors.toList());

        return StocktakeResponse.builder()
                .id(entity.getId())
                .stocktakeCode(entity.getStocktakeCode())
                .warehouseId(entity.getWarehouseId())
                .warehouseName(warehouse != null ? warehouse.getName() : null)
                .purpose(entity.getPurpose())
                .stocktakeDate(entity.getStocktakeDate())
                .conclusion(entity.getConclusion())
                .status(entity.getStatus())
                .referenceImportId(entity.getReferenceImportId())
                .referenceExportId(entity.getReferenceExportId())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .lines(lineResponses)
                .participants(participantResponses)
                .build();
    }
}
