package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.StocktakeLineRequest;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.dto.response.StocktakeLineResponse;
import com.duylongtech.backend.dto.response.StocktakeLineSerialResponse;
import com.duylongtech.backend.dto.response.StocktakeParticipantResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StocktakeServiceImpl  implements StocktakeService {

    private final StocktakeRepository stocktakeRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final com.duylongtech.backend.mapper.StocktakeMapper stocktakeMapper;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final SerialNumberRepository serialNumberRepository;

    @Autowired(required = false)
    private UserWarehouseRoleRepository userWarehouseRoleRepository;

    @Transactional(readOnly = true)
    public String generateNextStocktakeCode() {
        return codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
    }

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, LocalDate fromDate,
            LocalDate toDate, Pageable pageable) {
        return searchStocktakes(stocktakeCode, status, null, fromDate, toDate, pageable, null);
    }

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, Long warehouseId,
            LocalDate fromDate, LocalDate toDate, Pageable pageable, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        String normalizedCode = stocktakeCode != null && !stocktakeCode.trim().isEmpty() ? stocktakeCode.trim() : null;
        String normalizedStatus = status != null && !status.trim().isEmpty() ? status.trim() : null;

        List<Long> allowedWarehouseIds = null;

        if (userPrincipal != null && userWarehouseRoleRepository != null) {
            boolean isAdminOrManager = userPrincipal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority() != null && (
                            a.getAuthority().contains("ADMIN") ||
                            a.getAuthority().contains("MANAGER")
                    ));

            if (!isAdminOrManager) {
                List<UserWarehouseRole> roles = userWarehouseRoleRepository.findByUserId(userPrincipal.getId());
                List<Long> assignedWarehouseIds = roles.stream()
                        .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                        .map(UserWarehouseRole::getWarehouseId)
                        .distinct()
                        .toList();

                if (assignedWarehouseIds.isEmpty()) {
                    return Page.empty(pageable);
                }

                if (warehouseId != null) {
                    if (!assignedWarehouseIds.contains(warehouseId)) {
                        return Page.empty(pageable);
                    }
                } else {
                    allowedWarehouseIds = assignedWarehouseIds;
                }
            }
        }

        Page<Stocktake> page = stocktakeRepository.searchStocktakes(normalizedCode, normalizedStatus, fromDate, toDate,
                warehouseId, allowedWarehouseIds, pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id) {
        return getStocktakeDetail(id, null);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        if (userPrincipal != null && userWarehouseRoleRepository != null) {
            boolean isAdminOrManager = userPrincipal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority() != null && (
                            a.getAuthority().contains("ADMIN") ||
                            a.getAuthority().contains("MANAGER")
                    ));

            if (!isAdminOrManager) {
                List<UserWarehouseRole> roles = userWarehouseRoleRepository.findByUserId(userPrincipal.getId());
                boolean hasAccess = roles.stream()
                        .anyMatch(r -> Boolean.TRUE.equals(r.getIsActive()) && r.getWarehouseId().equals(stocktake.getWarehouseId()));
                if (!hasAccess) {
                    throw new BusinessException("Bạn không có quyền truy cập phiếu kiểm kê của kho này");
                }
            }
        }

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
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }

        String requestedCode = req.getStocktakeCode() != null ? req.getStocktakeCode().trim() : null;
        if (requestedCode != null && !requestedCode.equals(stocktake.getStocktakeCode())) {
            if (stocktakeRepository.existsByStocktakeCode(requestedCode)) {
                throw new BusinessException(SystemMessage.STK_ERR_006.getMessage());
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
            throw new BusinessException(SystemMessage.STK_ERR_005.getMessage());
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
            throw new BusinessException(SystemMessage.STK_ERR_004.getMessage());
        if (req.getWarehouseId() == null)
            throw new BusinessException(SystemMessage.STK_ERR_003.getMessage());
        if (req.getLines() == null || req.getLines().isEmpty())
            throw new BusinessException(SystemMessage.STK_ERR_002.getMessage());
        if (req.getCreatedBy() == null)
            throw new BusinessException(SystemMessage.ASM_ERR_026.getMessage());

        Set<Long> seenVariants = new HashSet<>();
        for (StocktakeLineRequest line : req.getLines()) {
            if (line.getVariantId() == null) {
                throw new BusinessException(SystemMessage.STK_ERR_008.getMessage());
            }
            if (!seenVariants.add(line.getVariantId())) {
                throw new BusinessException(SystemMessage.STK_ERR_007.getMessage());
            }
        }
    }

    private String resolveDocCode(String requestedCode) {
        String docCode = requestedCode != null && !requestedCode.trim().isEmpty() ? requestedCode.trim() : null;
        if (docCode == null) {
            docCode = codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
        }
        if (stocktakeRepository.existsByStocktakeCode(docCode)) {
            throw new BusinessException(String.format(SystemMessage.STK_ERR_001.getMessage(), docCode));
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
        StocktakeResponse response = stocktakeMapper.toResponse(entity);
        
        if (entity.getWarehouseId() != null) {
            warehouseRepository.findById(entity.getWarehouseId())
                    .ifPresent(w -> response.setWarehouseName(w.getName()));
        }

        if (entity.getLines() != null) {
            List<StocktakeLineResponse> lineResponses = entity.getLines().stream().map(line -> {
                StocktakeLineResponse lineResp = stocktakeMapper.toLineResponse(line);
                ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
                Product product = variant != null ? variant.getProduct() : null;

                if (line.getSerials() != null) {
                    lineResp.setSerials(line.getSerials().stream()
                            .map(stocktakeMapper::toSerialResponse)
                            .collect(Collectors.toList()));
                }

                Boolean trackSerial = (product != null && Boolean.TRUE.equals(product.getTrackSerial()));
                
                lineResp.setItemCode(product != null ? product.getProductCode() : (variant != null ? "VT-" + variant.getId() : null));
                lineResp.setSku(variant != null ? variant.getSku() : null);
                lineResp.setItemName(product != null
                        ? product.getProductName() + (variant.getVariantName() != null ? " (" + variant.getVariantName() + ")" : "")
                        : null);
                lineResp.setUnit(product != null && product.getUnit() != null ? product.getUnit().getName() : null);
                lineResp.setTrackSerial(trackSerial);
                return lineResp;
            }).collect(Collectors.toList());
            response.setLines(lineResponses);
        }

        if (entity.getParticipants() != null) {
            response.setParticipants(entity.getParticipants().stream()
                    .map(stocktakeMapper::toParticipantResponse)
                    .collect(Collectors.toList()));
        }

        return response;
    }
}
