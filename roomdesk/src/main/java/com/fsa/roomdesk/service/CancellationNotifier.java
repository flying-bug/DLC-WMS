package com.fsa.roomdesk.service;

import com.fsa.roomdesk.dto.BookingResponse;

/** Told about every booking the system cancels on behalf of a room deactivation. */
public interface CancellationNotifier {

    void bookingCancelled(BookingResponse booking, String reason);
}
