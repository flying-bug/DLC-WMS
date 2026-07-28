package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.service.StocktakeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/stocktakes")
@RequiredArgsConstructor
public class StocktakeController {

    private final StocktakeService stocktakeService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StocktakeResponse>>> searchStocktakes(
            @RequestParam(required = false) String stocktakeCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<StocktakeResponse> responses = stocktakeService.searchStocktakes(stocktakeCode, status, fromDate, toDate, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<StocktakeResponse>>builder()
                .success(true)
                .data(responses)
                .userMessage("Lấy danh sách phiếu kiểm kê thành công")
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StocktakeResponse>> getStocktakeDetail(@PathVariable Long id) {
        StocktakeResponse response = stocktakeService.getStocktakeDetail(id);
        return ResponseEntity.ok(ApiResponse.<StocktakeResponse>builder()
                .success(true)
                .data(response)
                .userMessage("Lấy chi tiết phiếu kiểm kê thành công")
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StocktakeResponse>> createStocktake(
            @RequestBody StocktakeRequest request,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        if (request.getCreatedBy() == null && userPrincipal != null) {
            request.setCreatedBy(userPrincipal.getId());
        }
        StocktakeResponse response = stocktakeService.createStocktake(request);
        return ResponseEntity.ok(ApiResponse.<StocktakeResponse>builder()
                .success(true)
                .data(response)
                .userMessage("Tạo phiếu kiểm kê thành công")
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StocktakeResponse>> updateStocktake(
            @PathVariable Long id,
            @RequestBody StocktakeRequest request,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        if (request.getCreatedBy() == null && userPrincipal != null) {
            request.setCreatedBy(userPrincipal.getId());
        }
        StocktakeResponse response = stocktakeService.updateStocktake(id, request);
        return ResponseEntity.ok(ApiResponse.<StocktakeResponse>builder()
                .success(true)
                .data(response)
                .userMessage("Cập nhật phiếu kiểm kê thành công")
                .build());
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<StocktakeResponse>> postStocktake(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        Long processedBy = userPrincipal != null ? userPrincipal.getId() : null;
        StocktakeResponse response = stocktakeService.postStocktake(id, processedBy);
        return ResponseEntity.ok(ApiResponse.<StocktakeResponse>builder()
                .success(true)
                .data(response)
                .userMessage("Xử lý phiếu kiểm kê thành công, các phiếu điều chỉnh lưu nháp đã được sinh ra.")
                .build());
    }
}
