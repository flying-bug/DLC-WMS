package com.duylongtech.backend.security;

import com.duylongtech.backend.constant.SystemMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RestAuthenticationEntryPointTest {

    private final RestAuthenticationEntryPoint entryPoint = new RestAuthenticationEntryPoint();

    @Test
    void rejectedTokenGets401WithReasonForUser() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE, SystemMessage.SESSION_REPLACED);
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new InsufficientAuthenticationException("denied"));

        assertEquals(401, response.getStatus());
        String body = response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(body.contains("\"errorCode\":\"AUTH17\""), body);
        assertTrue(body.contains("Bạn đã đăng nhập ở một nơi khác."), body);
    }

    @Test
    void requestWithoutTokenKeepsDefault403() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(new MockHttpServletRequest(), response, new InsufficientAuthenticationException("denied"));

        assertEquals(403, response.getStatus());
    }
}
