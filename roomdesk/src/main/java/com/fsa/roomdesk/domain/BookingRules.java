package com.fsa.roomdesk.domain;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Time rules a booking (or an availability search) must satisfy. Pure functions: the current
 * time is always passed in, so the rules can be tested at a fixed instant.
 */
public final class BookingRules {

    public static final LocalTime OPENING_TIME = LocalTime.of(8, 0);
    public static final LocalTime CLOSING_TIME = LocalTime.of(20, 0);
    public static final Duration MIN_DURATION = Duration.ofMinutes(15);
    public static final Duration MAX_DURATION = Duration.ofHours(4);
    public static final int SLOT_MINUTES = 15;

    private BookingRules() {
    }

    public record Violation(String field, String message) {
    }

    /**
     * Checks the booking window against the rules. Null values are skipped (reported by
     * {@code @NotNull} on the request instead).
     *
     * @return the violations, empty when the window is valid
     */
    public static List<Violation> checkWindow(LocalDateTime startAt, LocalDateTime endAt, LocalDateTime now) {
        List<Violation> violations = new ArrayList<>();
        if (startAt != null) {
            if (!startAt.isAfter(now)) {
                violations.add(new Violation("startAt", "must be in the future"));
            }
            if (!isOnSlotBoundary(startAt)) {
                violations.add(new Violation("startAt", "must be on minute 00, 15, 30 or 45"));
            }
            if (startAt.toLocalTime().isBefore(OPENING_TIME)) {
                violations.add(new Violation("startAt", "must not be before 08:00"));
            }
        }
        if (endAt != null) {
            if (!isOnSlotBoundary(endAt)) {
                violations.add(new Violation("endAt", "must be on minute 00, 15, 30 or 45"));
            }
        }
        if (startAt == null || endAt == null) {
            return violations;
        }
        if (!endAt.isAfter(startAt)) {
            violations.add(new Violation("endAt", "must be after startAt"));
            return violations;
        }
        if (!endAt.toLocalDate().equals(startAt.toLocalDate())) {
            violations.add(new Violation("endAt", "must be on the same day as startAt"));
        } else if (endAt.toLocalTime().isAfter(CLOSING_TIME)) {
            violations.add(new Violation("endAt", "must not be after 20:00"));
        }
        Duration duration = Duration.between(startAt, endAt);
        if (duration.compareTo(MIN_DURATION) < 0) {
            violations.add(new Violation("endAt", "booking must last at least 15 minutes"));
        } else if (duration.compareTo(MAX_DURATION) > 0) {
            violations.add(new Violation("endAt", "booking must last at most 4 hours"));
        }
        return violations;
    }

    public static boolean isOnSlotBoundary(LocalDateTime time) {
        return time.getMinute() % SLOT_MINUTES == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }
}
