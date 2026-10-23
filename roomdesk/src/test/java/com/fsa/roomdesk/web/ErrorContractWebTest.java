package com.fsa.roomdesk.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fsa.roomdesk.exception.ApiException;
import com.fsa.roomdesk.exception.ProblemType;
import com.fsa.roomdesk.security.SecurityConfig;
import com.fsa.roomdesk.service.AuthService;
import com.fsa.roomdesk.service.BookingService;
import com.fsa.roomdesk.service.RoomService;
import com.fsa.roomdesk.support.TestClockConfiguration;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Web layer only (services are mocked): every status/type pair of the error contract, with the
 * RFC 9457 body. "Now" is fixed at 2026-11-01 08:00.
 */
@WebMvcTest(controllers = {RoomController.class, BookingController.class, AuthController.class})
@Import({SecurityConfig.class, TestClockConfiguration.class})
@ActiveProfiles("test")
class ErrorContractWebTest {

    private static final String PROBLEMS = "https://roomdesk.example/problems/";
    private static final String VALID_BOOKING = """
            {"roomCode":"HN-5F-01","title":"Sync","attendees":2,
             "startAt":"2026-11-02T09:00","endAt":"2026-11-02T10:00"}""";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private RoomService roomService;
    @MockitoBean
    private BookingService bookingService;
    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private UserDetailsService userDetailsService;

    private static RequestPostProcessor employee() {
        return jwt().jwt(j -> j.subject("alex@roomdesk.test"))
                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"));
    }

    private static RequestPostProcessor admin() {
        return jwt().jwt(j -> j.subject("admin@roomdesk.test"))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static void expectProblem(ResultActions result, int status, String type, String instance)
            throws Exception {
        result.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value(PROBLEMS + type))
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.title").isString())
                .andExpect(jsonPath("$.detail").isString())
                .andExpect(jsonPath("$.instance").value(instance));
    }

    @Nested
    class BadRequest {

        @Test
        void validationErrorListsTheInvalidField() throws Exception {
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(VALID_BOOKING.replace("\"attendees\":2", "\"attendees\":0")));
            expectProblem(result, 400, "validation", "/api/bookings");
            result.andExpect(jsonPath("$.title").value("Validation failed"))
                    .andExpect(jsonPath("$.detail").value("Request has 1 invalid field"))
                    .andExpect(jsonPath("$.errors[0].field").value("attendees"))
                    .andExpect(jsonPath("$.errors[0].message").value("must be greater than or equal to 1"));
        }

