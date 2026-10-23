package com.fsa.roomdesk.service;

import com.fsa.roomdesk.domain.Booking;
import com.fsa.roomdesk.domain.Room;
import com.fsa.roomdesk.dto.AvailabilityQuery;
import com.fsa.roomdesk.dto.CreateRoomRequest;
import com.fsa.roomdesk.dto.DeactivationResponse;
import com.fsa.roomdesk.dto.PageResponse;
import com.fsa.roomdesk.dto.RoomResponse;
import com.fsa.roomdesk.dto.ScheduleEntry;
import com.fsa.roomdesk.dto.UpdateRoomRequest;
import com.fsa.roomdesk.exception.ApiException;
import com.fsa.roomdesk.exception.ProblemType;
import com.fsa.roomdesk.repository.BookingRepository;
import com.fsa.roomdesk.repository.RoomRepository;
import com.fsa.roomdesk.repository.RoomSpecifications;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final CancellationNotifier cancellationNotifier;
    private final Clock clock;

    public RoomService(RoomRepository roomRepository,
                       BookingRepository bookingRepository,
                       CancellationNotifier cancellationNotifier,
                       Clock clock) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.cancellationNotifier = cancellationNotifier;
        this.clock = clock;
    }

    public PageResponse<RoomResponse> list(Integer minCapacity, Boolean active, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("code").ascending());
        return PageResponse.of(
                roomRepository.findAll(RoomSpecifications.filter(minCapacity, active), pageable),
                BookingMapper::toResponse);
    }

    public RoomResponse get(String code) {
        return BookingMapper.toResponse(findRoom(code));
    }

    @Transactional
    public RoomResponse create(CreateRoomRequest request) {
        if (roomRepository.existsByCode(request.code())) {
            throw roomCodeTaken(request.code());
        }
        // A concurrent insert of the same code is caught by the unique constraint (rooms_code_key).
        var room = roomRepository.saveAndFlush(new Room(request.code(), request.name().strip(), request.capacity()));
        return BookingMapper.toResponse(room);
    }

    @Transactional
    public RoomResponse update(String code, UpdateRoomRequest request) {
        var room = roomRepository.findByCodeForUpdate(code).orElseThrow(() -> roomNotFound(code));
        int largestUpcoming = bookingRepository.maxUpcomingAttendees(room, now());
        if (request.capacity() < largestUpcoming) {
            throw ApiException.conflict(ProblemType.CAPACITY_EXCEEDED,
                    "Capacity " + request.capacity() + " is below an upcoming booking with "
                            + largestUpcoming + " attendees");
        }
        room.rename(request.name().strip());
        room.changeCapacity(request.capacity());
        return BookingMapper.toResponse(room);
    }

    public List<ScheduleEntry> schedule(String code, LocalDate date) {
        var room = findRoom(code);
        return bookingRepository
                .findConfirmedForRoomBetween(room, date.atStartOfDay(), date.plusDays(1).atStartOfDay())
                .stream()
                .map(BookingMapper::toScheduleEntry)
                .toList();
    }

    public List<RoomResponse> available(AvailabilityQuery query) {
        return roomRepository.findAvailable(query.startAt(), query.endAt(), query.attendees())
                .stream()
                .map(BookingMapper::toResponse)
                .toList();
    }

    /**
     * Deactivates a room and cancels its upcoming CONFIRMED bookings in one transaction: if any
     * step fails, the room stays active and no booking changes.
     */
    @Transactional
    public DeactivationResponse deactivate(String code) {
        var room = roomRepository.findByCodeForUpdate(code).orElseThrow(() -> roomNotFound(code));
        if (!room.isActive()) {
            throw ApiException.conflict(ProblemType.ROOM_INACTIVE, "Room " + code + " is already inactive");
        }
        room.deactivate();
        roomRepository.flush();

        List<Booking> upcoming = bookingRepository.findUpcomingConfirmedForRoom(room, now());
        for (Booking booking : upcoming) {
            booking.cancel();
            bookingRepository.flush();
            cancellationNotifier.bookingCancelled(BookingMapper.toResponse(booking), "room " + code + " deactivated");
        }
        return new DeactivationResponse(upcoming.size());
    }

    private Room findRoom(String code) {
        return roomRepository.findByCode(code).orElseThrow(() -> roomNotFound(code));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    static ApiException roomNotFound(String code) {
        return ApiException.notFound("Room " + code + " does not exist");
    }

    static ApiException roomCodeTaken(String code) {
        return ApiException.conflict(ProblemType.ROOM_CODE_TAKEN, "Room code " + code + " is already taken");
    }
}
