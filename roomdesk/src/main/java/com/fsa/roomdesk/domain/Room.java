package com.fsa.roomdesk.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "rooms")
public class Room {

    /** Code format: 2 upper-case letters, floor (1-2 digits) followed by F, 2 digits. Example: HN-5F-01. */
    public static final String CODE_PATTERN = "^[A-Z]{2}-[0-9]{1,2}F-[0-9]{2}$";
    public static final int MIN_CAPACITY = 1;
    public static final int MAX_CAPACITY = 50;
    public static final int MAX_NAME_LENGTH = 60;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false, length = 10)
    private String code;

    @Column(nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private boolean active;

    protected Room() {
    }

    public Room(String code, String name, int capacity) {
        this.code = code;
        this.name = name;
        this.capacity = capacity;
        this.active = true;
    }

    public void rename(String name) {
        this.name = name;
    }

    public void changeCapacity(int capacity) {
        this.capacity = capacity;
    }

    public void deactivate() {
        this.active = false;
    }

    public boolean canHost(int attendees) {
        return attendees >= 1 && attendees <= capacity;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public int getCapacity() {
        return capacity;
    }

    public boolean isActive() {
        return active;
    }
}
