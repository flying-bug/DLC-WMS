package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.BackupRecordDto;
import com.duylongtech.backend.dto.BackupScheduleDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.entity.BackupRecord;
import com.duylongtech.backend.service.BackupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/backup")
@RequiredArgsConstructor
@Tag(name = "Backup", description = "Database backup management — SUPER_ADMIN only")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class BackupController {

    private final BackupService backupService;

    // ── Create Backup ───────────────────────────────────────────────────────────

    @PostMapping("/create")
    @Operation(summary = "Create a new database backup")
    public ApiResponse<BackupRecordDto> createBackup(Authentication auth) {
        try {
            String actor = auth != null ? auth.getName() : "system";
            BackupRecord record = backupService.createBackup(actor);
            return ApiResponse.success(backupService.toDto(record));
        } catch (Exception e) {
            return ApiResponse.error("BACKUP_FAILED", "Backup thất bại: " + e.getMessage());
        }
    }

    // ── List Backups ────────────────────────────────────────────────────────────

    @GetMapping("/list")
    @Operation(summary = "List all backup records")
    public ApiResponse<List<BackupRecordDto>> listBackups() {
        return ApiResponse.success(backupService.listBackups());
    }

    // ── Download ────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/download")
    @Operation(summary = "Download a backup file")
    public ResponseEntity<Resource> downloadBackup(@PathVariable Long id) {
        try {
            Path filePath = backupService.getBackupFilePath(id);
            Resource resource = new FileSystemResource(filePath);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filePath.getFileName().toString() + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Upload to Drive ─────────────────────────────────────────────────────────

    @PostMapping("/{id}/upload-drive")
    @Operation(summary = "Upload a backup file to Google Drive (Git-like push)")
    public ApiResponse<BackupRecordDto> uploadToDrive(@PathVariable Long id) {
        try {
            BackupRecord updated = backupService.uploadToDriveById(id);
            return ApiResponse.success(backupService.toDto(updated));
        } catch (Exception e) {
            return ApiResponse.error("DRIVE_UPLOAD_FAILED", "Upload Drive thất bại: " + e.getMessage());
        }
    }

    // ── Fetch from Drive (Git-like fetch) ───────────────────────────────────────

    @PostMapping("/fetch-drive")
    @Operation(summary = "Fetch and synchronize backup list from Google Drive (Git-like fetch)")
    public ApiResponse<List<BackupRecordDto>> fetchFromDrive() {
        try {
            return ApiResponse.success(backupService.fetchFromDrive());
        } catch (Exception e) {
            return ApiResponse.error("DRIVE_FETCH_FAILED", "Không thể đồng bộ từ Google Drive: " + e.getMessage());
        }
    }

    // ── Pull from Drive (Git-like pull) ─────────────────────────────────────────

    @PostMapping("/{id}/pull-drive")
    @Operation(summary = "Pull a backup file from Google Drive to local server (Git-like pull)")
    public ApiResponse<BackupRecordDto> pullFromDrive(@PathVariable Long id) {
        try {
            return ApiResponse.success(backupService.pullFromDrive(id));
        } catch (Exception e) {
            return ApiResponse.error("DRIVE_PULL_FAILED", "Kéo bản sao lưu từ Drive thất bại: " + e.getMessage());
        }
    }

    // ── Restore ─────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/restore")
    @Operation(summary = "Restore database from a backup file")
    public ApiResponse<Map<String, String>> restoreBackup(
            @PathVariable Long id,
            @RequestParam(value = "encryptionKey", required = false) String encryptionKeyParam,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String key = encryptionKeyParam;
            if ((key == null || key.isBlank()) && body != null) {
                key = body.get("encryptionKey");
            }
            backupService.restoreBackup(id, key);
            return ApiResponse.success(Map.of("message", "Restore hoàn tất thành công."));
        } catch (Exception e) {
            return ApiResponse.error("RESTORE_FAILED", "Restore thất bại: " + e.getMessage());
        }
    }

    // ── Delete ──────────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a backup record and its local file")
    public ApiResponse<Map<String, String>> deleteBackup(@PathVariable Long id) {
        try {
            backupService.deleteBackup(id);
            return ApiResponse.success(Map.of("message", "Đã xóa backup thành công."));
        } catch (Exception e) {
            return ApiResponse.error("DELETE_FAILED", "Xóa backup thất bại: " + e.getMessage());
        }
    }

    // ── Schedule ────────────────────────────────────────────────────────────────

    @GetMapping("/schedule")
    @Operation(summary = "Get current backup schedule configuration")
    public ApiResponse<BackupScheduleDto> getSchedule() {
        return ApiResponse.success(backupService.getSchedule());
    }

    @PostMapping("/schedule")
    @Operation(summary = "Save backup schedule configuration")
    public ApiResponse<Map<String, String>> saveSchedule(@RequestBody BackupScheduleDto dto) {
        backupService.saveSchedule(dto);
        return ApiResponse.success(Map.of("message", "Lịch backup đã được lưu."));
    }
}
