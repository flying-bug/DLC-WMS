package com.duylongtech.backend.feature.system;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * nextValue() được CodeGeneratorService gọi qua Spring proxy, nên chính nó phải mang
 * REQUIRES_NEW: nếu chỉ đặt trên nextValues() thì lời gọi nội bộ this.nextValues() bỏ qua proxy
 * và dòng bộ đếm bị khóa suốt transaction của người gọi (hoặc lỗi khi người gọi không có transaction).
 */
class CodeSequenceAllocatorTransactionTest {

    @Test
    void entryPointsRunInTheirOwnTransaction() throws Exception {
        assertRequiresNew(CodeSequenceAllocator.class.getMethod(
                "nextValue", String.class, String.class, String.class, String.class));
        assertRequiresNew(CodeSequenceAllocator.class.getMethod(
                "nextValues", String.class, String.class, String.class, String.class, int.class));
        assertRequiresNew(CodeSequenceAllocator.class.getMethod(
                "syncSequence", String.class, String.class, String.class, String.class, long.class));
    }

    private static void assertRequiresNew(Method method) {
        Transactional tx = method.getAnnotation(Transactional.class);
        assertNotNull(tx, method.getName() + " thiếu @Transactional");
        assertEquals(Propagation.REQUIRES_NEW, tx.propagation(), method.getName());
    }
}
