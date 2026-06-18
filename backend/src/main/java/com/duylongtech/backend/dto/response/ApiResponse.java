package com.duylongtech.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base Response chuẩn DLC-WMS
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL) // 1. Tự động ẩn các trường null để API trả về nhẹ hơn
public class ApiResponse<T> {
    
    private boolean success;
    
    // Payload chính
    private T data;
    
    // 2. Nhóm báo lỗi chi tiết
    private String errorCode;
    private String userMessage; // Message thân thiện cho người dùng (VD: "Tài khoản không tồn tại")
    private String devMessage;  // Message chi tiết cho Dev (VD: "NullPointerException at line 45")
    
    // 3. Tracking & Debugging
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now(); // Thời gian phản hồi API
    
    @Builder.Default
    private String traceId = UUID.randomUUID().toString(); // ID truy vết (Dùng tìm kiếm lỗi trong Log)

    // Các hàm Helper tĩnh
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success() {
        return success(null);
    }

    public static <T> ApiResponse<T> error(String errorCode, String userMessage) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .build();
    }
    
    public static <T> ApiResponse<T> error(String errorCode, String userMessage, String devMessage) {
        return ApiResponse.<T>builder()
                .success(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .devMessage(devMessage)
                .build();
    }
}
