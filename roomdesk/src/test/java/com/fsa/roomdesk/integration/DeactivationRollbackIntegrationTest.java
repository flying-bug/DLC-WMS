package com.fsa.roomdesk.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doCallRealMethod;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fsa.roomdesk.service.CancellationNotifier;
import com.fsa.roomdesk.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/** Deactivation is all or nothing: a failure half-way leaves the room and every booking as they were. */
class DeactivationRollbackIntegrationTest extends IntegrationTest {

    @MockitoSpyBean
    private CancellationNotifier notifier;

    @Test
    void failureHalfWayLeavesRoomAndBookingsUnchanged() throws Exception {
        var alex = token(ALEX);
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T11:00", "2026-11-02T12:00");
        bookAndGetId(alex, "HN-5F-01", "2026-11-03T09:00", "2026-11-03T10:00");

        // The first booking is cancelled and flushed to the database, then the second step fails.
        doCallRealMethod()
                .doThrow(new IllegalStateException("notification service unavailable"))
                .when(notifier).bookingCancelled(any(), any());

        mvc.perform(post("/api/rooms/HN-5F-01/deactivation").header(HttpHeaders.AUTHORIZATION, bearer(token(ADMIN))))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/internal"));

        assertThat(jdbc.queryForObject("SELECT active FROM rooms WHERE code = 'HN-5F-01'", Boolean.class)).isTrue();
        assertThat(jdbc.queryForList("SELECT status FROM bookings", String.class))
                .hasSize(3)
                .containsOnly("CONFIRMED");
    }
}
