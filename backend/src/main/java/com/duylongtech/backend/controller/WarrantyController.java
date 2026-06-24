package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.service.WarrantyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/warranties")
@RequiredArgsConstructor
@Tag(name = "Warranty Management", description = "API xem danh sach va chi tiet bao hanh")
public class WarrantyController {

    private final WarrantyService warrantyService;

    @GetMapping
    @Operation(summary = "View warranty list")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<WarrantyResponse>> getWarranties(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(warrantyService.getWarranties(keyword, status, fromDate, toDate, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View warranty detail")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<WarrantyResponse> getWarrantyById(@PathVariable Long id) {
        return ApiResponse.success(warrantyService.getWarrantyById(id));
    }
}
