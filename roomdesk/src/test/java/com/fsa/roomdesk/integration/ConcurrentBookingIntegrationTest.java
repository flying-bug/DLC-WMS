package com.fsa.roomdesk.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fsa.roomdesk.support.IntegrationTest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataIntegrityViolationException;

/** Two overlapping requests sent at the same moment over real HTTP: exactly one booking survives. */
class ConcurrentBookingIntegrationTest extends IntegrationTest {

    private static final int ROUNDS = 5;

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void onlyOneOfTwoConcurrentOverlappingRequestsSucceeds() throws Exception {
        var tokens = List.of(token(ALEX), token(BEN));
        try (var executor = Executors.newFixedThreadPool(2)) {
            for (int round = 0; round < ROUNDS; round++) {
                var day = "2026-11-0" + (2 + round);
                var bodies = List.of(
                        bookingJson("HN-5F-01", day + "T09:00", day + "T10:00", 2),
                        bookingJson("HN-5F-01", day + "T09:30", day + "T10:30", 2));
                var barrier = new CyclicBarrier(2);
                List<Future<HttpResponse<String>>> futures = new ArrayList<>();
                for (int i = 0; i < 2; i++) {
                    var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/bookings"))
                            .header("Authorization", bearer(tokens.get(i)))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(bodies.get(i)))
                            .build();
                    Callable<HttpResponse<String>> call = () -> {
                        barrier.await();
                        return http.send(request, HttpResponse.BodyHandlers.ofString());
                    };
                    futures.add(executor.submit(call));
                }
                var responses = new ArrayList<HttpResponse<String>>();
                for (var future : futures) {
                    responses.add(future.get());
                }

                assertThat(responses).extracting(HttpResponse::statusCode).containsExactlyInAnyOrder(201, 409);
                var rejected = responses.stream().filter(r -> r.statusCode() == 409).findFirst().orElseThrow();
                assertThat(rejected.body()).contains("https://roomdesk.example/problems/booking-overlap");
                assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM bookings WHERE start_at::date = ?::date", Integer.class, day))
                        .isEqualTo(1);
            }
        }
        assertThat(countBookings()).isEqualTo(ROUNDS);
    }

    @Test
    void databaseRejectsOverlappingConfirmedBookingsEvenWithoutTheService() {
        var roomId = jdbc.queryForObject("SELECT id FROM rooms WHERE code = 'HN-5F-01'", Long.class);
        var ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, ALEX);
        var insert = """
                INSERT INTO bookings (room_id, owner_id, title, attendees, start_at, end_at, status)
                VALUES (?, ?, 'x', 1, ?::timestamp, ?::timestamp, ?)""";

        jdbc.update(insert, roomId, ownerId, "2026-11-02 09:00", "2026-11-02 10:00", "CONFIRMED");
        // Touching at 10:00 is fine, and a CANCELLED booking does not hold the slot.
        jdbc.update(insert, roomId, ownerId, "2026-11-02 10:00", "2026-11-02 10:30", "CONFIRMED");
        jdbc.update(insert, roomId, ownerId, "2026-11-02 09:30", "2026-11-02 10:00", "CANCELLED");

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                        jdbc.update(insert, roomId, ownerId, "2026-11-02 09:45", "2026-11-02 10:15", "CONFIRMED"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("bookings_no_overlap");
    }
}
