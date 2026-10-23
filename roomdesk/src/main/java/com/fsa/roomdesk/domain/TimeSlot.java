package com.fsa.roomdesk.domain;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * A half-open time interval {@code [startAt, endAt)}: a slot ending at 10:00 and a slot
 * starting at 10:00 do not overlap.
 */
public record TimeSlot(LocalDateTime startAt, LocalDateTime endAt) {

    public TimeSlot {
        Objects.requireNonNull(startAt, "startAt");
        Objects.requireNonNull(endAt, "endAt");
    }

    public boolean overlaps(TimeSlot other) {
        return startAt.isBefore(other.endAt) && other.startAt.isBefore(endAt);
    }

    public Duration duration() {
        return Duration.between(startAt, endAt);
    }
}