        @Test
        void missingFieldIsAValidationError() throws Exception {
            var result = mvc.perform(post("/api/rooms").with(admin())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"code":"HN-7F-01","name":"Maple"}"""));
            expectProblem(result, 400, "validation", "/api/rooms");
            result.andExpect(jsonPath("$.errors[0].field").value("capacity"));
        }

        @Test
        void invalidTimeRangeIsAValidationError() throws Exception {
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(VALID_BOOKING.replace("2026-11-02T10:00", "2026-11-02T08:45")));
            expectProblem(result, 400, "validation", "/api/bookings");
            result.andExpect(jsonPath("$.errors[0].field").value("endAt"));
        }

        @Test
        void invalidQueryParameterIsAValidationError() throws Exception {
            var result = mvc.perform(get("/api/rooms").param("size", "101").with(employee()));
            expectProblem(result, 400, "validation", "/api/rooms");
            result.andExpect(jsonPath("$.errors[0].field").value("size"));
        }

        @Test
        void invalidPathVariableIsAValidationError() throws Exception {
            var result = mvc.perform(get("/api/rooms/hn-5f-01").with(employee()));
            expectProblem(result, 400, "validation", "/api/rooms/hn-5f-01");
            result.andExpect(jsonPath("$.errors[0].field").value("code"));
        }

        @Test
        void brokenJsonIsMalformed() throws Exception {
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"roomCode\": \"HN-5F-01\", "));
            expectProblem(result, 400, "malformed-request", "/api/bookings");
        }

        @Test
        void wrongJsonTypeIsMalformed() throws Exception {
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(VALID_BOOKING.replace("\"attendees\":2", "\"attendees\":\"two\"")));
            expectProblem(result, 400, "malformed-request", "/api/bookings");
        }

        @Test
        void wrongParameterTypeIsMalformed() throws Exception {
            var result = mvc.perform(get("/api/bookings/abc").with(employee()));
            expectProblem(result, 400, "malformed-request", "/api/bookings/abc");
        }
    }

    @Nested
    class Security {

        @Test
        void missingTokenIsUnauthorized() throws Exception {
            expectProblem(mvc.perform(get("/api/rooms")), 401, "unauthorized", "/api/rooms");
        }

        @Test
        void wrongCredentialsAreUnauthorized() throws Exception {
            given(authService.login(any())).willThrow(
                    new org.springframework.security.authentication.BadCredentialsException("bad"));
            var result = mvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"email":"alex@roomdesk.test","password":"wrong"}"""));
            expectProblem(result, 401, "unauthorized", "/api/auth/login");
        }

        @Test
        void wrongRoleIsForbidden() throws Exception {
            var result = mvc.perform(post("/api/rooms").with(employee())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"code":"HN-7F-01","name":"Maple","capacity":4}"""));
            expectProblem(result, 403, "forbidden", "/api/rooms");
        }
    }

    @Nested
    class NotFound {

        @Test
        void unknownRoomIsNotFound() throws Exception {
            given(roomService.get("HN-9F-99")).willThrow(ApiException.notFound("Room HN-9F-99 does not exist"));
            expectProblem(mvc.perform(get("/api/rooms/HN-9F-99").with(employee())),
                    404, "not-found", "/api/rooms/HN-9F-99");
        }

        @Test
        void unknownBookingIsNotFound() throws Exception {
            given(bookingService.get(eq(42L), any())).willThrow(ApiException.notFound("Booking 42 does not exist"));
            expectProblem(mvc.perform(get("/api/bookings/42").with(employee())),
                    404, "not-found", "/api/bookings/42");
        }
    }

    @Nested
    class Conflict {

        @Test
        void roomCodeTaken() throws Exception {
            given(roomService.create(any())).willThrow(
                    ApiException.conflict(ProblemType.ROOM_CODE_TAKEN, "Room code HN-5F-01 is already taken"));
            var result = mvc.perform(post("/api/rooms").with(admin())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"code":"HN-5F-01","name":"Lotus","capacity":8}"""));
            expectProblem(result, 409, "room-code-taken", "/api/rooms");
        }

        @Test
        void bookingOverlap() throws Exception {
            given(bookingService.create(any(), any())).willThrow(
                    ApiException.conflict(ProblemType.BOOKING_OVERLAP, "overlap"));
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON).content(VALID_BOOKING));
            expectProblem(result, 409, "booking-overlap", "/api/bookings");
        }

        @Test
        void exclusionConstraintViolationIsReportedAsBookingOverlap() throws Exception {
            given(bookingService.create(any(), any())).willThrow(new DataIntegrityViolationException(
                    "ERROR: conflicting key value violates exclusion constraint \"bookings_no_overlap\""));
            var result = mvc.perform(post("/api/bookings").with(employee())
                    .contentType(MediaType.APPLICATION_JSON).content(VALID_BOOKING));
            expectProblem(result, 409, "booking-overlap", "/api/bookings");
        }

        @Test
        void capacityExceeded() throws Exception {
            given(roomService.update(eq("HN-5F-01"), any())).willThrow(
                    ApiException.conflict(ProblemType.CAPACITY_EXCEEDED, "too small"));
            var result = mvc.perform(put("/api/rooms/HN-5F-01").with(admin())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"name":"Lotus","capacity":2}"""));
            expectProblem(result, 409, "capacity-exceeded", "/api/rooms/HN-5F-01");
        }

        @Test
        void roomInactive() throws Exception {
            given(roomService.deactivate("HN-5F-01")).willThrow(
                    ApiException.conflict(ProblemType.ROOM_INACTIVE, "Room HN-5F-01 is already inactive"));
            expectProblem(mvc.perform(post("/api/rooms/HN-5F-01/deactivation").with(admin())),
                    409, "room-inactive", "/api/rooms/HN-5F-01/deactivation");
        }

        @Test
        void invalidState() throws Exception {
            willThrow(ApiException.conflict(ProblemType.INVALID_STATE, "Booking 7 is already cancelled"))
                    .given(bookingService).cancel(eq(7L), any());
            expectProblem(mvc.perform(post("/api/bookings/7/cancellation").with(employee())),
                    409, "invalid-state", "/api/bookings/7/cancellation");
        }
    }

    @Nested
    class Internal {

        @Test
        void unexpectedErrorHidesInternals() throws Exception {
            given(roomService.get("HN-5F-01")).willThrow(new IllegalStateException(
                    "SELECT r1_0.id FROM rooms r1_0 failed in com.fsa.roomdesk.repository.RoomRepository"));
            var result = mvc.perform(get("/api/rooms/HN-5F-01").with(employee()));
            expectProblem(result, 500, "internal", "/api/rooms/HN-5F-01");
            result.andExpect(content().string(not(containsString("SELECT"))))
                    .andExpect(content().string(not(containsString("IllegalStateException"))))
                    .andExpect(content().string(not(containsString("com.fsa"))))
                    .andExpect(content().string(not(containsString("\tat "))));
        }
    }
}
