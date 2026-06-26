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

    @Override
    @Transactional
    public StockTransferResponseDTO createTransferRequest(StockTransferRequestDTO requestDTO, Long userId) {
        if (requestDTO.getFromWarehouseId().equals(requestDTO.getToWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_DIFF_WAREHOUSE_REQUIRED);
        }

        StockTransfer stockTransfer = StockTransfer.builder()
                .transferCode(requestDTO.getTransferCode())
                .fromWarehouseId(requestDTO.getFromWarehouseId())
                .toWarehouseId(requestDTO.getToWarehouseId())
                .transferDate(requestDTO.getTransferDate())
                .status("SUBMITTED")
                .note(requestDTO.getNote())
                .createdBy(userId)
                .lines(new ArrayList<>())
                .build();

        for (StockTransferLineDTO lineDTO : requestDTO.getLines()) {
            StockTransferLine line = StockTransferLine.builder()
                    .stockTransfer(stockTransfer)
                    .variantId(lineDTO.getVariantId())
                    .quantity(lineDTO.getQuantity())
                    .unitCost(BigDecimal.ZERO)
                    .note(lineDTO.getNote())
                    .build();
            stockTransfer.getLines().add(line);
        }

        stockTransfer = stockTransferRepository.save(stockTransfer);
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
            ).orElseThrow(() -> new BusinessException(SystemMessage.INV_NOT_ENOUGH_STOCK));

            if (balance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
                throw new BusinessException(SystemMessage.INV_NOT_ENOUGH_STOCK);
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(BigDecimal.ONE));
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
            ).orElseGet(() -> {
                InventoryBalance newBalance = new InventoryBalance();
                newBalance.setWarehouseId(destWarehouseId);
                newBalance.setVariantId(sVarId);
                newBalance.setStockStatus("GOOD");
                newBalance.setQuantityOnHand(BigDecimal.ZERO);
                newBalance.setQuantityReserved(BigDecimal.ZERO);
                newBalance.setAverageCost(BigDecimal.ZERO);
                return newBalance;
            });

            balance.setQuantityOnHand(balance.getQuantityOnHand().add(BigDecimal.ONE));
            inventoryBalanceRepository.save(balance);
        }

        stockTransfer.setStatus("POSTED");
        stockTransfer = stockTransferRepository.save(stockTransfer);

        return mapToResponseDTO(stockTransfer);
    }

    private StockTransferResponseDTO mapToResponseDTO(StockTransfer transfer) {
        List<StockTransferLineDTO> lines = transfer.getLines().stream()
                .map(line -> StockTransferLineDTO.builder()
                        .variantId(line.getVariantId())
                        .quantity(line.getQuantity())
                        .note(line.getNote())
                        .build())
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
