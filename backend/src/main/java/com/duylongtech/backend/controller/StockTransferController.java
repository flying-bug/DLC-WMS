package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.StockTransferDispatchDTO;
import com.duylongtech.backend.dto.StockTransferReceiptDTO;
import com.duylongtech.backend.dto.StockTransferRequestDTO;
import com.duylongtech.backend.dto.StockTransferResponseDTO;
import com.duylongtech.backend.service.StockTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock-transfers")
public class StockTransferController {

    @Autowired
    private StockTransferService stockTransferService;

    // A dummy userId for demonstration. In a real app, you would get this from Spring Security Context.
    private final Long currentUserId = 1L;

    @PostMapping
    public ResponseEntity<StockTransferResponseDTO> createTransferRequest(@RequestBody StockTransferRequestDTO requestDTO) {
        StockTransferResponseDTO response = stockTransferService.createTransferRequest(requestDTO, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/dispatch")
    public ResponseEntity<StockTransferResponseDTO> dispatchTransfer(
            @PathVariable("id") Long transferId,
            @RequestBody StockTransferDispatchDTO dispatchDTO) {
        StockTransferResponseDTO response = stockTransferService.dispatchTransfer(transferId, dispatchDTO, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<StockTransferResponseDTO> receiveTransfer(
            @PathVariable("id") Long transferId,
            @RequestBody StockTransferReceiptDTO receiptDTO) {
        StockTransferResponseDTO response = stockTransferService.receiveTransfer(transferId, receiptDTO, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<java.util.List<StockTransferResponseDTO>> getAllTransfers() {
        return ResponseEntity.ok(stockTransferService.getAllTransfers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockTransferResponseDTO> getTransferById(@PathVariable("id") Long transferId) {
        return ResponseEntity.ok(stockTransferService.getTransferById(transferId));
    }
}
