package com.duylongtech.backend.aspect;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditStatus;
import com.duylongtech.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogAspect {

    private final AuditLogService auditLogService;

    @AfterThrowing(pointcut = "@annotation(auditable)", throwing = "ex")
    public void logAfterThrowing(JoinPoint joinPoint, Auditable auditable, Throwable ex) {
        try {
            String actor = getCurrentUser();
            String ip = getClientIp();

            String userMessage = auditable.actionDescription() + " thất bại: " + ex.getMessage();

            // Lấy ID từ tham số nếu có (thường là tham số đầu tiên tên id)
            Long entityId = null;

            auditLogService.logEvent(
                    actor,
                    auditable.action().name(),
                    auditable.entityName(),
                    entityId,
                    AuditStatus.FAILED.name(),
                    userMessage,
                    ip,
                    null
            );
        } catch (Exception loggingEx) {
            log.error("Failed to write audit log for exception", loggingEx);
        }
    }

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void logAfterReturning(JoinPoint joinPoint, Auditable auditable, Object result) {
        try {
            String actor = getCurrentUser();
            String ip = getClientIp();

            String userMessage = auditable.actionDescription() + " thành công";
            Long entityId = null; // Có thể trích xuất ID từ result nếu cần thiết

            auditLogService.logEvent(
                    actor,
                    auditable.action().name(),
                    auditable.entityName(),
                    entityId,
                    AuditStatus.SUCCESS.name(),
                    userMessage,
                    ip,
                    null
            );
        } catch (Exception loggingEx) {
            log.error("Failed to write audit log for success", loggingEx);
        }
    }

    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            return authentication.getName();
        }
        return "System";
    }

    private String getClientIp() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = request.getRemoteAddr();
            }
            return ip;
        }
        return "Unknown";
    }
}
