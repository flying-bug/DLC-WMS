package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Endpoints quản lý ảnh sửa chữa theo phase.
 * Base URL: /api/v1/repairs/{repairId}/photos
 *
 * Phase hợp lệ: INTAKE | DIAGNOSIS | COMPLETION
 */
@RestController
@RequestMapping("/api/v1/repairs/{repairId}/photos")
@RequiredArgsConstructor
@Tag(name = "Repair Photos", description = "API quản lý ảnh sửa chữa theo giai đoạn")
public class RepairPhotoController {

    private final RepairPhotoService repairPhotoService;

    @GetMapping
    @PreAuthorize("hasAuthority('repair:view')")
    @Operation(summary = "Lấy tất cả ảnh của lệnh sửa chữa")
    public ApiResponse<List<RepairPhotoResponse>> getPhotos(@PathVariable Long repairId) {
        return ApiResponse.success(repairPhotoService.getPhotos(repairId));
    }

    @GetMapping("/phase/{phase}")
    @PreAuthorize("hasAuthority('repair:view')")
    @Operation(summary = "Lấy ảnh theo giai đoạn (INTAKE | DIAGNOSIS | COMPLETION)")
    public ApiResponse<List<RepairPhotoResponse>> getPhotosByPhase(
            @PathVariable Long repairId,
            @PathVariable @NotBlank String phase) {
        return ApiResponse.success(repairPhotoService.getPhotosByPhase(repairId, phase));
    }

    @PostMapping(value = "/phase/{phase}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(summary = "Upload ảnh cho giai đoạn chỉ định",
               description = "Kiểm tra quyền: INTAKE chỉ Kế toán/Tiếp nhận, DIAGNOSIS/COMPLETION chỉ KTV được giao")
    public ApiResponse<RepairPhotoResponse> uploadPhoto(
            @PathVariable Long repairId,
            @PathVariable @NotBlank String phase,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String caption) {
        return ApiResponse.success(repairPhotoService.uploadPhoto(repairId, phase, category, caption, file));
    }

    @DeleteMapping("/{photoId}")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(summary = "Xóa ảnh (chỉ khi chưa bị khóa)")
    public ApiResponse<Void> deletePhoto(@PathVariable Long repairId, @PathVariable Long photoId) {
        repairPhotoService.deletePhoto(repairId, photoId);
        return ApiResponse.success();
    }
}
