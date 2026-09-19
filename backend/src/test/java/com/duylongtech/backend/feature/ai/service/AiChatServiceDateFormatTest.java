package com.duylongtech.backend.feature.ai.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiChatServiceDateFormatTest {

    @Test
    void datesShownByTheChatbotUseDayMonthYear() {
        assertEquals("05/09/2026", AiChatService.displayDate(LocalDate.of(2026, 9, 5)));
        assertEquals("31/12/2025", AiChatService.displayDate(LocalDate.of(2025, 12, 31)));
        assertEquals("-", AiChatService.displayDate(null));
    }
}
