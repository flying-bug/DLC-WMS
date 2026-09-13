package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeRequest;
import com.duylongtech.backend.feature.stocktake.StocktakeResponse;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.feature.stocktake.StocktakeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.duylongtech.backend.feature.product.SerialNumber;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/stocktakes")
@RequiredArgsConstructor
public class StocktakeController {

    private final StocktakeService stocktakeService;


    @GetMapping("/next-code")
    @PreAuthorize("hasAuthority('stocktake:view') or hasAuthority('stocktake:add')")
    public ResponseEntity<ApiResponse<String>> getNextStocktakeCode() {
        String nextCode = stocktakeService.generateNextStocktakeCode();
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .data(nextCode)
                .userMessage("Lấy mã phiếu kiểm kê tiếp theo thành công")
                .build());
    }

    @GetMapping("/available-serials")
    @PreAuthorize("hasAuthority('stocktake:view') or hasAuthority('stocktake:add')")
    public ResponseEntity<ApiResponse<List<SerialNumber>>> getAvailableSerials(
            @RequestParam Long warehouseId,
            @RequestParam Long variantId) {
        List<SerialNumber> serials = stocktakeService.getAvailableSerials(warehouseId, variantId);
        return ResponseEntity.ok(ApiResponse.<List<SerialNumber>>builder()
                .success(true)
                .data(serials)
                .userMessage("Lấy danh sách Serial khả dụng thành công")
                .build());
    }


    @GetMapping
    @PreAuthorize("hasAuthority('stocktake:view')")
    public ResponseEntity<ApiResponse<Page<StocktakeResponse>>> searchStocktakes(
            @RequestParam(required = false) String stocktakeCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        Pageable pageable = PageRequest.of(page, size);
        Page<StocktakeResponse> responses = stocktakeService.searchStocktakes(stocktakeCode, status, warehouseId, fromDate, toDate, pageable, userPrincipal);
        return ResponseEntity.ok(ApiResponse.<Page<StocktakeResponse>>builder()
                .success(true)
                .data(responses)
                .userMessage("Lấy danh sách phiếu kiểm kê thành công")
                .build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stocktake:view')")
    public ResponseEntity<ApiResponse<StocktakeResponse>> getStocktakeDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        StocktakeResponse response = stocktakeService.getStocktakeDetail(id, userPrincipal);
        return ResponseEntity.ok(ApiResponse.<StocktakeResponse>builder()
                .success(true)
                .data(response)
                .userMessage("Lấy chi tiết phiếu kiểm kê thành công")
                .build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('stocktake:add')")
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
    @PreAuthorize("hasAuthority('stocktake:edit')")
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
    @PreAuthorize("hasAuthority('stocktake:edit')")
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
