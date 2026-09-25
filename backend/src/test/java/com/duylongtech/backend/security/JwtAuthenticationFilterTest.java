package com.duylongtech.backend.security;

import com.duylongtech.backend.constant.SystemMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private final JwtUtils jwtUtils = new JwtUtils("test-secret-for-jwt-filter-must-be-at-least-32-bytes");
    private final UserDetailsServiceImpl userDetailsService = mock(UserDetailsServiceImpl.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(filter, "jwtUtils", jwtUtils);
        ReflectionTestUtils.setField(filter, "userDetailsService", userDetailsService);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void givenUser(boolean enabled, String currentSessionId) {
        when(userDetailsService.loadUserByUsername("kho01"))
                .thenReturn(new UserDetailsImpl(1L, "kho01", "x", enabled, List.of(), currentSessionId));
    }

    private MockHttpServletRequest runFilter(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users/me");
        if (token != null) {
            request.addHeader("Authorization", "Bearer " + token);
        }
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return request;
    }

    private Authentication currentAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    void acceptsTokenOfCurrentSession() throws Exception {
        givenUser(true, "session-B");

        MockHttpServletRequest request = runFilter(jwtUtils.generateJwtToken("kho01", "ROLE_STAFF", "session-B"));

        assertNotNull(currentAuthentication());
        assertNull(request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void rejectsTokenOfPreviousSessionAfterLoginElsewhere() throws Exception {
        givenUser(true, "session-B");

        MockHttpServletRequest request = runFilter(jwtUtils.generateJwtToken("kho01", "ROLE_STAFF", "session-A"));

        assertNull(currentAuthentication());
        assertEquals(SystemMessage.SESSION_REPLACED, request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void rejectsTokenIssuedBeforeSessionTrackingWhenAnotherSessionExists() throws Exception {
        givenUser(true, "session-B");

        MockHttpServletRequest request = runFilter(jwtUtils.generateJwtToken("kho01", "ROLE_STAFF", null));

        assertNull(currentAuthentication());
        assertEquals(SystemMessage.SESSION_REPLACED, request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void rejectsTokenAfterSessionsWereRevoked() throws Exception {
        givenUser(true, null);

        MockHttpServletRequest request = runFilter(jwtUtils.generateJwtToken("kho01", "ROLE_STAFF", "session-A"));

        assertNull(currentAuthentication());
        assertEquals(SystemMessage.SESSION_EXPIRED, request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void rejectsLockedAccount() throws Exception {
        givenUser(false, "session-A");

        MockHttpServletRequest request = runFilter(jwtUtils.generateJwtToken("kho01", "ROLE_STAFF", "session-A"));

        assertNull(currentAuthentication());
        assertEquals(SystemMessage.USER_LOCKED, request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void rejectsMalformedToken() throws Exception {
        MockHttpServletRequest request = runFilter("not-a-jwt");

        assertNull(currentAuthentication());
        assertEquals(SystemMessage.SESSION_EXPIRED, request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }

    @Test
    void requestWithoutTokenIsLeftAnonymous() throws Exception {
        MockHttpServletRequest request = runFilter(null);

        assertNull(currentAuthentication());
        assertNull(request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_ATTRIBUTE));
    }
}
