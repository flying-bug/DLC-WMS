package com.fsa.roomdesk.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Base class for tests that run the whole application against PostgreSQL 17. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestClockConfiguration.class})
public abstract class IntegrationTest {

    public static final String ADMIN = "admin@roomdesk.test";
    public static final String ALEX = "alex@roomdesk.test";
    public static final String BEN = "ben@roomdesk.test";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected MutableClock clock;

    @BeforeEach
    void resetData() {
        clock.setLocalNow(TestClockConfiguration.NOW);
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM rooms");
        jdbc.update("""
                INSERT INTO rooms (code, name, capacity, active) VALUES
                    ('HN-5F-01', 'Lotus', 8, TRUE),
                    ('HN-5F-02', 'Orchid', 4, TRUE),
                    ('HN-6F-01', 'Bamboo', 12, TRUE)
                """);
    }

    protected String token(String email) throws Exception {
        var password = switch (email) {
            case ADMIN -> "Admin#2026";
            case ALEX -> "Alex#2026";
            case BEN -> "Ben#2026";
            default -> throw new IllegalArgumentException(email);
        };
        var body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}""".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }

    protected ResultActions book(String token, String roomCode, String startAt, String endAt, int attendees)
            throws Exception {
        return mvc.perform(post("/api/bookings")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(bookingJson(roomCode, startAt, endAt, attendees)));
    }

    protected long bookAndGetId(String token, String roomCode, String startAt, String endAt) throws Exception {
        var body = book(token, roomCode, startAt, endAt, 2)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    protected static String bookingJson(String roomCode, String startAt, String endAt, int attendees) {
        return """
                {"roomCode":"%s","title":"Meeting","attendees":%d,"startAt":"%s","endAt":"%s"}"""
                .formatted(roomCode, attendees, startAt, endAt);
    }

    protected int countBookings() {
        return jdbc.queryForObject("SELECT count(*) FROM bookings", Integer.class);
    }
}
