package com.fsa.roomdesk.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
public class Booking {

    public static final int MAX_TITLE_LENGTH = 100;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false, updatable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, updatable = false)
    private AppUser owner;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(nullable = false)
    private int attendees;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    protected Booking() {
    }

    public Booking(Room room, AppUser owner, String title, int attendees, TimeSlot slot) {
        this.room = room;
        this.owner = owner;
        this.title = title;
        this.attendees = attendees;
        this.startAt = slot.startAt();
        this.endAt = slot.endAt();
        this.status = BookingStatus.CONFIRMED;
    }

    public boolean isConfirmed() {
        return status == BookingStatus.CONFIRMED;
    }

    public boolean hasStarted(LocalDateTime now) {
        return !startAt.isAfter(now);
    }

    /** Only a CONFIRMED booking that has not started yet can be cancelled. */
    public boolean isCancellable(LocalDateTime now) {
        return isConfirmed() && !hasStarted(now);
    }

    public void cancel() {
        this.status = BookingStatus.CANCELLED;
    }

    public boolean isOwnedBy(String email) {
        return owner.getEmail().equalsIgnoreCase(email);
    }

    public Long getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public AppUser getOwner() {
        return owner;
    }

    public String getTitle() {
        return title;
    }

    public int getAttendees() {
        return attendees;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public BookingStatus getStatus() {
        return status;
    }
}
