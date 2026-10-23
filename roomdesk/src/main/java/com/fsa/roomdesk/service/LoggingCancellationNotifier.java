package com.fsa.roomdesk.service;

import com.fsa.roomdesk.dto.BookingResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
class LoggingCancellationNotifier implements CancellationNotifier {

    private static final Logger log = LoggerFactory.getLogger(LoggingCancellationNotifier.class);

    @Override
    public void bookingCancelled(BookingResponse booking, String reason) {
        log.info("Booking {} of {} in room {} cancelled: {}",
                booking.id(), booking.ownerEmail(), booking.roomCode(), reason);
    }
}
