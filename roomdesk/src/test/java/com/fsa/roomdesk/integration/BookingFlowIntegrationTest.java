package com.fsa.roomdesk.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fsa.roomdesk.support.IntegrationTest;
import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDateTime;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** Booking rules of Task 2 end to end. "Now" is 2026-11-01 08:00 (Asia/Ho_Chi_Minh). */
class BookingFlowIntegrationTest extends IntegrationTest {

    private static final String OVERLAP = "https://roomdesk.example/problems/booking-overlap";

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private String alex;
    private String ben;

    @BeforeEach
    void login() throws Exception {
        alex = token(ALEX);
        ben = token(BEN);
    }

    @Test
    void createdBookingHasTheCallerAsOwner() throws Exception {
        book(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00", 4)
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, org.hamcrest.Matchers.matchesPattern(".*/api/bookings/\\d+")))
                .andExpect(jsonPath("$.roomCode").value("HN-5F-01"))
                .andExpect(jsonPath("$.roomName").value("Lotus"))
                .andExpect(jsonPath("$.ownerEmail").value(ALEX))
                .andExpect(jsonPath("$.attendees").value(4))
                .andExpect(jsonPath("$.startAt").value("2026-11-02T09:00"))
                .andExpect(jsonPath("$.endAt").value("2026-11-02T10:00"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void bookingStartingWhenAnotherEndsIsAccepted() throws Exception {
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        book(ben, "HN-5F-01", "2026-11-02T10:00", "2026-11-02T10:30", 2).andExpect(status().isCreated());
    }

    @Test
    void overlappingBookingIsRejectedUntilTheOtherIsCancelled() throws Exception {
        long first = bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");

        book(ben, "HN-5F-01", "2026-11-02T09:45", "2026-11-02T10:15", 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value(OVERLAP));
        assertThat(countBookings()).isEqualTo(1);

        mvc.perform(post("/api/bookings/{id}/cancellation", first).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isNoContent());
        book(ben, "HN-5F-01", "2026-11-02T09:45", "2026-11-02T10:15", 2).andExpect(status().isCreated());
    }

    @Test
    void sameTimeInAnotherRoomIsAccepted() throws Exception {
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        book(ben, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00", 2).andExpect(status().isCreated());
    }

    @Test
    void attendeesAboveCapacityAreRejected() throws Exception {
        book(alex, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00", 5)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/capacity-exceeded"));
        book(alex, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00", 4).andExpect(status().isCreated());
    }

    @Test
    void unknownRoomIsNotFound() throws Exception {
        book(alex, "HN-9F-99", "2026-11-02T09:00", "2026-11-02T10:00", 2)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/not-found"));
    }

    @Test
    void inactiveRoomCannotBeBooked() throws Exception {
        jdbc.update("UPDATE rooms SET active = FALSE WHERE code = 'HN-5F-01'");
        book(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00", 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/room-inactive"));
        assertThat(countBookings()).isZero();
    }

    @Test
    void bookingInThePastIsAValidationError() throws Exception {
        book(alex, "HN-5F-01", "2026-11-01T08:00", "2026-11-01T09:00", 2)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("startAt"))
                .andExpect(jsonPath("$.errors[0].message").value("must be in the future"));
        book(alex, "HN-5F-01", "2026-11-01T08:15", "2026-11-01T09:00", 2).andExpect(status().isCreated());
    }

    @Test
    void cancellingTwiceIsAnInvalidState() throws Exception {
        long id = bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        mvc.perform(post("/api/bookings/{id}/cancellation", id).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/bookings/{id}/cancellation", id).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/invalid-state"));
        mvc.perform(get("/api/bookings/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void bookingThatHasStartedCannotBeCancelled() throws Exception {
        long id = bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        clock.setLocalNow(LocalDateTime.parse("2026-11-02T09:00"));
        mvc.perform(post("/api/bookings/{id}/cancellation", id).header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value("https://roomdesk.example/problems/invalid-state"));
        assertThat(jdbc.queryForObject("SELECT status FROM bookings WHERE id = ?", String.class, id))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void adminCanCancelAnyBooking() throws Exception {
        long id = bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        mvc.perform(post("/api/bookings/{id}/cancellation", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token(ADMIN))))
                .andExpect(status().isNoContent());
    }

    @Test
    void mineListsOnlyTheCallersBookingsSortedAndFiltered() throws Exception {
        long late = bookAndGetId(alex, "HN-5F-01", "2026-11-03T15:00", "2026-11-03T16:00");
        long early = bookAndGetId(alex, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00");
        long sameStart = bookAndGetId(alex, "HN-6F-01", "2026-11-02T09:00", "2026-11-02T09:30");
        long nextWeek = bookAndGetId(alex, "HN-5F-01", "2026-11-09T09:00", "2026-11-09T10:00");
        bookAndGetId(ben, "HN-6F-01", "2026-11-02T11:00", "2026-11-02T12:00");

        mvc.perform(get("/api/bookings/mine").header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id").value(contains(
                        (int) early, (int) sameStart, (int) late, (int) nextWeek)))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.totalElements").value(4))
                .andExpect(jsonPath("$.page.totalPages").value(1));

        // from/to are dates and both ends are inclusive
        mvc.perform(get("/api/bookings/mine").param("from", "2026-11-02").param("to", "2026-11-03")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.content[*].id").value(contains((int) early, (int) sameStart, (int) late)));

        mvc.perform(get("/api/bookings/mine").param("size", "2").param("page", "1")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$.content[*].id").value(contains((int) late, (int) nextWeek)))
                .andExpect(jsonPath("$.page.totalPages").value(2));

        mvc.perform(get("/api/bookings/mine").param("from", "2026-11-05").param("to", "2026-11-02")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("to"));
    }

    @Test
    void minePageUsesTheSameNumberOfQueriesWhateverTheNumberOfBookings() throws Exception {
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        long oneBooking = statementsFor(() -> mvc.perform(get("/api/bookings/mine")
                .header(HttpHeaders.AUTHORIZATION, bearer(alex))).andExpect(jsonPath("$.content", hasSize(1))));

        bookAndGetId(alex, "HN-5F-02", "2026-11-02T09:00", "2026-11-02T10:00");
        bookAndGetId(alex, "HN-6F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        bookAndGetId(alex, "HN-5F-01", "2026-11-03T09:00", "2026-11-03T10:00");
        bookAndGetId(alex, "HN-5F-02", "2026-11-03T09:00", "2026-11-03T10:00");
        long fiveBookings = statementsFor(() -> mvc.perform(get("/api/bookings/mine")
                .header(HttpHeaders.AUTHORIZATION, bearer(alex))).andExpect(jsonPath("$.content", hasSize(5))));

        assertThat(fiveBookings).isEqualTo(oneBooking);
    }

    @Test
    void scheduleListsConfirmedBookingsOfTheDay() throws Exception {
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T14:00", "2026-11-02T15:00");
        bookAndGetId(ben, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        long cancelled = bookAndGetId(ben, "HN-5F-01", "2026-11-02T11:00", "2026-11-02T12:00");
        bookAndGetId(ben, "HN-5F-01", "2026-11-03T09:00", "2026-11-03T10:00");
        mvc.perform(post("/api/bookings/{id}/cancellation", cancelled).header(HttpHeaders.AUTHORIZATION, bearer(ben)))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/rooms/HN-5F-01/schedule").param("date", "2026-11-02")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].startAt").value("2026-11-02T09:00"))
                .andExpect(jsonPath("$[0].endAt").value("2026-11-02T10:00"))
                .andExpect(jsonPath("$[0].title").value("Meeting"))
                .andExpect(jsonPath("$[0].id").doesNotExist())
                .andExpect(jsonPath("$[1].startAt").value("2026-11-02T14:00"));
    }

    @Test
    void availableRoomsAreActiveBigEnoughAndFreeSortedByCapacityThenCode() throws Exception {
        jdbc.update("INSERT INTO rooms (code, name, capacity, active) VALUES ('HN-7F-01', 'Maple', 4, TRUE)");
        jdbc.update("INSERT INTO rooms (code, name, capacity, active) VALUES ('HN-7F-02', 'Pine', 30, FALSE)");
        bookAndGetId(ben, "HN-6F-01", "2026-11-02T09:30", "2026-11-02T10:30");
        bookAndGetId(ben, "HN-5F-01", "2026-11-02T10:00", "2026-11-02T11:00");

        mvc.perform(get("/api/rooms/available")
                        .param("startAt", "2026-11-02T09:00").param("endAt", "2026-11-02T10:00")
                        .param("attendees", "3")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(contains("HN-5F-02", "HN-7F-01", "HN-5F-01")));

        mvc.perform(get("/api/rooms/available")
                        .param("startAt", "2026-11-02T09:00").param("endAt", "2026-11-02T10:00")
                        .param("attendees", "5")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex)))
                .andExpect(jsonPath("$[*].code").value(contains("HN-5F-01")));
    }

    @Test
    void rejectedBookingLeavesNoData() throws Exception {
        bookAndGetId(alex, "HN-5F-01", "2026-11-02T09:00", "2026-11-02T10:00");
        int before = countBookings();
        book(ben, "HN-5F-01", "2026-11-02T09:30", "2026-11-02T10:30", 2).andExpect(status().isConflict());
        book(ben, "HN-5F-01", "2026-11-02T07:00", "2026-11-02T10:30", 2).andExpect(status().isBadRequest());
        book(ben, "HN-5F-01", "2026-11-02T11:00", "2026-11-02T12:00", 99).andExpect(status().isConflict());
        assertThat(countBookings()).isEqualTo(before);
    }

    @Test
    void requestCannotChooseTheOwner() throws Exception {
        mvc.perform(post("/api/bookings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alex))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roomCode":"HN-5F-01","title":"Sync","attendees":2,"ownerEmail":"ben@roomdesk.test",
                                 "startAt":"2026-11-02T09:00","endAt":"2026-11-02T10:00"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerEmail").value(ALEX));
    }

    private long statementsFor(ThrowingRunnable action) throws Exception {
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        action.run();
        return statistics.getPrepareStatementCount();
    }

    @FunctionalInterface
    private interface ThrowingRunnable {
        void run() throws Exception;
    }
}
