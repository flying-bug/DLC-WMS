package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.security.UserDetailsImpl;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RealtimeSessionServiceTransactionTest {

    @Test
    void subscribeLoadsWarehouseAccessInsideReadOnlyTransaction() throws NoSuchMethodException {
        Method subscribe = RealtimeSessionService.class.getMethod("subscribe", UserDetailsImpl.class);

        Transactional transactional = subscribe.getAnnotation(Transactional.class);

        assertNotNull(transactional);
        assertTrue(transactional.readOnly());
    }
}
