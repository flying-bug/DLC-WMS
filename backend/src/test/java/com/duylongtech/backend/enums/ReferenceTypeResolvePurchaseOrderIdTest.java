package com.duylongtech.backend.enums;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit test report: ReferenceType.resolveEffectivePurchaseOrderId(Long explicitPurchaseOrderId, String referenceType, Long referenceId),
 * trả về Long. Kỹ thuật Condition Coverage cho 2 điều kiện: explicitPurchaseOrderId == null và isPurchaseOrder(referenceType).
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "ReferenceType",
        signature = "resolveEffectivePurchaseOrderId(Long explicitPurchaseOrderId, String referenceType, Long referenceId)",
        technique = Technique.CONDITION,
        precondition = {"None"})
@DisplayName("resolveEffectivePurchaseOrderId(Long explicitPurchaseOrderId, String referenceType, Long referenceId)")
class ReferenceTypeResolvePurchaseOrderIdTest {

    @Test
    @UnitTestCase(id = "UTCID01", type = "N",
            purpose = "Verify the reference id is used when no explicit purchase order id is given and the reference is PURCHASE_ORDER.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=\"PURCHASE_ORDER\"",
                    "referenceId=20"
            },
            returns = "20")
    @DisplayName("UTCID01 - null, 'PURCHASE_ORDER', 20 -> 20")
    void utcid01ReferenceUsedWhenExplicitMissing() {
        assertEquals(20L, ReferenceType.resolveEffectivePurchaseOrderId(null, "PURCHASE_ORDER", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "N",
            purpose = "Verify the short alias ' po ' is trimmed and matched case-insensitively as a purchase order reference.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=\" po \"",
                    "referenceId=20"
            },
            returns = "20")
    @DisplayName("UTCID02 - null, ' po ' (viết tắt, có khoảng trắng), 20 -> 20")
    void utcid02ShortAliasIsTrimmedAndCaseInsensitive() {
        assertEquals(20L, ReferenceType.resolveEffectivePurchaseOrderId(null, " po ", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N",
            purpose = "Verify a SALES_ORDER reference is not treated as a purchase order.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=\"SALES_ORDER\"",
                    "referenceId=20"
            },
            returns = "null")
    @DisplayName("UTCID03 - null, 'SALES_ORDER', 20 -> null")
    void utcid03OtherReferenceTypeIgnored() {
        assertNull(ReferenceType.resolveEffectivePurchaseOrderId(null, "SALES_ORDER", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N",
            purpose = "Verify an explicit purchase order id wins over a PURCHASE_ORDER reference id.",
            inputs = {
                    "explicitPurchaseOrderId=9",
                    "referenceType=\"PURCHASE_ORDER\"",
                    "referenceId=20"
            },
            returns = "9")
    @DisplayName("UTCID04 - 9, 'PURCHASE_ORDER', 20 -> 9 (ưu tiên id tường minh)")
    void utcid04ExplicitIdWins() {
        assertEquals(9L, ReferenceType.resolveEffectivePurchaseOrderId(9L, "PURCHASE_ORDER", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "A",
            purpose = "Verify a null reference type yields no purchase order id.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=null",
                    "referenceId=20"
            },
            returns = "null")
    @DisplayName("UTCID05 - null, null, 20 -> null")
    void utcid05NullReferenceType() {
        assertNull(ReferenceType.resolveEffectivePurchaseOrderId(null, null, 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "B",
            purpose = "Verify an empty reference type yields no purchase order id.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=\"\"",
                    "referenceId=20"
            },
            returns = "null")
    @DisplayName("UTCID06 - null, '' (chuỗi rỗng), 20 -> null")
    void utcid06EmptyReferenceType() {
        assertNull(ReferenceType.resolveEffectivePurchaseOrderId(null, "", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N",
            purpose = "Verify an explicit purchase order id is kept when the reference is a sales order.",
            inputs = {
                    "explicitPurchaseOrderId=9",
                    "referenceType=\"SO\"",
                    "referenceId=20"
            },
            returns = "9")
    @DisplayName("UTCID07 - 9, 'SO', 20 -> 9")
    void utcid07ExplicitIdKeptForOtherType() {
        assertEquals(9L, ReferenceType.resolveEffectivePurchaseOrderId(9L, "SO", 20L));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "B",
            purpose = "Verify a PURCHASE_ORDER reference without reference id yields null.",
            inputs = {
                    "explicitPurchaseOrderId=null",
                    "referenceType=\"PURCHASE_ORDER\"",
                    "referenceId=null"
            },
            returns = "null")
    @DisplayName("UTCID08 - null, 'PURCHASE_ORDER', null -> null")
    void utcid08MissingReferenceIdYieldsNull() {
        assertNull(ReferenceType.resolveEffectivePurchaseOrderId(null, "PURCHASE_ORDER", null));
    }
}
