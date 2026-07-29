package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.StockTransferDispatchDTO;
import com.duylongtech.backend.dto.StockTransferReceiptDTO;
import com.duylongtech.backend.dto.StockTransferRequestDTO;
import com.duylongtech.backend.dto.StockTransferResponseDTO;

import java.time.LocalDate;
import java.util.List;

public interface StockTransferService {
    List<StockTransferResponseDTO> getTransferHistory(String transferCode, LocalDate fromDate, LocalDate toDate, String status);
    StockTransferResponseDTO getTransferDetail(Long transferId);
    StockTransferResponseDTO createTransferRequest(StockTransferRequestDTO requestDTO, Long userId);
    StockTransferResponseDTO updateTransferRequest(Long transferId, StockTransferRequestDTO requestDTO, Long userId);
    StockTransferResponseDTO dispatchTransfer(Long transferId, StockTransferDispatchDTO dispatchDTO, Long userId);
    StockTransferResponseDTO receiveTransfer(Long transferId, StockTransferReceiptDTO receiptDTO, Long userId);
    
    java.util.List<StockTransferResponseDTO> getAllTransfers();
    StockTransferResponseDTO getTransferById(Long transferId);
    String generateNextTransferCode();
}
