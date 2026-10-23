package com.fsa.roomdesk.dto;

import com.fsa.roomdesk.domain.Room;
import com.fsa.roomdesk.validation.TimeWindow;
import com.fsa.roomdesk.validation.ValidBookingWindow;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;

@ValidBookingWindow
public record AvailabilityQuery(
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        @Parameter(example = "2026-11-02T09:30")
        LocalDateTime startAt,

        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        @Parameter(example = "2026-11-02T10:30")
        LocalDateTime endAt,

        @NotNull
        @Min(1)
        @Max(Room.MAX_CAPACITY)
        Integer attendees) implements TimeWindow {
}
