package com.fsa.roomdesk.dto;

import com.fsa.roomdesk.domain.BookingStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        String roomCode,
        String roomName,
        String ownerEmail,
        String title,
        int attendees,
        @JsonFormat(pattern = DateTimes.PATTERN) @Schema(type = "string", example = "2026-11-02T09:30") LocalDateTime startAt,
        @JsonFormat(pattern = DateTimes.PATTERN) @Schema(type = "string", example = "2026-11-02T10:30") LocalDateTime endAt,
        BookingStatus status) {
}
