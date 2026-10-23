package com.fsa.roomdesk.dto;

import com.fsa.roomdesk.domain.Booking;
import com.fsa.roomdesk.domain.Room;
import com.fsa.roomdesk.validation.TimeWindow;
import com.fsa.roomdesk.validation.ValidBookingWindow;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@ValidBookingWindow
public record BookingRequest(
        @NotNull
        @Pattern(regexp = Room.CODE_PATTERN, message = "must look like HN-5F-01")
        String roomCode,

        @NotBlank
        @Size(max = Booking.MAX_TITLE_LENGTH)
        String title,

        @NotNull
        @Min(1)
        Integer attendees,

        @NotNull
        @Schema(type = "string", example = "2026-11-02T09:30", description = "Local time, Asia/Ho_Chi_Minh")
        LocalDateTime startAt,

        @NotNull
        @Schema(type = "string", example = "2026-11-02T10:30", description = "Local time, Asia/Ho_Chi_Minh")
        LocalDateTime endAt) implements TimeWindow {
}
