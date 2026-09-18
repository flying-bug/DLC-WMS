package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.feature.warehouse.StockTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/stock-transfers")
public class StockTransferController {

    @Autowired
    private StockTransferService stockTransferService;

    @GetMapping("/next-code")
    @PreAuthorize("hasAuthority('transfer:view') or hasAuthority('transfer:add')")
    public ResponseEntity<com.duylongtech.backend.common.ApiResponse<String>> getNextTransferCode() {
        String nextCode = stockTransferService.generateNextTransferCode();
        return ResponseEntity.ok(com.duylongtech.backend.common.ApiResponse.<String>builder()
                .success(true)
                .data(nextCode)
                .build());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('transfer:view')")
    public ResponseEntity<List<StockTransferResponseDTO>> getTransferHistory(
            @RequestParam(required = false) String transferCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status) {
        List<StockTransferResponseDTO> response = stockTransferService.getTransferHistory(transferCode, fromDate, toDate, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('transfer:view')")
    public ResponseEntity<StockTransferResponseDTO> getTransferDetail(@PathVariable("id") Long transferId) {
        StockTransferResponseDTO response = stockTransferService.getTransferDetail(transferId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('transfer:add')")
    public ResponseEntity<StockTransferResponseDTO> createTransferRequest(
            @RequestBody StockTransferRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        StockTransferResponseDTO response = stockTransferService.createTransferRequest(requestDTO, userPrincipal.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('transfer:edit')")
    public ResponseEntity<StockTransferResponseDTO> updateTransferRequest(
            @PathVariable("id") Long transferId,
            @RequestBody StockTransferRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        StockTransferResponseDTO response = stockTransferService.updateTransferRequest(transferId, requestDTO, userPrincipal.getId());
        return ResponseEntity.ok(response);
    }

}
