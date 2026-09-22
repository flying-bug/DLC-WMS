package com.duylongtech.backend.enums;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit test report: ReferenceType.resolveEffectiveSalesOrderId(Long explicitSalesOrderId, String referenceType, Long referenceId),
 * trả về Long. Kỹ thuật Condition Coverage cho 2 điều kiện: explicitSalesOrderId == null và isSalesOrder(referenceType).
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "ReferenceType",
        signature = "resolveEffectiveSalesOrderId(Long explicitSalesOrderId, String referenceType, Long referenceId)",
        technique = Technique.CONDITION,
        precondition = {"None"})
@DisplayName("resolveEffectiveSalesOrderId(Long explicitSalesOrderId, String referenceType, Long referenceId)")
class ReferenceTypeResolveSalesOrderIdTest {

    @Test
    @UnitTestCase(id = "UTCID01", type = "N",
            purpose = "Verify the reference id is used when no explicit sales order id is given and the reference is SALES_ORDER.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=\"SALES_ORDER\"",
                    "referenceId=15"
            },
            returns = "15")
    @DisplayName("UTCID01 - null, 'SALES_ORDER', 15 -> 15")
    void utcid01ReferenceUsedWhenExplicitMissing() {
        assertEquals(15L, ReferenceType.resolveEffectiveSalesOrderId(null, "SALES_ORDER", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "N",
            purpose = "Verify the short alias ' so ' is trimmed and matched case-insensitively as a sales order reference.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=\" so \"",
                    "referenceId=15"
            },
            returns = "15")
    @DisplayName("UTCID02 - null, ' so ' (viết tắt, có khoảng trắng), 15 -> 15")
    void utcid02ShortAliasIsTrimmedAndCaseInsensitive() {
        assertEquals(15L, ReferenceType.resolveEffectiveSalesOrderId(null, " so ", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N",
            purpose = "Verify a PURCHASE_ORDER reference is not treated as a sales order.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=\"PURCHASE_ORDER\"",
                    "referenceId=15"
            },
            returns = "null")
    @DisplayName("UTCID03 - null, 'PURCHASE_ORDER', 15 -> null")
    void utcid03OtherReferenceTypeIgnored() {
        assertNull(ReferenceType.resolveEffectiveSalesOrderId(null, "PURCHASE_ORDER", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N",
            purpose = "Verify an explicit sales order id wins over a SALES_ORDER reference id.",
            inputs = {
                    "explicitSalesOrderId=7",
                    "referenceType=\"SALES_ORDER\"",
                    "referenceId=15"
            },
            returns = "7")
    @DisplayName("UTCID04 - 7, 'SALES_ORDER', 15 -> 7 (ưu tiên id tường minh)")
    void utcid04ExplicitIdWins() {
        assertEquals(7L, ReferenceType.resolveEffectiveSalesOrderId(7L, "SALES_ORDER", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "A",
            purpose = "Verify a null reference type yields no sales order id.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=null",
                    "referenceId=15"
            },
            returns = "null")
    @DisplayName("UTCID05 - null, null, 15 -> null")
    void utcid05NullReferenceType() {
        assertNull(ReferenceType.resolveEffectiveSalesOrderId(null, null, 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "B",
            purpose = "Verify an empty reference type yields no sales order id.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=\"\"",
                    "referenceId=15"
            },
            returns = "null")
    @DisplayName("UTCID06 - null, '' (chuỗi rỗng), 15 -> null")
    void utcid06EmptyReferenceType() {
        assertNull(ReferenceType.resolveEffectiveSalesOrderId(null, "", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N",
            purpose = "Verify an explicit sales order id is kept when the reference is a purchase order.",
            inputs = {
                    "explicitSalesOrderId=7",
                    "referenceType=\"PO\"",
                    "referenceId=15"
            },
            returns = "7")
    @DisplayName("UTCID07 - 7, 'PO', 15 -> 7")
    void utcid07ExplicitIdKeptForOtherType() {
        assertEquals(7L, ReferenceType.resolveEffectiveSalesOrderId(7L, "PO", 15L));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "B",
            purpose = "Verify a SALES_ORDER reference without reference id yields null.",
            inputs = {
                    "explicitSalesOrderId=null",
                    "referenceType=\"SALES_ORDER\"",
                    "referenceId=null"
            },
            returns = "null")
    @DisplayName("UTCID08 - null, 'SALES_ORDER', null -> null")
    void utcid08MissingReferenceIdYieldsNull() {
        assertNull(ReferenceType.resolveEffectiveSalesOrderId(null, "SALES_ORDER", null));
    }
}
