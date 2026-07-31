package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.* ;
import com.duylongtech.backend.entity.* ;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.* ;
import com.duylongtech.backend.service.StockTransferService;
import com.duylongtech.backend.service.InventoryDocumentService;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
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

@Service
public class StockTransferServiceImpl implements StockTransferService {

    @Autowired
    private StockTransferRepository stockTransferRepository;

    @Autowired
    private StockTransferLineRepository stockTransferLineRepository;

    @Autowired
    private SerialNumberRepository serialNumberRepository;

    @Autowired
    private InventoryBalanceRepository inventoryBalanceRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private InventoryDocumentService inventoryDocumentService;

    @Autowired
    private com.duylongtech.backend.service.CodeGeneratorService codeGeneratorService;

    @Override
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

    @Override
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

    @Override
    @Transactional(readOnly = true)
    public StockTransferResponseDTO getTransferDetail(Long transferId) {
        StockTransfer stockTransfer = stockTransferRepository.findByIdWithLines(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));
        return mapToResponseDTO(stockTransfer);
    }

    @Override
    @Transactional
    public StockTransferResponseDTO createTransferRequest(StockTransferRequestDTO requestDTO, Long userId) {
        if (requestDTO.getFromWarehouseId().equals(requestDTO.getToWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_DIFF_WAREHOUSE_REQUIRED);
        }

        String transferCode = requestDTO.getTransferCode();
        if (transferCode == null || transferCode.trim().isEmpty()) {
            transferCode = generateNextTransferCode();
        }

        StockTransfer stockTransfer = StockTransfer.builder()
                .transferCode(transferCode)
                .fromWarehouseId(requestDTO.getFromWarehouseId())
                .toWarehouseId(requestDTO.getToWarehouseId())
                .transferDate(requestDTO.getTransferDate() != null ? requestDTO.getTransferDate() : java.time.LocalDate.now())
                .status(requestDTO.getStatus() != null ? requestDTO.getStatus() : "DRAFT")
                .note(requestDTO.getNote())
                .createdBy(userId)
                .lines(new ArrayList<>())
                .build();

        for (StockTransferLineDTO lineDTO : requestDTO.getLines()) {
            String serialsJson = null;
            if (lineDTO.getSerialNumbers() != null && !lineDTO.getSerialNumbers().isEmpty()) {
                try {
                    serialsJson = objectMapper.writeValueAsString(lineDTO.getSerialNumbers());
                } catch (JsonProcessingException e) {
                    throw new BusinessException("Lỗi định dạng Serial Numbers.");
                }
            }

            BigDecimal unitCost = resolveTransferUnitCost(requestDTO.getFromWarehouseId(), lineDTO.getVariantId(), lineDTO.getUnitCost());
            StockTransferLine line = StockTransferLine.builder()
                    .stockTransfer(stockTransfer)
                    .variantId(lineDTO.getVariantId())
                    .quantity(lineDTO.getQuantity())
                    .unitCost(unitCost)
                    .serialNumbersText(serialsJson)
                    .note(lineDTO.getNote())
                    .build();
            stockTransfer.getLines().add(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if ("POSTED".equals(stockTransfer.getStatus())) {
            processInventoryForTransfer(stockTransfer, userId);
        }

        return mapToResponseDTO(stockTransfer);
    }

    @Override
    @Transactional
    public StockTransferResponseDTO updateTransferRequest(Long transferId, StockTransferRequestDTO requestDTO, Long userId) {
        StockTransfer stockTransfer = stockTransferRepository.findByIdWithLines(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));

        if (!"DRAFT".equals(stockTransfer.getStatus()) && !"SUBMITTED".equals(stockTransfer.getStatus())) {
            throw new BusinessException("Chỉ được phép sửa phiếu khi ở trạng thái Lưu nháp.");
        }

        if (requestDTO.getFromWarehouseId().equals(requestDTO.getToWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_DIFF_WAREHOUSE_REQUIRED);
        }

        stockTransfer.setFromWarehouseId(requestDTO.getFromWarehouseId());
        stockTransfer.setToWarehouseId(requestDTO.getToWarehouseId());
        stockTransfer.setTransferDate(requestDTO.getTransferDate() != null ? requestDTO.getTransferDate() : stockTransfer.getTransferDate());
        if (requestDTO.getStatus() != null) {
            stockTransfer.setStatus(requestDTO.getStatus());
        }
        stockTransfer.setNote(requestDTO.getNote());

        stockTransferLineRepository.deleteAll(stockTransfer.getLines());
        stockTransfer.getLines().clear();

        for (StockTransferLineDTO lineDTO : requestDTO.getLines()) {
            String serialsJson = null;
            if (lineDTO.getSerialNumbers() != null && !lineDTO.getSerialNumbers().isEmpty()) {
                try {
                    serialsJson = objectMapper.writeValueAsString(lineDTO.getSerialNumbers());
                } catch (JsonProcessingException e) {
                    throw new BusinessException("Lỗi định dạng Serial Numbers.");
                }
            }

            BigDecimal unitCost = resolveTransferUnitCost(requestDTO.getFromWarehouseId(), lineDTO.getVariantId(), lineDTO.getUnitCost());
            StockTransferLine line = StockTransferLine.builder()
                    .stockTransfer(stockTransfer)
                    .variantId(lineDTO.getVariantId())
                    .quantity(lineDTO.getQuantity())
                    .unitCost(unitCost)
                    .serialNumbersText(serialsJson)
                    .note(lineDTO.getNote())
                    .build();
            stockTransfer.getLines().add(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if ("POSTED".equals(stockTransfer.getStatus())) {
            processInventoryForTransfer(stockTransfer, userId);
        }

        return mapToResponseDTO(stockTransfer);
    }

    @Override
    @Transactional
    public StockTransferResponseDTO dispatchTransfer(Long transferId, StockTransferDispatchDTO dispatchDTO, Long userId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));

        createAndPostExport(stockTransfer, userId);

        stockTransfer.setStatus("IN_TRANSIT");
        stockTransfer = stockTransferRepository.save(stockTransfer);

        return mapToResponseDTO(stockTransfer);
    }

    @Override
    @Transactional
    public StockTransferResponseDTO receiveTransfer(Long transferId, StockTransferReceiptDTO receiptDTO, Long userId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));

        if (!"IN_TRANSIT".equals(stockTransfer.getStatus())) {
            throw new BusinessException(SystemMessage.INV_INVALID_STATE);
        }

        java.util.Map<Long, BigDecimal> exportedCosts = new java.util.HashMap<>();
        List<InventoryDocumentResponse> exports = inventoryDocumentService.getExportHistory(
                null, null, null, "POSTED", stockTransfer.getFromWarehouseId(),
                InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT, "STOCK_TRANSFER", stockTransfer.getId()
        );
        if (exports != null && !exports.isEmpty()) {
            InventoryDocumentResponse exportDoc = exports.get(0);
            if (exportDoc.getLines() != null) {
                for (com.duylongtech.backend.dto.response.InventoryDocumentLineResponse l : exportDoc.getLines()) {
                    if (l.getUnitCost() != null && l.getUnitCost().compareTo(BigDecimal.ZERO) > 0) {
                        exportedCosts.put(l.getVariantId(), l.getUnitCost());
                    }
                }
            }
        }

        createAndPostImport(stockTransfer, exportedCosts, userId);

        stockTransfer.setStatus("POSTED");
        stockTransfer = stockTransferRepository.save(stockTransfer);

        return mapToResponseDTO(stockTransfer);
    }

    private void processInventoryForTransfer(StockTransfer stockTransfer, Long userId) {
        java.util.Map<Long, BigDecimal> exportedCosts = createAndPostExport(stockTransfer, userId);
        createAndPostImport(stockTransfer, exportedCosts, userId);
    }

    private java.util.Map<Long, BigDecimal> createAndPostExport(StockTransfer stockTransfer, Long userId) {
        InventoryDocumentRequest exportReq = new InventoryDocumentRequest();
        exportReq.setWarehouseId(stockTransfer.getFromWarehouseId());
        exportReq.setDocDate(java.time.LocalDate.now());
        exportReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT);
        exportReq.setReferenceType("STOCK_TRANSFER");
        exportReq.setReferenceId(stockTransfer.getId());
        exportReq.setCreatedBy(userId);
        exportReq.setNote("Tự động xuất kho cho phiếu chuyển kho " + stockTransfer.getTransferCode());
        exportReq.setLines(new ArrayList<>());

        for (StockTransferLine line : stockTransfer.getLines()) {
            BigDecimal qty = line.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal unitCost = resolveTransferUnitCost(stockTransfer.getFromWarehouseId(), line.getVariantId(), line.getUnitCost());

            List<String> serials = new ArrayList<>();
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isEmpty()) {
                try {
                    serials = objectMapper.readValue(line.getSerialNumbersText(), new TypeReference<List<String>>(){});
                } catch (Exception e) {}
            }

            if (!serials.isEmpty()) {
                for (String sCode : serials) {
                    SerialNumber serial = serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), sCode)
                            .orElseThrow(() -> new BusinessException("Không tìm thấy Serial: " + sCode));
                    
                    InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
                    lineReq.setVariantId(line.getVariantId());
                    lineReq.setQuantityOut(BigDecimal.ONE);
                    lineReq.setSerialNumberId(serial.getId());
                    lineReq.setUnitCost(unitCost);
                    exportReq.getLines().add(lineReq);
                }
            } else {
                InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
                lineReq.setVariantId(line.getVariantId());
                lineReq.setQuantityOut(qty);
                lineReq.setUnitCost(unitCost);
                exportReq.getLines().add(lineReq);
            }
        }
        
        InventoryDocumentResponse created = inventoryDocumentService.createExport(exportReq);
        InventoryDocumentResponse posted = inventoryDocumentService.postExport(created.getId());

        java.util.Map<Long, BigDecimal> costByVariant = new java.util.HashMap<>();
        if (posted != null && posted.getLines() != null) {
            for (com.duylongtech.backend.dto.response.InventoryDocumentLineResponse l : posted.getLines()) {
                if (l.getUnitCost() != null && l.getUnitCost().compareTo(BigDecimal.ZERO) > 0) {
                    costByVariant.put(l.getVariantId(), l.getUnitCost());
                }
            }
        }
        return costByVariant;
    }

    private void createAndPostImport(StockTransfer stockTransfer, java.util.Map<Long, BigDecimal> exportedCosts, Long userId) {
        InventoryDocumentRequest importReq = new InventoryDocumentRequest();
        importReq.setWarehouseId(stockTransfer.getToWarehouseId());
        importReq.setDocDate(java.time.LocalDate.now());
        importReq.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN);
        importReq.setReferenceType("STOCK_TRANSFER");
        importReq.setReferenceId(stockTransfer.getId());
        importReq.setCreatedBy(userId);
        importReq.setNote("Tự động nhập kho cho phiếu chuyển kho " + stockTransfer.getTransferCode());
        importReq.setLines(new ArrayList<>());

        for (StockTransferLine line : stockTransfer.getLines()) {
            BigDecimal qty = line.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal unitCost = exportedCosts != null ? exportedCosts.get(line.getVariantId()) : null;
            if (unitCost == null || unitCost.compareTo(BigDecimal.ZERO) <= 0) {
                unitCost = resolveTransferUnitCost(stockTransfer.getFromWarehouseId(), line.getVariantId(), line.getUnitCost());
            }

            if (line.getUnitCost() == null || line.getUnitCost().compareTo(BigDecimal.ZERO) <= 0) {
                line.setUnitCost(unitCost);
                stockTransferLineRepository.save(line);
            }

            List<String> serials = new ArrayList<>();
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isEmpty()) {
                try {
                    serials = objectMapper.readValue(line.getSerialNumbersText(), new TypeReference<List<String>>(){});
                } catch (Exception e) {}
            }

            InventoryDocumentLineRequest lineReq = new InventoryDocumentLineRequest();
            lineReq.setVariantId(line.getVariantId());
            lineReq.setQuantityIn(qty);
            lineReq.setUnitCost(unitCost);
            if (!serials.isEmpty()) {
                lineReq.setSerialNumbers(serials);
            }
            importReq.getLines().add(lineReq);
        }
        
        InventoryDocumentResponse created = inventoryDocumentService.createImport(importReq);
        inventoryDocumentService.postImport(created.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockTransferResponseDTO> getAllTransfers() {
        return stockTransferRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StockTransferResponseDTO getTransferById(Long transferId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));
        return mapToResponseDTO(stockTransfer);
    }

    private StockTransferResponseDTO mapToResponseDTO(StockTransfer transfer) {
        List<StockTransferLineDTO> lines = transfer.getLines().stream()
                .map(line -> {
                    List<String> serials = new ArrayList<>();
                    if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isEmpty()) {
                        try {
                            serials = objectMapper.readValue(line.getSerialNumbersText(), new TypeReference<List<String>>(){});
                        } catch (Exception e) {}
                    }
                    return StockTransferLineDTO.builder()
                        .variantId(line.getVariantId())
                        .quantity(line.getQuantity())
                        .unitCost(line.getUnitCost())
                        .serialNumbers(serials)
                        .note(line.getNote())
                        .build();
                })
                .collect(Collectors.toList());

        return StockTransferResponseDTO.builder()
                .id(transfer.getId())
                .transferCode(transfer.getTransferCode())
                .fromWarehouseId(transfer.getFromWarehouseId())
                .toWarehouseId(transfer.getToWarehouseId())
                .transferDate(transfer.getTransferDate())
                .status(transfer.getStatus())
                .note(transfer.getNote())
                .createdAt(transfer.getCreatedAt())
                .lines(lines)
                .build();
    }
}
