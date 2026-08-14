package com.duylongtech.backend.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.core.AppenderBase;
import com.duylongtech.backend.dto.SystemLogDto;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SystemLogService {

    private static final int MAX_LOGS = 500;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final Deque<SystemLogDto> logBuffer = new ConcurrentLinkedDeque<>();
    private AppenderBase<ILoggingEvent> appender;

    @PostConstruct
    public void init() {
        try {
            LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
            Logger rootLogger = context.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);

            appender = new AppenderBase<>() {
                @Override
                protected void append(ILoggingEvent event) {
                    try {
                        String time = LocalDateTime.ofInstant(
                                Instant.ofEpochMilli(event.getTimeStamp()),
                                ZoneId.systemDefault()
                        ).format(TIME_FMT);

                        String level = event.getLevel() != null ? event.getLevel().toString() : "INFO";

                        String fullLoggerName = event.getLoggerName();
                        String logger = fullLoggerName;
                        if (fullLoggerName != null && fullLoggerName.contains(".")) {
                            logger = fullLoggerName.substring(fullLoggerName.lastIndexOf('.') + 1);
                        }

                        StringBuilder messageBuilder = new StringBuilder(event.getFormattedMessage() != null ? event.getFormattedMessage() : "");
                        
                        IThrowableProxy throwableProxy = event.getThrowableProxy();
                        if (throwableProxy != null) {
                            messageBuilder.append(" -> ").append(throwableProxy.getClassName()).append(": ").append(throwableProxy.getMessage());
                            StackTraceElementProxy[] trace = throwableProxy.getStackTraceElementProxyArray();
                            if (trace != null && trace.length > 0) {
                                messageBuilder.append(" at ").append(trace[0].getStackTraceElement().toString());
                            }
                        }

                        SystemLogDto logDto = SystemLogDto.builder()
                                .time(time)
                                .level(level)
                                .logger(logger)
                                .msg(messageBuilder.toString())
                                .build();

                        logBuffer.addLast(logDto);

                        while (logBuffer.size() > MAX_LOGS) {
                            logBuffer.pollFirst();
                        }
                    } catch (Exception ignored) {}
                }
            };

            appender.setContext(context);
            appender.setName("InMemorySystemLogAppender");
            appender.start();
            rootLogger.addAppender(appender);

            log.info("SystemLogService initialized with in-memory ring buffer (max {} entries)", MAX_LOGS);
        } catch (Exception e) {
            log.warn("Failed to attach in-memory log appender: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void cleanup() {
        if (appender != null) {
            try {
                LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
                Logger rootLogger = context.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
                rootLogger.detachAppender(appender);
                appender.stop();
            } catch (Exception ignored) {}
        }
    }

    public List<SystemLogDto> getLogs(String levelFilter, String searchTerm, int limit) {
        int max = limit > 0 ? Math.min(limit, MAX_LOGS) : 100;
        
        List<SystemLogDto> snapshot = new ArrayList<>(logBuffer);
        
        return snapshot.stream()
                .filter(l -> {
                    if (levelFilter != null && !levelFilter.isBlank() && !"ALL".equalsIgnoreCase(levelFilter)) {
                        if (!l.getLevel().equalsIgnoreCase(levelFilter)) {
                            return false;
                        }
                    }
                    if (searchTerm != null && !searchTerm.isBlank()) {
                        String term = searchTerm.toLowerCase();
                        boolean matchesMsg = l.getMsg() != null && l.getMsg().toLowerCase().contains(term);
                        boolean matchesLogger = l.getLogger() != null && l.getLogger().toLowerCase().contains(term);
                        if (!matchesMsg && !matchesLogger) {
                            return false;
                        }
                    }
                    return true;
                })
                .collect(Collectors.collectingAndThen(Collectors.toList(), list -> {
                    if (list.size() > max) {
                        return list.subList(list.size() - max, list.size());
                    }
                    return list;
                }));
    }

    public void clearLogs() {
        logBuffer.clear();
        log.info("System log buffer has been cleared by administrator");
    }
}
