package com.fsa.roomdesk.security;

import com.fsa.roomdesk.domain.Role;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues HS256-signed access tokens whose subject is the user's email. */
@Service
public class TokenService {

    public static final String ROLE_CLAIM = "role";

    private final JwtEncoder encoder;
    private final SecurityProperties properties;

    public TokenService(JwtEncoder encoder, SecurityProperties properties) {
        this.encoder = encoder;
        this.properties = properties;
    }

    public String issue(String email, Role role) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer("roomdesk")
                .subject(email)
                .issuedAt(now)
                .expiresAt(now.plus(properties.jwt().ttl()))
                .claim(ROLE_CLAIM, role.name())
                .build();
        var header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long ttlSeconds() {
        return properties.jwt().ttl().toSeconds();
    }
}
