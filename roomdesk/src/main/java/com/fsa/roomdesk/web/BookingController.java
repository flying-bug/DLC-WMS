package com.fsa.roomdesk.web;

import static com.fsa.roomdesk.exception.ProblemType.BOOKING_OVERLAP;
import static com.fsa.roomdesk.exception.ProblemType.CAPACITY_EXCEEDED;
import static com.fsa.roomdesk.exception.ProblemType.INVALID_STATE;
import static com.fsa.roomdesk.exception.ProblemType.MALFORMED_REQUEST;
import static com.fsa.roomdesk.exception.ProblemType.NOT_FOUND;
import static com.fsa.roomdesk.exception.ProblemType.ROOM_INACTIVE;
import static com.fsa.roomdesk.exception.ProblemType.UNAUTHORIZED;
import static com.fsa.roomdesk.exception.ProblemType.VALIDATION;

import com.fsa.roomdesk.dto.BookingRequest;
import com.fsa.roomdesk.dto.BookingResponse;
import com.fsa.roomdesk.dto.PageResponse;
import com.fsa.roomdesk.exception.FieldValidationException;
import com.fsa.roomdesk.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/bookings")
@Tag(name = "Bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @Operation(summary = "Book a room; the owner is the caller")
    @ApiResponse(responseCode = "201", description = "Booking created; Location points to it")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, NOT_FOUND,
            ROOM_INACTIVE, CAPACITY_EXCEEDED, BOOKING_OVERLAP})
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingRequest request,
                                                  Authentication authentication) {
        var booking = bookingService.create(request, Callers.from(authentication));
        var location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(booking.id())
                .toUri();
        return ResponseEntity.created(location).body(booking);
    }

    @GetMapping("/mine")
    @Operation(summary = "The caller's bookings, sorted by startAt then id")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED})
    public PageResponse<BookingResponse> mine(
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Parameter(description = "First day, inclusive", example = "2026-11-01") LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Parameter(description = "Last day, inclusive", example = "2026-11-30") LocalDate to,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            Authentication authentication) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new FieldValidationException("to", "must not be before from");
        }
        return bookingService.mine(Callers.from(authentication), from, to, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a booking (owner or ADMIN)")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, NOT_FOUND})
    public BookingResponse get(@PathVariable("id") @Positive Long id, Authentication authentication) {
        return bookingService.get(id, Callers.from(authentication));
    }

    @PostMapping("/{id}/cancellation")
    @Operation(summary = "Cancel a CONFIRMED booking that has not started (owner or ADMIN)")
    @ApiResponse(responseCode = "204", description = "Booking cancelled")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED, NOT_FOUND, INVALID_STATE})
    public ResponseEntity<Void> cancel(@PathVariable("id") @Positive Long id, Authentication authentication) {
        bookingService.cancel(id, Callers.from(authentication));
        return ResponseEntity.noContent().build();
    }
}
