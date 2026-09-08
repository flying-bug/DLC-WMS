package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.BusinessSettingsDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.SystemSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/business-settings")
@RequiredArgsConstructor
@Tag(name = "Business Settings", description = "Cấu hình nghiệp vụ & Thuế cho Manager")
public class BusinessSettingsController {

    private final SystemSettingsService settingsService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Lấy cấu hình nghiệp vụ và thuế VAT")
    public ApiResponse<BusinessSettingsDto> getBusinessSettings() {
        return ApiResponse.success(settingsService.getBusinessSettings());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Lưu cấu hình nghiệp vụ và thuế VAT")
    public ApiResponse<Map<String, String>> saveBusinessSettings(@RequestBody BusinessSettingsDto dto) {
        settingsService.saveBusinessSettings(dto);
        return ApiResponse.success(Map.of("message", "Cấu hình nghiệp vụ đã được lưu thành công."));
    }

    @GetMapping("/vat")
    @Operation(summary = "Lấy mức thuế VAT mặc định hệ thống cho các màn hình nghiệp vụ")
    public ApiResponse<Map<String, Object>> getDefaultVat() {
        return ApiResponse.success(Map.of(
                "defaultVatRate", settingsService.getDefaultVatRate(),
                "allowedVatRates", settingsService.getAllowedVatRates()
        ));
    }
}
