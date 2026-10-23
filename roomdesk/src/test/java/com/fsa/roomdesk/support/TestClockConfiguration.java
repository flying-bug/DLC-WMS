package com.fsa.roomdesk.support;

import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Replaces the business clock: "now" is 2026-11-01 08:00 in Asia/Ho_Chi_Minh unless a test
 * moves it.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestClockConfiguration {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 1, 8, 0);

    @Bean
    @Primary
    MutableClock testClock() {
        return new MutableClock(NOW, ZONE);
    }
}
