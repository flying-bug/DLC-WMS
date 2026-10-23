package com.fsa.roomdesk.repository;

import com.fsa.roomdesk.domain.Booking;
import com.fsa.roomdesk.domain.Room;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @EntityGraph(attributePaths = {"room", "owner"})
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findDetailedById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    /** One page of an owner's bookings; room and owner are fetched in the same query. */
    @EntityGraph(attributePaths = {"room", "owner"})
    @Query(value = """
            select b from Booking b
            where b.owner.id = :ownerId
              and b.startAt >= :from
              and b.startAt < :to
            """,
            countQuery = """
            select count(b) from Booking b
            where b.owner.id = :ownerId
              and b.startAt >= :from
              and b.startAt < :to
            """)
    Page<Booking> findPageByOwner(@Param("ownerId") Long ownerId,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,
                                  Pageable pageable);

    @Query("""
            select count(b) > 0 from Booking b
            where b.room = :room
              and b.status = com.fsa.roomdesk.domain.BookingStatus.CONFIRMED
              and b.startAt < :endAt
              and b.endAt > :startAt
            """)
    boolean existsConfirmedOverlap(@Param("room") Room room,
                                   @Param("startAt") LocalDateTime startAt,
                                   @Param("endAt") LocalDateTime endAt);

    @Query("""
            select b from Booking b
            where b.room = :room
              and b.status = com.fsa.roomdesk.domain.BookingStatus.CONFIRMED
              and b.startAt >= :from
              and b.startAt < :to
            order by b.startAt asc, b.id asc
            """)
    List<Booking> findConfirmedForRoomBetween(@Param("room") Room room,
                                              @Param("from") LocalDateTime from,
                                              @Param("to") LocalDateTime to);

    @Query("""
            select b from Booking b
            where b.room = :room
              and b.status = com.fsa.roomdesk.domain.BookingStatus.CONFIRMED
              and b.startAt > :now
            order by b.startAt asc, b.id asc
            """)
    List<Booking> findUpcomingConfirmedForRoom(@Param("room") Room room, @Param("now") LocalDateTime now);

    @Query("""
            select coalesce(max(b.attendees), 0) from Booking b
            where b.room = :room
              and b.status = com.fsa.roomdesk.domain.BookingStatus.CONFIRMED
              and b.startAt > :now
            """)
    int maxUpcomingAttendees(@Param("room") Room room, @Param("now") LocalDateTime now);

}
