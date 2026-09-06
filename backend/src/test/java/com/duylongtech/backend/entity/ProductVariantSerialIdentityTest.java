package com.duylongtech.backend.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductVariantSerialIdentityTest {

    @Test
    void trackingMode_exposesSerialAndLotPolicies() {
        ProductVariant variant = ProductVariant.builder().trackingMode("SERIAL_LOT").build();

        assertTrue(variant.isSerialTracked());
        assertTrue(variant.isLotTracked());
    }

    @Test
    void serialIdentity_normalizesManufacturerSerialAndCreatesAssetTag() {
        SerialNumber serial = SerialNumber.builder().serialNumber("  sn-001  ").build();

        serial.normalizeIdentity();

        assertEquals("SN-001", serial.getNormalizedSerialNumber());
        assertNotNull(serial.getAssetTag());
        assertTrue(serial.getAssetTag().startsWith("DLC-"));
    }
}
