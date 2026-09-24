package com.duylongtech.backend.exception;

import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.constant.SystemMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Chỉ true khi bật tường minh qua APP_EXPOSE_ERROR_DETAILS (local/dev).
     * Mặc định false để không lộ chi tiết lỗi (stack trace, SQL message...) ra
     * client ở Production - xem SystemMessage.INTERNAL_ERROR.
     */
    @Value("${app.expose-error-details:false}")
    private boolean exposeErrorDetails;

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(SystemMessage.LOGIN_FAILED.getCode(), SystemMessage.LOGIN_FAILED.getMessage()));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiResponse<Void>> handleDisabledException(DisabledException ex) {
        log.warn("Account disabled: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(SystemMessage.USER_LOCKED.getCode(), SystemMessage.USER_LOCKED.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
        log.warn("Business error: {}", ex.getMessage());
        if (ex.getSystemMessage() != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getSystemMessage().getCode(), ex.getSystemMessage().getMessage()));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("ERR400", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        String errorMsg = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> {
                    String code = error.getDefaultMessage();
                    try {
                        SystemMessage sysMsg = SystemMessage.valueOf(code);
                        return sysMsg.getMessage();
                    } catch (IllegalArgumentException e) {
                        return code; // Fallback nếu không phải là mã Enum
                    }
                })
                .distinct()
                .collect(Collectors.joining("; "));
        
        log.warn("Validation error: {}", errorMsg);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("VAL400", errorMsg));
    }

    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(org.springframework.orm.ObjectOptimisticLockingFailureException ex) {
        log.warn("Optimistic locking failure: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(SystemMessage.WH_OPTIMISTIC_LOCK.getCode(), SystemMessage.WH_OPTIMISTIC_LOCK.getMessage()));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(RuntimeException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(SystemMessage.ACCESS_DENIED.getCode(), SystemMessage.ACCESS_DENIED.getMessage()));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolationException(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        String causeMsg = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String msg = causeMsg != null ? causeMsg.toLowerCase() : "";
        if (msg.contains("delete") || msg.contains("foreign key constraint")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("ERR400", "Không thể xóa bản ghi này do dữ liệu đang được liên kết với các bản ghi khác trong hệ thống."));
        }
        if (msg.contains("duplicate entry") && msg.contains("serial_numbers")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("ERR400", "Số Serial đã tồn tại trong hệ thống. Vui lòng kiểm tra lại."));
        }
        // Không rõ nguyên nhân cụ thể -> không lộ nguyên văn message DB (tên bảng/cột,
        // engine...) cho client; chỉ đính kèm khi bật tường minh để debug ở local/dev.
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("ERR400", "Lỗi ràng buộc dữ liệu, vui lòng kiểm tra lại thông tin.",
                        exposeErrorDetails ? causeMsg : null));
    }

    /**
     * Kết nối SSE (phiên quét OCR, realtime) hết hạn chờ là bình thường, client tự kết nối lại. Không đi vào handler
     * RuntimeException bên dưới: nó ghi log ERROR và cố ghi JSON vào luồng text/event-stream đã gửi header, sinh
     * thêm lỗi HttpMessageNotWritableException. Trả void = đã xử lý, không ghi body.
     */
    @ExceptionHandler(org.springframework.web.context.request.async.AsyncRequestTimeoutException.class)
    public void handleAsyncRequestTimeout() {
        log.debug("Async request (SSE) timed out, client will reconnect");
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        ApiResponse<Void> body = ApiResponse.error(SystemMessage.INTERNAL_ERROR.getCode(), SystemMessage.INTERNAL_ERROR.getMessage(),
                exposeErrorDetails ? ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage() : ex.toString()) : null);
        log.error("Unhandled runtime exception caught (traceId={}): ", body.getTraceId(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
