package com.fsa.roomdesk.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fsa.roomdesk.domain.BookingRules.Violation;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** Booking rules of Task 2, evaluated at a fixed instant (never the machine clock). */
class BookingRulesTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** "Now" for every test: 2026-11-01 12:00 in Ho Chi Minh City. */
    private static final Clock CLOCK = Clock.fixed(
            ZonedDateTime.of(2026, 11, 1, 12, 0, 0, 0, ZONE).toInstant(), ZONE);
    private static final LocalDateTime NOW = LocalDateTime.now(CLOCK);

    private static LocalDateTime at(String time) {
        return LocalDateTime.parse("2026-11-02T" + time);
    }

    private static List<Violation> check(String start, String end) {
        return BookingRules.checkWindow(at(start), at(end), NOW);
    }

    @Test
    void fixedClockIsUsed() {
        assertThat(NOW).isEqualTo(LocalDateTime.of(2026, 11, 1, 12, 0));
    }

    @Nested
    class Overlap {

        private final TimeSlot nineToTen = new TimeSlot(at("09:00"), at("10:00"));

        @Test
        void bookingEndingAtTenDoesNotOverlapBookingStartingAtTen() {
            var tenToHalfPast = new TimeSlot(at("10:00"), at("10:30"));
            assertThat(nineToTen.overlaps(tenToHalfPast)).isFalse();
            assertThat(tenToHalfPast.overlaps(nineToTen)).isFalse();
        }

        @Test
        void bookingCrossingTenOverlaps() {
            var crossing = new TimeSlot(at("09:45"), at("10:15"));
            assertThat(nineToTen.overlaps(crossing)).isTrue();
            assertThat(crossing.overlaps(nineToTen)).isTrue();
        }

        @Test
        void containedAndIdenticalSlotsOverlap() {
            assertThat(nineToTen.overlaps(new TimeSlot(at("09:15"), at("09:30")))).isTrue();
            assertThat(nineToTen.overlaps(new TimeSlot(at("09:00"), at("10:00")))).isTrue();
        }
    }

    @Nested
    class Duration {

        @Test
        void exactlyFourHoursIsValid() {
            assertThat(check("08:00", "12:00")).isEmpty();
        }

        @Test
        void fourHoursAndFifteenMinutesIsRejected() {
            assertThat(check("08:00", "12:15"))
                    .containsExactly(new Violation("endAt", "booking must last at most 4 hours"));
        }

        @Test
        void fifteenMinutesIsValid() {
            assertThat(check("09:00", "09:15")).isEmpty();
        }

        @Test
        void endBeforeOrEqualToStartIsRejected() {
            assertThat(check("10:00", "10:00")).containsExactly(new Violation("endAt", "must be after startAt"));
            assertThat(check("10:00", "09:00")).containsExactly(new Violation("endAt", "must be after startAt"));
        }
    }

    @Nested
    class OpeningHours {

        @Test
        void startingAtEightIsValid() {
            assertThat(check("08:00", "09:00")).isEmpty();
        }

        @Test
        void startingBeforeEightIsRejected() {
            assertThat(check("07:45", "09:00"))
                    .containsExactly(new Violation("startAt", "must not be before 08:00"));
        }

        @Test
        void endingAtTwentyIsValid() {
            assertThat(check("19:00", "20:00")).isEmpty();
        }

        @Test
        void endingAfterTwentyIsRejected() {
            assertThat(check("19:00", "20:15"))
                    .containsExactly(new Violation("endAt", "must not be after 20:00"));
        }

        @Test
        void endingOnAnotherDayIsRejected() {
            var violations = BookingRules.checkWindow(at("19:00"), LocalDateTime.parse("2026-11-03T09:00"), NOW);
            assertThat(violations).contains(new Violation("endAt", "must be on the same day as startAt"));
        }
    }

    @Nested
    class QuarterHours {

        @Test
        void quarterMinutesAreValid() {
            assertThat(check("09:15", "09:45")).isEmpty();
            assertThat(check("09:30", "10:45")).isEmpty();
        }

        @Test
        void otherMinutesAreRejected() {
            assertThat(check("09:10", "09:50")).containsExactlyInAnyOrder(
                    new Violation("startAt", "must be on minute 00, 15, 30 or 45"),
                    new Violation("endAt", "must be on minute 00, 15, 30 or 45"));
        }

        @Test
        void secondsAreRejected() {
            var violations = BookingRules.checkWindow(at("09:00:30"), at("10:00"), NOW);
            assertThat(violations).containsExactly(new Violation("startAt", "must be on minute 00, 15, 30 or 45"));
        }
    }

    @Nested
    class Future {

        @Test
        void startInThePastIsRejected() {
            var violations = BookingRules.checkWindow(
                    LocalDateTime.parse("2026-11-01T09:00"), LocalDateTime.parse("2026-11-01T10:00"), NOW);
            assertThat(violations).containsExactly(new Violation("startAt", "must be in the future"));
        }

        @Test
        void startExactlyNowIsRejected() {
            var violations = BookingRules.checkWindow(NOW, NOW.plusHours(1), NOW);
            assertThat(violations).containsExactly(new Violation("startAt", "must be in the future"));
        }

        @Test
        void startOneSlotAfterNowIsValid() {
            assertThat(BookingRules.checkWindow(NOW.plusMinutes(15), NOW.plusHours(1), NOW)).isEmpty();
        }
    }

    @Nested
    class Cancellation {

        private Booking booking(String start, String end) {
            return new Booking(new Room("HN-5F-01", "Lotus", 8), null, "Sync", 2,
                    new TimeSlot(LocalDateTime.parse(start), LocalDateTime.parse(end)));
        }

        @Test
        void confirmedFutureBookingIsCancellable() {
            assertThat(booking("2026-11-01T12:15", "2026-11-01T13:00").isCancellable(NOW)).isTrue();
        }

        @Test
        void bookingThatHasStartedIsNotCancellable() {
            assertThat(booking("2026-11-01T12:00", "2026-11-01T13:00").isCancellable(NOW)).isFalse();
            assertThat(booking("2026-11-01T11:00", "2026-11-01T13:00").isCancellable(NOW)).isFalse();
        }

        @Test
        void cancelledBookingIsNotCancellableAgain() {
            var booking = booking("2026-11-02T09:00", "2026-11-02T10:00");
            booking.cancel();
            assertThat(booking.isCancellable(NOW)).isFalse();
        }
    }

    @Nested
    class RoomCapacity {

        @Test
        void attendeesFromOneUpToCapacityFit() {
            var room = new Room("HN-5F-01", "Lotus", 8);
            assertThat(room.canHost(1)).isTrue();
            assertThat(room.canHost(8)).isTrue();
            assertThat(room.canHost(9)).isFalse();
            assertThat(room.canHost(0)).isFalse();
        }
    }
}
