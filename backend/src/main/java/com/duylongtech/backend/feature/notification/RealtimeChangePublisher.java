package com.duylongtech.backend.feature.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Gộp các thay đổi dữ liệu theo topic rồi phát 1 tin "data-changed" cho mỗi topic sau một khoảng trễ ngắn,
 * trên luồng riêng để request thread không bị chặn bởi việc ghi SSE.
 */
@Slf4j
@Component
public class RealtimeChangePublisher {

    static final int MAX_IDS = 50;
    static final long DEFAULT_FLUSH_DELAY_MS = 300;

    private final Consumer<DataChangedPayload> sender;
    private final long flushDelayMs;
    private final ScheduledExecutorService scheduler;
    private final Map<String, Pending> pending = new HashMap<>();
    private boolean flushScheduled;
    private volatile boolean ready;

    @Autowired
    public RealtimeChangePublisher(RealtimeSessionService sessionService) {
        this(sessionService::publishDataChanged, DEFAULT_FLUSH_DELAY_MS);
    }

    RealtimeChangePublisher(Consumer<DataChangedPayload> sender, long flushDelayMs) {
        this.sender = sender;
        this.flushDelayMs = flushDelayMs;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "realtime-change-publisher");
            thread.setDaemon(true);
            return thread;
        });
    }

    @EventListener(ApplicationReadyEvent.class)
    void onApplicationReady() {
        markReady();
    }

    void markReady() {
        ready = true;
    }

    /** Ghi nhận thay đổi của 1 bản ghi; id == null nghĩa là không rõ bản ghi nào. */
    public void record(String topic, Long id) {
        if (!ready || topic == null) {
            return;
        }
        synchronized (this) {
            pending.computeIfAbsent(topic, key -> new Pending()).add(id);
            if (!flushScheduled) {
                flushScheduled = true;
                scheduler.schedule(this::flush, flushDelayMs, TimeUnit.MILLISECONDS);
            }
        }
    }

    /** Dùng cho ghi hàng loạt không đi qua Hibernate: mọi trang của topic tải lại. */
    public void publish(String topic) {
        record(topic, null);
    }

    void flush() {
        List<DataChangedPayload> payloads = new ArrayList<>();
        synchronized (this) {
            pending.forEach((topic, entry) -> payloads.add(entry.toPayload(topic)));
            pending.clear();
            flushScheduled = false;
        }
        for (DataChangedPayload payload : payloads) {
            try {
                sender.accept(payload);
            } catch (Exception ex) {
                log.warn("Failed to publish data-changed for {}: {}", payload.topic(), ex.getMessage());
            }
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }

    private static final class Pending {
        private final Set<Long> ids = new HashSet<>();
        private boolean unknown;

        void add(Long id) {
            if (id == null || unknown) {
                unknown = unknown || id == null;
                return;
            }
            ids.add(id);
            if (ids.size() > MAX_IDS) {
                unknown = true;
                ids.clear();
            }
        }

        DataChangedPayload toPayload(String topic) {
            return new DataChangedPayload(topic, unknown ? null : new ArrayList<>(ids));
        }
    }
}
