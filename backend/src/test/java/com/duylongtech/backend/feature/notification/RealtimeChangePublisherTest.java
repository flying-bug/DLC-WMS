package com.duylongtech.backend.feature.notification;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RealtimeChangePublisherTest {

    private final List<DataChangedPayload> sent = new ArrayList<>();

    private RealtimeChangePublisher publisher(boolean ready) {
        // delay rất dài: test tự gọi flush() để không phụ thuộc thời gian
        RealtimeChangePublisher publisher = new RealtimeChangePublisher(sent::add, 60_000);
        if (ready) {
            publisher.markReady();
        }
        return publisher;
    }

    @Test
    void coalescesChangesOfSameTopicIntoOneMessage() {
        RealtimeChangePublisher publisher = publisher(true);
        publisher.record("PURCHASE_ORDER", 1L);
        publisher.record("PURCHASE_ORDER", 2L);
        publisher.record("PURCHASE_ORDER", 1L);
        publisher.record("SALES_ORDER", 9L);

        publisher.flush();

        assertEquals(2, sent.size());
        DataChangedPayload po = sent.stream().filter(p -> p.topic().equals("PURCHASE_ORDER")).findFirst().orElseThrow();
        assertEquals(2, po.ids().size());
        assertTrue(po.ids().containsAll(List.of(1L, 2L)));
    }

    @Test
    void unknownIdMakesWholeTopicUnknown() {
        RealtimeChangePublisher publisher = publisher(true);
        publisher.record("PURCHASE_ORDER", 1L);
        publisher.publish("PURCHASE_ORDER");
        publisher.record("PURCHASE_ORDER", 2L);

        publisher.flush();

        assertEquals(1, sent.size());
        assertNull(sent.get(0).ids());
    }

    @Test
    void tooManyIdsFallBackToUnknown() {
        RealtimeChangePublisher publisher = publisher(true);
        for (long id = 1; id <= RealtimeChangePublisher.MAX_IDS + 1; id++) {
            publisher.record("PRODUCT", id);
        }

        publisher.flush();

        assertNull(sent.get(0).ids());
    }

    @Test
    void doesNotPublishBeforeApplicationIsReady() {
        RealtimeChangePublisher publisher = publisher(false);
        publisher.record("PURCHASE_ORDER", 1L);

        publisher.flush();

        assertTrue(sent.isEmpty());
    }

    @Test
    void flushClearsPendingChanges() {
        RealtimeChangePublisher publisher = publisher(true);
        publisher.record("BRAND", 3L);
        publisher.flush();
        publisher.flush();

        assertEquals(1, sent.size());
    }
}
