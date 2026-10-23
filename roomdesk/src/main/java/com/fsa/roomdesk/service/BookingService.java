package com.fsa.roomdesk.service;

import com.fsa.roomdesk.domain.Booking;
import com.fsa.roomdesk.domain.TimeSlot;
import com.fsa.roomdesk.dto.BookingRequest;
import com.fsa.roomdesk.dto.BookingResponse;
import com.fsa.roomdesk.dto.PageResponse;
import com.fsa.roomdesk.exception.ApiException;
import com.fsa.roomdesk.exception.ProblemType;
import com.fsa.roomdesk.repository.BookingRepository;
import com.fsa.roomdesk.repository.RoomRepository;
import com.fsa.roomdesk.repository.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BookingService {

    /** Bounds used when the caller omits from/to; far outside any real booking. */
    private static final LocalDateTime EARLIEST = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final LocalDateTime LATEST = LocalDateTime.of(9999, 1, 1, 0, 0);

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public BookingService(BookingRepository bookingRepository,
                          RoomRepository roomRepository,
                          UserRepository userRepository,
                          Clock clock) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Creates a booking for the caller. The room row is locked first, so two concurrent requests
     * for the same room run one after the other and the second one sees the first booking. The
     * exclusion constraint {@code bookings_no_overlap} backs this up at the database level.
     */
    @Transactional
    public BookingResponse create(BookingRequest request, Caller caller) {
        var owner = userRepository.findByEmailIgnoreCase(caller.email())
                .orElseThrow(() -> new ApiException(ProblemType.UNAUTHORIZED, "Unknown user"));
        var room = roomRepository.findByCodeForUpdate(request.roomCode())
                .orElseThrow(() -> RoomService.roomNotFound(request.roomCode()));
        if (!room.isActive()) {
            throw ApiException.conflict(ProblemType.ROOM_INACTIVE, "Room " + room.getCode() + " is inactive");
        }
        if (!room.canHost(request.attendees())) {
            throw ApiException.conflict(ProblemType.CAPACITY_EXCEEDED,
                    request.attendees() + " attendees exceed the capacity " + room.getCapacity()
                            + " of room " + room.getCode());
        }
        var slot = new TimeSlot(request.startAt(), request.endAt());
        if (bookingRepository.existsConfirmedOverlap(room, slot.startAt(), slot.endAt())) {
            throw overlap(room.getCode());
        }
        var booking = bookingRepository.saveAndFlush(
                new Booking(room, owner, request.title().strip(), request.attendees(), slot));
        return BookingMapper.toResponse(booking);
    }

    public BookingResponse get(Long id, Caller caller) {
        var booking = bookingRepository.findDetailedById(id)
                .filter(b -> canSee(b, caller))
                .orElseThrow(() -> bookingNotFound(id));
        return BookingMapper.toResponse(booking);
    }

    public PageResponse<BookingResponse> mine(Caller caller, LocalDate from, LocalDate to, int page, int size) {
        var owner = userRepository.findByEmailIgnoreCase(caller.email())
                .orElseThrow(() -> new ApiException(ProblemType.UNAUTHORIZED, "Unknown user"));
        var lower = from == null ? EARLIEST : from.atStartOfDay();
        var upper = to == null ? LATEST : to.plusDays(1).atStartOfDay();
        var pageable = PageRequest.of(page, size, Sort.by("startAt").ascending().and(Sort.by("id").ascending()));
        return PageResponse.of(bookingRepository.findPageByOwner(owner.getId(), lower, upper, pageable),
                BookingMapper::toResponse);
    }

    @Transactional
    public void cancel(Long id, Caller caller) {
        var booking = bookingRepository.findByIdForUpdate(id)
                .filter(b -> canSee(b, caller))
                .orElseThrow(() -> bookingNotFound(id));
        if (!booking.isConfirmed()) {
            throw ApiException.conflict(ProblemType.INVALID_STATE, "Booking " + id + " is already cancelled");
        }
        if (booking.hasStarted(LocalDateTime.now(clock))) {
            throw ApiException.conflict(ProblemType.INVALID_STATE, "Booking " + id + " has already started");
        }
        booking.cancel();
    }

    /** An employee sees only their own bookings; anything else looks like it does not exist. */
    private static boolean canSee(Booking booking, Caller caller) {
        return caller.admin() || booking.isOwnedBy(caller.email());
    }

    private static ApiException bookingNotFound(Long id) {
        return ApiException.notFound("Booking " + id + " does not exist");
    }

    static ApiException overlap(String roomCode) {
        return ApiException.conflict(ProblemType.BOOKING_OVERLAP,
                "Room " + roomCode + " already has a booking in this time range");
    }
}
