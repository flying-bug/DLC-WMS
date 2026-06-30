package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.StockTransferDispatchDTO;
import com.duylongtech.backend.dto.StockTransferReceiptDTO;
import com.duylongtech.backend.dto.StockTransferRequestDTO;
import com.duylongtech.backend.dto.StockTransferResponseDTO;
import com.duylongtech.backend.service.StockTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/stock-transfers")
public class StockTransferController {

    @Autowired
    private StockTransferService stockTransferService;

    // A dummy userId for demonstration. In a real app, you would get this from Spring Security Context.
    private final Long currentUserId = 1L;

    @GetMapping
    public ResponseEntity<List<StockTransferResponseDTO>> getTransferHistory(
            @RequestParam(required = false) String transferCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status) {
        List<StockTransferResponseDTO> response = stockTransferService.getTransferHistory(transferCode, fromDate, toDate, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StockTransferResponseDTO> getTransferDetail(@PathVariable("id") Long transferId) {
        StockTransferResponseDTO response = stockTransferService.getTransferDetail(transferId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<StockTransferResponseDTO> createTransferRequest(@RequestBody StockTransferRequestDTO requestDTO) {
        StockTransferResponseDTO response = stockTransferService.createTransferRequest(requestDTO, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StockTransferResponseDTO> updateTransferRequest(
            @PathVariable("id") Long transferId,
            @RequestBody StockTransferRequestDTO requestDTO) {
        StockTransferResponseDTO response = stockTransferService.updateTransferRequest(transferId, requestDTO, currentUserId);
        return ResponseEntity.ok(response);
    }

    // @PostMapping("/{id}/dispatch")
    // public ResponseEntity<StockTransferResponseDTO> dispatchTransfer(
    //         @PathVariable("id") Long transferId,
    //         @RequestBody StockTransferDispatchDTO dispatchDTO) {
    //     StockTransferResponseDTO response = stockTransferService.dispatchTransfer(transferId, dispatchDTO, currentUserId);
    //     return ResponseEntity.ok(response);
    // }

    // @PostMapping("/{id}/receive")
    // public ResponseEntity<StockTransferResponseDTO> receiveTransfer(
    //         @PathVariable("id") Long transferId,
    //         @RequestBody StockTransferReceiptDTO receiptDTO) {
    //     StockTransferResponseDTO response = stockTransferService.receiveTransfer(transferId, receiptDTO, currentUserId);
    //     return ResponseEntity.ok(response);
    // }
}
