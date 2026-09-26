package com.duylongtech.backend.security;

import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.Http403ForbiddenEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Request cần đăng nhập nhưng token bị từ chối (hết hạn, tài khoản bị khóa, đã đăng nhập nơi khác):
 * trả 401 kèm {@code userMessage} để frontend đăng xuất và hiện đúng lý do.
 * Request không gửi token giữ nguyên hành vi mặc định (403).
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final AuthenticationEntryPoint anonymousEntryPoint = new Http403ForbiddenEntryPoint();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {
        Object failure = request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE);
        if (!(failure instanceof SystemMessage reason)) {
            anonymousEntryPoint.commence(request, response, authException);
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(reason.getCode(), reason.getMessage()));
    }
}
