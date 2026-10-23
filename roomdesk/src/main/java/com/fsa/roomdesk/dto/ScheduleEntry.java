package com.fsa.roomdesk.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

public record ScheduleEntry(
        @JsonFormat(pattern = DateTimes.PATTERN) @Schema(type = "string", example = "2026-11-02T09:00") LocalDateTime startAt,
        @JsonFormat(pattern = DateTimes.PATTERN) @Schema(type = "string", example = "2026-11-02T10:00") LocalDateTime endAt,
        String title) {
}
