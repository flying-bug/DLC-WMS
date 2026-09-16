package com.duylongtech.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtils {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtUtils.class);

    private final String jwtSecret;
    private final int jwtExpirationMs = 86400000; // 1 Day

    public JwtUtils(@Value("${app.jwt.secret:}") String configuredSecret) {
        if (StringUtils.hasText(configuredSecret)) {
            this.jwtSecret = configuredSecret;
        } else {
            // No JWT_SECRET configured: fall back to a random per-boot secret so the app
            // still starts for local/dev use, but every restart invalidates existing tokens.
            // Set JWT_SECRET (env var / backend/.env) for any shared or persistent environment.
            log.warn("JWT_SECRET is not set. Using a random secret generated for this run only; " +
                    "all existing tokens will be invalidated on every restart. Set JWT_SECRET in your environment.");
            this.jwtSecret = UUID.randomUUID().toString() + UUID.randomUUID();
        }
    }

    private Key key() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateJwtToken(String username, String role) {
        return Jwts.builder()
                .setSubject((username))
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parse(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // log error
        }
        return false;
    }
}
