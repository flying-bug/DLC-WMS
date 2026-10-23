package com.fsa.roomdesk.repository;

import com.fsa.roomdesk.domain.Room;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long>, JpaSpecificationExecutor<Room> {

    Optional<Room> findByCode(String code);

    boolean existsByCode(String code);

    /**
     * Loads the room with a row lock ({@code SELECT ... FOR UPDATE}). Every write that depends on
     * a room's bookings (create booking, change capacity, deactivate) takes this lock first, so
     * those writes are serialised per room.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.code = :code")
    Optional<Room> findByCodeForUpdate(@Param("code") String code);

    @Query("""
            select r from Room r
            where r.active = true
              and r.capacity >= :attendees
              and not exists (
                  select 1 from Booking b
                  where b.room = r
                    and b.status = com.fsa.roomdesk.domain.BookingStatus.CONFIRMED
                    and b.startAt < :endAt
                    and b.endAt > :startAt)
            order by r.capacity asc, r.code asc
            """)
    List<Room> findAvailable(@Param("startAt") LocalDateTime startAt,
                             @Param("endAt") LocalDateTime endAt,
                             @Param("attendees") int attendees);
}
