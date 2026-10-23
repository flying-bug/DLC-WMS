package com.fsa.roomdesk.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.fsa.roomdesk.dto.BookingRequest;
import com.fsa.roomdesk.validation.BookingWindowValidator;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorFactory;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** The bean-validation constraint uses the injected clock, so "future" is decided at a fixed instant. */
class BookingWindowValidatorTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Clock CLOCK = Clock.fixed(
            ZonedDateTime.of(2026, 11, 2, 9, 0, 0, 0, ZONE).toInstant(), ZONE);

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        var defaultFactory = Validation.byDefaultProvider().configure().getDefaultConstraintValidatorFactory();
        ConstraintValidatorFactory factory = new ConstraintValidatorFactory() {
            @Override
            @SuppressWarnings("unchecked")
            public <T extends ConstraintValidator<?, ?>> T getInstance(Class<T> key) {
                if (key == BookingWindowValidator.class) {
                    return (T) new BookingWindowValidator(CLOCK);
                }
                return defaultFactory.getInstance(key);
            }

            @Override
            public void releaseInstance(ConstraintValidator<?, ?> instance) {
            }
        };
        validator = Validation.byDefaultProvider().configure().constraintValidatorFactory(factory)
                .buildValidatorFactory().getValidator();
    }

    private static BookingRequest request(String start, String end) {
        return new BookingRequest("HN-5F-01", "Sync", 2, LocalDateTime.parse(start), LocalDateTime.parse(end));
    }

    @Test
    void bookingStartingAtFixedNowIsRejected() {
        var violations = validator.validate(request("2026-11-02T09:00", "2026-11-02T10:00"));
        assertThat(violations).hasSize(1);
        var violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("startAt");
        assertThat(violation.getMessage()).isEqualTo("must be in the future");
    }

    @Test
    void bookingStartingAfterFixedNowIsAccepted() {
        assertThat(validator.validate(request("2026-11-02T09:15", "2026-11-02T10:00"))).isEmpty();
    }
}
