package com.duylongtech.backend.utils;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class MessageUtil {

    private final MessageSource messageSource;
    private static MessageSource staticMessageSource;

    public MessageUtil(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @PostConstruct
    public void init() {
        MessageUtil.staticMessageSource = this.messageSource;
    }

    public static String getMessage(String key, Object... args) {
        if (staticMessageSource == null) {
            return key; // Fallback during initialization
        }
        try {
            return staticMessageSource.getMessage(key, args, LocaleContextHolder.getLocale());
        } catch (Exception e) {
            return key;
        }
    }
}
