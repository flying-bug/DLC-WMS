package com.fsa.roomdesk.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fsa.roomdesk.support.IntegrationTest;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class RoomIntegrationTest extends IntegrationTest {

    private String admin;
    private String alex;

    @BeforeEach
    void login() throws Exception {
        admin = token(ADMIN);
        alex = token(ALEX);
    }

    @Test
    void listIsPagedFilteredAndSortedByCode() throws Exception {
        mvc.perform(get("/api/rooms").header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].code").value(contains("HN-5F-01", "HN-5F-02", "HN-6F-01")))
                .andExpect(jsonPath("$.content[0].name").value("Lotus"))
                .andExpect(jsonPath("$.content[0].capacity").value(8))
                .andExpect(jsonPath("$.content[0].active").value(true))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(3));

        mvc.perform(get("/api/rooms").param("minCapacity", "8").header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.content[*].code").value(contains("HN-5F-01", "HN-6F-01")));

        jdbc.update("UPDATE rooms SET active = FALSE WHERE code = 'HN-5F-02'");
        mvc.perform(get("/api/rooms").param("active", "false").header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.content[*].code").value(contains("HN-5F-02")));

        mvc.perform(get("/api/rooms").param("size", "2").param("page", "1")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.content[*].code").value(contains("HN-6F-01")))
                .andExpect(jsonPath("$.page.number").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void adminCreatesAnActiveRoom() throws Exception {
        mvc.perform(post("/api/rooms")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"HN-7F-01","name":"Maple","capacity":6}"""))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.endsWith("/api/rooms/HN-7F-01")))
                .andExpect(jsonPath("$.active").value(true));

        mvc.perform(get("/api/rooms/HN-7F-01").header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maple"));

        mvc.perform(post("/api/rooms")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"HN-7F-01","name":"Other","capacity":6}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/room-code-taken"));
    }

    @Test
    void updateReplacesNameAndCapacityButNeverTheCode() throws Exception {
        mvc.perform(put("/api/rooms/HN-5F-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"HN-9F-09","name":"Lotus Grand","capacity":10}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("HN-5F-01"))
                .andExpect(jsonPath("$.name").value("Lotus Grand"))
                .andExpect(jsonPath("$.capacity").value(10));
    }

    @Test
    void capacityCannotDropBelowAnUpcomingBooking() throws Exception {
        book(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00", 6).andExpect(status().isCreated());

        mvc.perform(put("/api/rooms/HN-5F-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Lotus","capacity":5}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/capacity-exceeded"));
        assertThat(jdbc.queryForObject("SELECT capacity FROM rooms WHERE code = 'HN-5F-01'", Integer.class))
                .isEqualTo(8);

        mvc.perform(put("/api/rooms/HN-5F-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Lotus","capacity":6}"""))
                .andExpect(status().isOk());
    }

    @Test
    void deactivationCancelsOnlyUpcomingConfirmedBookings() throws Exception {
        long upcoming1 = bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        long upcoming2 = bookAndGetId(alex, "HN-5F-01", "2026-11-03T09:00", "2026-11-03T10:00");
        long otherRoom = bookAndGetId(alex, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00");
        long started = bookAndGetId(alex, "HN-5F-01", "2026-11-01T08:15", "2026-11-01T09:00");
        clock.setLocalNow(LocalDateTime.parse("2026-11-01T08:30"));

        mvc.perform(post("/api/rooms/HN-5F-01/deactivation").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelledBookings").value(2));

        assertThat(statusOf(upcoming1)).isEqualTo("CANCELLED");
        assertThat(statusOf(upcoming2)).isEqualTo("CANCELLED");
        assertThat(statusOf(otherRoom)).isEqualTo("CONFIRMED");
        assertThat(statusOf(started)).isEqualTo("CONFIRMED");
        assertThat(jdbc.queryForObject("SELECT active FROM rooms WHERE code = 'HN-5F-01'", Boolean.class)).isFalse();

        mvc.perform(post("/api/rooms/HN-5F-01/deactivation").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/room-inactive"));
    }

    private String statusOf(long bookingId) {
        return jdbc.queryForObject("SELECT status FROM bookings WHERE id = ?", String.class, bookingId);
    }
}
