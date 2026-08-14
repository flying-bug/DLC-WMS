package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.SystemHealthDto;
import com.duylongtech.backend.dto.SystemLogDto;
import com.duylongtech.backend.dto.SystemSettingsDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.SystemHealthService;
import com.duylongtech.backend.service.SystemLogService;
import com.duylongtech.backend.service.SystemSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
@RequiredArgsConstructor
@Tag(name = "System", description = "System health and settings — SUPER_ADMIN only")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SystemController {

    private final SystemHealthService healthService;
    private final SystemSettingsService settingsService;
    private final SystemLogService logService;

    // ── System Health ──────────────────────────────────────────────────────────

    @GetMapping("/health")
    @Operation(summary = "Get system health metrics (DB, JVM, disk, backup info)")
    public ApiResponse<SystemHealthDto> getHealth() {
        return ApiResponse.success(healthService.getHealth());
    }

    // ── Settings ───────────────────────────────────────────────────────────────

    @GetMapping("/settings")
    @Operation(summary = "Get current system settings")
    public ApiResponse<SystemSettingsDto> getSettings() {
        return ApiResponse.success(settingsService.getSettings());
    }

    @PostMapping("/settings")
    @Operation(summary = "Save system settings")
    public ApiResponse<Map<String, String>> saveSettings(@RequestBody SystemSettingsDto dto) {
        settingsService.saveSettings(dto);
        return ApiResponse.success(Map.of("message", "Cài đặt đã được lưu thành công."));
    }

    // ── Google Drive ───────────────────────────────────────────────────────────

    @PostMapping(value = "/service-account", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload Google Service Account JSON file")
    public ApiResponse<Map<String, Object>> uploadServiceAccount(@RequestParam("file") MultipartFile file) {
        try {
            if (!file.getOriginalFilename().endsWith(".json")) {
                return ApiResponse.error("INVALID_FILE", "Chỉ chấp nhận file JSON của Service Account.");
            }
            settingsService.saveServiceAccountJson(file.getBytes());
            return ApiResponse.success(Map.of(
                    "message", "Service Account đã được tải lên thành công.",
                    "filename", file.getOriginalFilename()
            ));
        } catch (IOException e) {
            return ApiResponse.error("UPLOAD_FAILED", "Không thể đọc file: " + e.getMessage());
        }
    }

    @PostMapping("/test-drive")
    @Operation(summary = "Test Google Drive connection with current Service Account")
    public ApiResponse<Map<String, Object>> testDriveConnection() {
        try {
            settingsService.testDriveConnection();
            return ApiResponse.success(Map.of(
                    "connected", true,
                    "message", "Kết nối Google Drive thành công!"
            ));
        } catch (Exception e) {
            return ApiResponse.error("DRIVE_NOT_CONNECTED",
                    "Không thể kết nối Google Drive: " + e.getMessage());
        }
    }

    // ── Application Logs ───────────────────────────────────────────────────────

    @GetMapping("/logs")
    @Operation(summary = "Get recent application runtime logs")
    public ApiResponse<List<SystemLogDto>> getLogs(
            @RequestParam(defaultValue = "ALL") String level,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.success(logService.getLogs(level, search, limit));
    }

    @DeleteMapping("/logs")
    @Operation(summary = "Clear application runtime logs buffer")
    public ApiResponse<Map<String, String>> clearLogs() {
        logService.clearLogs();
        return ApiResponse.success(Map.of("message", "Đã xóa toàn bộ nhật ký ứng dụng."));
    }

}
