package com.fsa.roomdesk.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fsa.roomdesk.support.IntegrationTest;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.ResultActions;

/** Authentication and authorization with real HS256 tokens and the real filter chain. */
class SecurityIntegrationTest extends IntegrationTest {

    private static final String UNAUTHORIZED = "https://roomdesk.example/problems/unauthorized";

    @Value("${roomdesk.security.jwt.secret}")
    private String secret;

    private String sign(String key, String subject, String role, Instant issuedAt, Instant expiresAt) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(
                new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        var claims = JwtClaimsSet.builder()
                .subject(subject)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("role", role)
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private static void expectUnauthorized(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value(UNAUTHORIZED))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void requestWithoutTokenIsUnauthorized() throws Exception {
        expectUnauthorized(mvc.perform(get("/api/rooms")));
    }

    @Test
    void expiredTokenIsUnauthorized() throws Exception {
        var issued = Instant.now().minus(Duration.ofHours(2));
        var expired = sign(secret, ALEX, "EMPLOYEE", issued, issued.plus(Duration.ofMinutes(30)));
        expectUnauthorized(mvc.perform(get("/api/rooms").header(HttpHeaders.AUTHORIZATION, bearer(expired))));
    }

    @Test
    void tokenWithWrongSignatureIsUnauthorized() throws Exception {
        var forged = sign("another-secret-that-is-long-enough-for-hs256!!", ADMIN, "ADMIN",
                Instant.now(), Instant.now().plus(Duration.ofMinutes(30)));
        expectUnauthorized(mvc.perform(get("/api/rooms").header(HttpHeaders.AUTHORIZATION, bearer(forged))));
    }

    @Test
    void garbageTokenIsUnauthorized() throws Exception {
        expectUnauthorized(mvc.perform(get("/api/rooms").header(HttpHeaders.AUTHORIZATION, "Bearer not.a.jwt")));
    }

    @Test
    void employeeCallingAdminRouteIsForbidden() throws Exception {
        mvc.perform(post("/api/rooms")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token(ALEX)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"HN-7F-01","name":"Maple","capacity":4}"""))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/forbidden"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rooms WHERE code = 'HN-7F-01'", Integer.class))
                .isZero();
    }

    @Test
    void employeeReadingSomeoneElsesBookingGetsNotFound() throws Exception {
        long bensBooking = bookAndGetId(token(BEN), "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        var alex = token(ALEX);

        mvc.perform(get("/api/bookings/{id}", bensBooking).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/not-found"));
        // Same response as a booking that does not exist at all.
        mvc.perform(get("/api/bookings/{id}", 999_999).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/not-found"));
        // Nor can the employee cancel it.
        mvc.perform(post("/api/bookings/{id}/cancellation", bensBooking)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id = ?", String.class, bensBooking))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void ownerAndAdminCanReadTheBooking() throws Exception {
        long bensBooking = bookAndGetId(token(BEN), "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        for (var user : new String[] {BEN, ADMIN}) {
            mvc.perform(get("/api/bookings/{id}", bensBooking).header(HttpHeaders.AUTHORIZATION, bearer(token(user))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ownerEmail").value(BEN));
        }
    }

    @Test
    void loginReturnsA30MinuteBearerToken() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@roomdesk.test","password":"Admin#2026"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(1800));
    }

    @Test
    void unknownEmailAndWrongPasswordGetTheSameResponse() throws Exception {
        var unknown = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@roomdesk.test","password":"Alex#2026"}"""))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        var wrongPassword = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"alex@roomdesk.test","password":"wrong"}"""))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        assertThat(unknown).isEqualTo(wrongPassword).contains(UNAUTHORIZED);
    }

    @Test
    void healthAndApiDocsArePublicButOtherActuatorEndpointsAreNot() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/env").header(HttpHeaders.AUTHORIZATION, bearer(token(ADMIN))))
                .andExpect(status().isForbidden());
    }

    @Test
    void corsAllowsOnlyTheConfiguredOrigin() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/rooms")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/rooms")
                        .header(HttpHeaders.ORIGIN, "http://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/forbidden"));
    }
}
