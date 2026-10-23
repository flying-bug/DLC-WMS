package com.fsa.roomdesk.validation;

import com.fsa.roomdesk.domain.BookingRules;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.Clock;
import java.time.LocalDateTime;

public class BookingWindowValidator implements ConstraintValidator<ValidBookingWindow, TimeWindow> {

    private final Clock clock;

    public BookingWindowValidator(Clock clock) {
        this.clock = clock;
    }

    @Override
    public boolean isValid(TimeWindow window, ConstraintValidatorContext context) {
        if (window == null) {
            return true;
        }
        var violations = BookingRules.checkWindow(window.startAt(), window.endAt(), LocalDateTime.now(clock));
        if (violations.isEmpty()) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        for (var violation : violations) {
            context.buildConstraintViolationWithTemplate(violation.message())
                    .addPropertyNode(violation.field())
                    .addConstraintViolation();
        }
        return false;
    }
}
