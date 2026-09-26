package com.duylongtech.backend.security;

import com.duylongtech.backend.constant.SystemMessage;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /**
     * Lý do token bị từ chối ({@link SystemMessage}). {@link RestAuthenticationEntryPoint} dùng nó để trả 401
     * kèm thông báo cho người dùng khi request cần đăng nhập.
     */
    public static final String AUTH_FAILURE_ATTRIBUTE = JwtAuthenticationFilter.class.getName() + ".AUTH_FAILURE";

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String jwt = parseJwt(request);
        if (jwt != null) {
            try {
                authenticate(jwt, request);
            } catch (Exception e) {
                // Token sai chữ ký / hết hạn / tài khoản không còn tồn tại.
                request.setAttribute(AUTH_FAILURE_ATTRIBUTE, SystemMessage.SESSION_EXPIRED);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(String jwt, HttpServletRequest request) {
        Claims claims = jwtUtils.parseClaims(jwt);
        UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(claims.getSubject());
        if (!userDetails.isEnabled()) {
            request.setAttribute(AUTH_FAILURE_ATTRIBUTE, SystemMessage.USER_LOCKED);
            return;
        }

        // Mỗi tài khoản chỉ có một phiên: token của phiên cũ (đã có người đăng nhập nơi khác) bị từ chối.
        String tokenSessionId = claims.get(JwtUtils.CLAIM_SESSION_ID, String.class);
        String currentSessionId = userDetails.getSessionId();
        if (tokenSessionId == null || !tokenSessionId.equals(currentSessionId)) {
            request.setAttribute(AUTH_FAILURE_ATTRIBUTE,
                    currentSessionId != null ? SystemMessage.SESSION_REPLACED : SystemMessage.SESSION_EXPIRED);
            return;
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        String accessToken = request.getParameter("access_token");
        if (StringUtils.hasText(accessToken)) {
            return accessToken;
        }

        return null;
    }
}
