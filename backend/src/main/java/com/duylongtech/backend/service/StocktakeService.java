package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.dto.response.StocktakeLineResponse;
import com.duylongtech.backend.dto.response.StocktakeLineSerialResponse;
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
    private final SerialNumberRepository serialNumberRepository;

    @Transactional(readOnly = true)
    public String generateNextStocktakeCode() {
        return codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
    }

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, LocalDate fromDate,
            LocalDate toDate, Pageable pageable) {
        String normalizedCode = stocktakeCode != null && !stocktakeCode.trim().isEmpty() ? stocktakeCode.trim() : null;
        String normalizedStatus = status != null && !status.trim().isEmpty() ? status.trim() : null;
        Page<Stocktake> page = stocktakeRepository.searchStocktakes(normalizedCode, normalizedStatus, fromDate, toDate,
                pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        return toResponse(stocktake);
    }

    @Transactional(readOnly = true)
    public List<SerialNumber> getAvailableSerials(Long warehouseId, Long variantId) {
        if (warehouseId == null || variantId == null) {
            return new ArrayList<>();
        }
        return serialNumberRepository.findByWarehouseIdAndVariantIdAndStatus(warehouseId, variantId, "AVAILABLE");
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
        stocktake.setStocktakeDate(
                req.getStocktakeDate() != null ? req.getStocktakeDate() : stocktake.getStocktakeDate());
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

        for (StocktakeLine line : stocktake.getLines()) {
            // Process serial updates if available
            if (line.getSerials() != null && !line.getSerials().isEmpty()) {
                for (StocktakeLineSerial sLine : line.getSerials()) {
                    if ("MISSING".equals(sLine.getScanStatus())) {
                        if (sLine.getSerialNumberId() != null) {
                            serialNumberRepository.findById(sLine.getSerialNumberId()).ifPresent(sn -> {
                                sn.setStatus("LOST");
                                serialNumberRepository.save(sn);
                            });
                        }
                    } else if ("UNEXPECTED".equals(sLine.getScanStatus())) {
                        Optional<SerialNumber> existingOpt = serialNumberRepository
                                .findByVariantIdAndSerialNumber(line.getVariantId(), sLine.getSerialNumber());
                        if (existingOpt.isPresent()) {
                            SerialNumber sn = existingOpt.get();
                            sn.setWarehouseId(stocktake.getWarehouseId());
                            sn.setStatus("AVAILABLE");
                            serialNumberRepository.save(sn);
                        } else {
                            SerialNumber newSn = SerialNumber.builder()
                                    .variantId(line.getVariantId())
                                    .warehouseId(stocktake.getWarehouseId())
                                    .serialNumber(sLine.getSerialNumber())
                                    .status("AVAILABLE")
                                    .importedAt(LocalDateTime.now())
                                    .build();
                            serialNumberRepository.save(newSn);
                        }
                    }
                }
            }
        }

        stocktake.setStatus("POSTED");
        return toResponse(stocktakeRepository.save(stocktake));
    }

    private void validateRequest(StocktakeRequest req) {
        if (req == null)
            throw new BusinessException("Dữ liệu không hợp lệ");
        if (req.getWarehouseId() == null)
            throw new BusinessException("Kho kiểm kê là bắt buộc");
        if (req.getLines() == null || req.getLines().isEmpty())
            throw new BusinessException("Phiếu kiểm kê phải có ít nhất một dòng");
        if (req.getCreatedBy() == null)
            throw new BusinessException("Người tạo là bắt buộc");
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
                StocktakeLine line = StocktakeLine.builder()
                        .stocktake(stocktake)
                        .variantId(lineReq.getVariantId())
                        .bookQty(lineReq.getBookQty())
                        .countQty(lineReq.getCountQty())
                        .diffQty(lineReq.getDiffQty())
                        .goodQty(lineReq.getGoodQty())
                        .badQty(lineReq.getBadQty())
                        .lostQty(lineReq.getLostQty())
                        .action(lineReq.getAction())
                        .build();

                if (lineReq.getSerials() != null && !lineReq.getSerials().isEmpty()) {
                    lineReq.getSerials().forEach(sReq -> {
                        line.getSerials().add(StocktakeLineSerial.builder()
                                .stocktakeLine(line)
                                .serialNumberId(sReq.getSerialNumberId())
                                .serialNumber(sReq.getSerialNumber())
                                .scanStatus(sReq.getScanStatus() != null ? sReq.getScanStatus() : "MATCHED")
                                .note(sReq.getNote())
                                .build());
                    });
                }

                stocktake.getLines().add(line);
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

            List<StocktakeLineSerialResponse> serialResponses = line.getSerials().stream()
                    .map(s -> StocktakeLineSerialResponse.builder()
                            .id(s.getId())
                            .serialNumberId(s.getSerialNumberId())
                            .serialNumber(s.getSerialNumber())
                            .scanStatus(s.getScanStatus())
                            .note(s.getNote())
                            .build())
                    .collect(Collectors.toList());

            Boolean trackSerial = (product != null && Boolean.TRUE.equals(product.getTrackSerial()));

            return StocktakeLineResponse.builder()
                    .id(line.getId())
                    .variantId(line.getVariantId())
                    .itemCode(product != null ? product.getProductCode()
                            : (variant != null ? "VT-" + variant.getId() : null))
                    .sku(variant != null ? variant.getSku() : null)
                    .itemName(product != null
                            ? product.getProductName()
                                    + (variant.getVariantName() != null ? " (" + variant.getVariantName() + ")" : "")
                            : null)
                    .unit(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                    .trackSerial(trackSerial)
                    .bookQty(line.getBookQty())
                    .countQty(line.getCountQty())
                    .diffQty(line.getDiffQty())
                    .goodQty(line.getGoodQty())
                    .badQty(line.getBadQty())
                    .lostQty(line.getLostQty())
                    .action(line.getAction())
                    .serials(serialResponses)
                    .build();
        }).collect(Collectors.toList());

        List<StocktakeParticipantResponse> participantResponses = entity.getParticipants().stream()
                .map(p -> StocktakeParticipantResponse.builder()
                        .id(p.getId())
                        .fullName(p.getFullName())
                        .title(p.getTitle())
                        .represent(p.getRepresent())
                        .build())
                .collect(Collectors.toList());

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
