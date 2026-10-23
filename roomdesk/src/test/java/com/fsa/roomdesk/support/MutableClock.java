package com.fsa.roomdesk.support;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** A clock that stands still at a chosen instant, so tests never depend on the machine clock. */
public class MutableClock extends Clock {

    private final ZoneId zone;
    private volatile Instant instant;

    public MutableClock(LocalDateTime localNow, ZoneId zone) {
        this.zone = zone;
        this.instant = localNow.atZone(zone).toInstant();
    }

    public void setLocalNow(LocalDateTime localNow) {
        this.instant = localNow.atZone(zone).toInstant();
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return Clock.fixed(instant, zone);
    }

    @Override
    public Instant instant() {
        return instant;
    }
}
