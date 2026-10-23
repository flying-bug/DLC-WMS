package com.fsa.roomdesk.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class TimeConfig {

    /** Business clock: all booking times are local times in this zone (Asia/Ho_Chi_Minh). */
    @Bean
    Clock clock(@Value("${roomdesk.time-zone}") ZoneId zone) {
        return Clock.system(zone);
    }
}
