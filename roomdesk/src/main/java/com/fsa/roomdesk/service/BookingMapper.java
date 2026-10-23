package com.fsa.roomdesk.service;

import com.fsa.roomdesk.domain.Booking;
import com.fsa.roomdesk.domain.Room;
import com.fsa.roomdesk.dto.BookingResponse;
import com.fsa.roomdesk.dto.RoomResponse;
import com.fsa.roomdesk.dto.ScheduleEntry;

final class BookingMapper {

    private BookingMapper() {
    }

    static RoomResponse toResponse(Room room) {
        return new RoomResponse(room.getCode(), room.getName(), room.getCapacity(), room.isActive());
    }

    static BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getRoom().getCode(),
                booking.getRoom().getName(),
                booking.getOwner().getEmail(),
                booking.getTitle(),
                booking.getAttendees(),
                booking.getStartAt(),
                booking.getEndAt(),
                booking.getStatus());
    }

    static ScheduleEntry toScheduleEntry(Booking booking) {
        return new ScheduleEntry(booking.getStartAt(), booking.getEndAt(), booking.getTitle());
    }
}
