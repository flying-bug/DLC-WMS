package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.system.UploadResponse;
import com.duylongtech.backend.feature.system.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Dùng chung cho nhiều màn hình (đơn mua, đơn bán, chuyển kho, sản phẩm...) nên
 * không gắn được 1 quyền module cụ thể - chỉ yêu cầu đã đăng nhập. Muốn siết theo
 * đúng module gọi (vd chỉ ai có purchase_order:edit mới upload được từ màn PO) cần
 * frontend gửi kèm ngữ cảnh (module) khi gọi, hiện chưa có - nằm ngoài phạm vi sửa lần này.
 */
@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UploadResponse> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "images") String folder) {
        return ApiResponse.success(cloudinaryService.uploadImage(file, folder));
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<UploadResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "attachments") String folder) {
        return ApiResponse.success(cloudinaryService.uploadDocument(file, folder));
    }
}
