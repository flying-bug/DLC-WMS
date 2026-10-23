package com.fsa.roomdesk.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Applies {@link com.fsa.roomdesk.domain.BookingRules#checkWindow} to a {@link TimeWindow}. */
@Documented
@Constraint(validatedBy = BookingWindowValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidBookingWindow {

    String message() default "invalid booking time window";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
