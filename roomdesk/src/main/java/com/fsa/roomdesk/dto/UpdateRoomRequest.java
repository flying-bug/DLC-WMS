package com.fsa.roomdesk.dto;

import com.fsa.roomdesk.domain.Room;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateRoomRequest(
        @NotBlank
        @Size(max = Room.MAX_NAME_LENGTH)
        String name,

        @NotNull
        @Min(Room.MIN_CAPACITY)
        @Max(Room.MAX_CAPACITY)
        Integer capacity) {
}
