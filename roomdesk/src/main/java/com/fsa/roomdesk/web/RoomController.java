package com.fsa.roomdesk.web;

import static com.fsa.roomdesk.exception.ProblemType.CAPACITY_EXCEEDED;
import static com.fsa.roomdesk.exception.ProblemType.FORBIDDEN;
import static com.fsa.roomdesk.exception.ProblemType.MALFORMED_REQUEST;
import static com.fsa.roomdesk.exception.ProblemType.NOT_FOUND;
import static com.fsa.roomdesk.exception.ProblemType.ROOM_CODE_TAKEN;
import static com.fsa.roomdesk.exception.ProblemType.ROOM_INACTIVE;
import static com.fsa.roomdesk.exception.ProblemType.UNAUTHORIZED;
import static com.fsa.roomdesk.exception.ProblemType.VALIDATION;

import com.fsa.roomdesk.domain.Room;
import com.fsa.roomdesk.dto.AvailabilityQuery;
import com.fsa.roomdesk.dto.CreateRoomRequest;
import com.fsa.roomdesk.dto.DeactivationResponse;
import com.fsa.roomdesk.dto.PageResponse;
import com.fsa.roomdesk.dto.RoomResponse;
import com.fsa.roomdesk.dto.ScheduleEntry;
import com.fsa.roomdesk.dto.UpdateRoomRequest;
import com.fsa.roomdesk.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springdoc.core.annotations.ParameterObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/rooms")
@Tag(name = "Rooms")
public class RoomController {

    private static final String CODE_MESSAGE = "must look like HN-5F-01";

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    @Operation(summary = "List rooms, sorted by code")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED})
    public PageResponse<RoomResponse> list(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "minCapacity", required = false) @Min(Room.MIN_CAPACITY) @Max(Room.MAX_CAPACITY)
            Integer minCapacity,
            @RequestParam(name = "active", required = false) Boolean active) {
        return roomService.list(minCapacity, active, page, size);
    }

    @GetMapping("/available")
    @Operation(summary = "Active rooms with enough seats that are free for the whole range, "
            + "sorted by capacity then code")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED})
    public List<RoomResponse> available(@ParameterObject @Valid @ModelAttribute AvailabilityQuery query) {
        return roomService.available(query);
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get a room")
    @ApiProblems({VALIDATION, UNAUTHORIZED, NOT_FOUND})
    public RoomResponse get(@PathVariable("code") @Pattern(regexp = Room.CODE_PATTERN, message = CODE_MESSAGE)
                            String code) {
        return roomService.get(code);
    }

    @PostMapping
    @Operation(summary = "Create a room (ADMIN)")
    @ApiResponse(responseCode = "201", description = "Room created; Location points to it")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, FORBIDDEN, ROOM_CODE_TAKEN})
    public ResponseEntity<RoomResponse> create(@Valid @RequestBody CreateRoomRequest request) {
        var room = roomService.create(request);
        var location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{code}")
                .buildAndExpand(room.code())
                .toUri();
        return ResponseEntity.created(location).body(room);
    }

    @PutMapping("/{code}")
    @Operation(summary = "Replace a room's name and capacity (ADMIN)")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CAPACITY_EXCEEDED})
    public RoomResponse update(@PathVariable("code") @Pattern(regexp = Room.CODE_PATTERN, message = CODE_MESSAGE)
                               String code,
                               @Valid @RequestBody UpdateRoomRequest request) {
        return roomService.update(code, request);
    }

    @PostMapping("/{code}/deactivation")
    @Operation(summary = "Deactivate a room and cancel its upcoming bookings (ADMIN)")
    @ApiProblems({VALIDATION, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, ROOM_INACTIVE})
    public DeactivationResponse deactivate(@PathVariable("code")
                                           @Pattern(regexp = Room.CODE_PATTERN, message = CODE_MESSAGE)
                                           String code) {
        return roomService.deactivate(code);
    }

    @GetMapping("/{code}/schedule")
    @Operation(summary = "CONFIRMED bookings of a room on one day, sorted by start time")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, NOT_FOUND})
    public List<ScheduleEntry> schedule(
            @PathVariable("code") @Pattern(regexp = Room.CODE_PATTERN, message = CODE_MESSAGE) String code,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Parameter(example = "2026-11-02") LocalDate date) {
        return roomService.schedule(code, date);
    }
}
