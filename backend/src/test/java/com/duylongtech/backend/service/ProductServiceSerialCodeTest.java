package com.duylongtech.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductServiceSerialCodeTest {

    @Test
    void generateRandomSerialCode_createsShortNumericCandidates() {
        String first = ProductService.generateRandomSerialCode();
        String second = ProductService.generateRandomSerialCode();

        assertTrue(first.matches("\\d{12}"));
        assertNotEquals(first, second);
    }
}
