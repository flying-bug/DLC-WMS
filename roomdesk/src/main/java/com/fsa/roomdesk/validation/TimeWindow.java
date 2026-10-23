package com.fsa.roomdesk.validation;

import java.time.LocalDateTime;

/** A request that carries a booking time window. */
public interface TimeWindow {

    LocalDateTime startAt();

    LocalDateTime endAt();
}
