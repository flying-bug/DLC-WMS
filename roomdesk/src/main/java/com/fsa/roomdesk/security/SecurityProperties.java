package com.fsa.roomdesk.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Security settings. The JWT secret comes from the JWT_SECRET environment variable and is never
 * part of the source code.
 */
@ConfigurationProperties("roomdesk.security")
public record SecurityProperties(Jwt jwt, Cors cors) {

    public record Jwt(String secret, @DefaultValue("30m") Duration ttl) {

        /** HS256 needs a key of at least 256 bits. */
        public static final int MIN_SECRET_BYTES = 32;

        public Jwt {
            if (secret == null || secret.isBlank() || secret.startsWith("${")) {
                throw new IllegalStateException("JWT_SECRET is not set");
            }
            if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
                throw new IllegalStateException("JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes long");
            }
        }

        public byte[] secretBytes() {
            return secret.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        public String toString() {
            return "Jwt[secret=***, ttl=" + ttl + "]";
        }
    }

    public record Cors(@DefaultValue("http://localhost:5173") List<String> allowedOrigins) {
    }
}
