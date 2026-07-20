package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.* ;
import com.duylongtech.backend.entity.* ;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.* ;
import com.duylongtech.backend.service.StockTransferService;
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

    private final ObjectMapper objectMapper = new ObjectMapper();

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
            transferCode = "CK-" + System.currentTimeMillis();
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

            StockTransferLine line = StockTransferLine.builder()
                    .stockTransfer(stockTransfer)
                    .variantId(lineDTO.getVariantId())
                    .quantity(lineDTO.getQuantity())
                    .unitCost(lineDTO.getUnitCost() != null ? lineDTO.getUnitCost() : BigDecimal.ZERO)
                    .serialNumbersText(serialsJson)
                    .note(lineDTO.getNote())
                    .build();
            stockTransfer.getLines().add(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if ("POSTED".equals(stockTransfer.getStatus())) {
            processInventoryForTransfer(stockTransfer);
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

            StockTransferLine line = StockTransferLine.builder()
                    .stockTransfer(stockTransfer)
                    .variantId(lineDTO.getVariantId())
                    .quantity(lineDTO.getQuantity())
                    .unitCost(lineDTO.getUnitCost() != null ? lineDTO.getUnitCost() : BigDecimal.ZERO)
                    .serialNumbersText(serialsJson)
                    .note(lineDTO.getNote())
                    .build();
            stockTransfer.getLines().add(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);

        if ("POSTED".equals(stockTransfer.getStatus())) {
            processInventoryForTransfer(stockTransfer);
        }

        return mapToResponseDTO(stockTransfer);
    }

    @Override
    @Transactional
    public StockTransferResponseDTO dispatchTransfer(Long transferId, StockTransferDispatchDTO dispatchDTO, Long userId) {
        StockTransfer stockTransfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new BusinessException(SystemMessage.INV_DOC_NOT_FOUND));

        // INV11 active stocktake check would be here if there was a Stocktake entity.
        // Assuming we check it via some logic, omitted for simplicity if not provided.

        List<SerialNumber> serials = serialNumberRepository.findBySerialNumberIn(dispatchDTO.getSerialNumbers());

        if (serials.size() != dispatchDTO.getSerialNumbers().size()) {
             throw new BusinessException(SystemMessage.INV_SERIAL_MISSING);
        }

        for (SerialNumber serial : serials) {
            if (!serial.getWarehouseId().equals(stockTransfer.getFromWarehouseId())) {
                throw new BusinessException(SystemMessage.INV_SERIAL_NOT_FOUND);
            }
            if (!"AVAILABLE".equals(serial.getStatus())) {
                throw new BusinessException(SystemMessage.INV_INVALID_STATE);
            }

            // Mark as IN_TRANSIT
            serial.setStatus("IN_TRANSIT");
            serialNumberRepository.save(serial);

            // Deduct stock from InventoryBalance
            InventoryBalance balance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                    stockTransfer.getFromWarehouseId(), serial.getVariantId(), "GOOD"
            ).orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                        stockTransfer.getFromWarehouseId(), serial.getVariantId()
                );
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                throw new BusinessException(SystemMessage.INV_NOT_ENOUGH_STOCK);
            }

            if (balance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
                throw new BusinessException(SystemMessage.INV_NOT_ENOUGH_STOCK);
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(BigDecimal.ONE));
            balance.setUpdatedAt(java.time.LocalDateTime.now());
            inventoryBalanceRepository.save(balance);
        }

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

        List<SerialNumber> serials = serialNumberRepository.findBySerialNumberIn(receiptDTO.getSerialNumbers());

        final Long destWarehouseId = stockTransfer.getToWarehouseId();

        for (SerialNumber serial : serials) {
            if (!"IN_TRANSIT".equals(serial.getStatus())) {
                // Wrong item
                throw new BusinessException(SystemMessage.INV_SERIAL_NOT_FOUND);
            }

            serial.setStatus("AVAILABLE");
            serial.setWarehouseId(destWarehouseId);
            serialNumberRepository.save(serial);

            final Long sVarId = serial.getVariantId();

            // Add stock to destination
            InventoryBalance balance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                    destWarehouseId, sVarId, "GOOD"
            ).orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                        destWarehouseId, sVarId
                );
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                InventoryBalance newBalance = new InventoryBalance();
                newBalance.setWarehouseId(destWarehouseId);
                newBalance.setVariantId(sVarId);
                newBalance.setStockStatus("GOOD");
                newBalance.setQuantityOnHand(BigDecimal.ZERO);
                newBalance.setQuantityReserved(BigDecimal.ZERO);
                newBalance.setAverageCost(BigDecimal.ZERO);
                newBalance.setUpdatedAt(java.time.LocalDateTime.now());
                balance = newBalance;
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().add(BigDecimal.ONE));
            balance.setUpdatedAt(java.time.LocalDateTime.now());
            inventoryBalanceRepository.save(balance);
        }

        stockTransfer.setStatus("POSTED");
        stockTransfer = stockTransferRepository.save(stockTransfer);

        return mapToResponseDTO(stockTransfer);
    }

    private void processInventoryForTransfer(StockTransfer stockTransfer) {
        Long fromWhId = stockTransfer.getFromWarehouseId();
        Long toWhId = stockTransfer.getToWarehouseId();

        for (StockTransferLine line : stockTransfer.getLines()) {
            BigDecimal qty = line.getQuantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            Long variantId = line.getVariantId();
            
            List<String> serials = new ArrayList<>();
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isEmpty()) {
                try {
                    serials = objectMapper.readValue(line.getSerialNumbersText(), new TypeReference<List<String>>(){});
                } catch (Exception e) {}
            }

            if (!serials.isEmpty()) {
                if (serials.size() != qty.intValue()) {
                    throw new BusinessException("Số lượng serial không khớp với số lượng hàng cần chuyển.");
                }
                for (String sCode : serials) {
                    SerialNumber serial = serialNumberRepository.findBySerialNumber(sCode)
                            .orElseThrow(() -> new BusinessException("Không tìm thấy Serial: " + sCode));
                    if (!serial.getWarehouseId().equals(fromWhId)) {
                        throw new BusinessException("Serial " + sCode + " không nằm trong kho xuất.");
                    }
                    if (!"AVAILABLE".equals(serial.getStatus())) {
                        throw new BusinessException("Serial " + sCode + " không ở trạng thái AVAILABLE.");
                    }
                    serial.setWarehouseId(toWhId);
                    serialNumberRepository.save(serial);
                }
            }

            // Deduct from source
            InventoryBalance sourceBalance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(fromWhId, variantId, "GOOD")
                    .orElse(null);

            if (sourceBalance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(fromWhId, variantId);
                sourceBalance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (sourceBalance == null) {
                throw new BusinessException("Kho xuất không đủ tồn kho mặt hàng này.");
            }
            if (sourceBalance.getQuantityOnHand().compareTo(qty) < 0) {
                throw new BusinessException("Kho xuất không đủ tồn kho mặt hàng này.");
            }
            sourceBalance.setQuantityOnHand(sourceBalance.getQuantityOnHand().subtract(qty));
            sourceBalance.setUpdatedAt(java.time.LocalDateTime.now());
            inventoryBalanceRepository.save(sourceBalance);

            // Add to destination
            InventoryBalance destBalance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(toWhId, variantId, "GOOD")
                    .orElse(null);

            if (destBalance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(toWhId, variantId);
                destBalance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (destBalance == null) {
                InventoryBalance newBalance = new InventoryBalance();
                newBalance.setWarehouseId(toWhId);
                newBalance.setVariantId(variantId);
                newBalance.setStockStatus("GOOD");
                newBalance.setQuantityOnHand(BigDecimal.ZERO);
                newBalance.setQuantityReserved(BigDecimal.ZERO);
                newBalance.setAverageCost(BigDecimal.ZERO);
                newBalance.setUpdatedAt(java.time.LocalDateTime.now());
                destBalance = newBalance;
            }
            destBalance.setQuantityOnHand(destBalance.getQuantityOnHand().add(qty));
            destBalance.setUpdatedAt(java.time.LocalDateTime.now());
            inventoryBalanceRepository.save(destBalance);
        }
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
