package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.DuplicateFormatFlagsException;
import java.util.IllegalFormatFlagsException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test report: CodeGeneratorService.generateCode(String tableName, String columnName, String prefix, int padding),
 * trả về String. Kỹ thuật BVA trên tham số padding.
 * <p>
 * Precondition cố định: bộ đếm của mọi sequence trả về số tiếp theo = 42; testcase chỉ đổi tham số.
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "CodeGeneratorService",
        signature = "generateCode(String tableName, String columnName, String prefix, int padding)",
        technique = Technique.BVA,
        precondition = {"The code sequence counter hands out 42 as the next number"})
@DisplayName("generateCode(String tableName, String columnName, String prefix, int padding)")
class CodeGeneratorServiceGenerateCodeTest {

    private CodeSequenceAllocator allocator;
    private CodeGeneratorService service;

    @BeforeEach
    void setUp() {
        allocator = mock(CodeSequenceAllocator.class);
        when(allocator.nextValue(anyString(), anyString(), anyString(), anyString())).thenReturn(42L);
        service = new CodeGeneratorService(allocator);
    }

    @Test
    @UnitTestCase(id = "UTCID01", type = "N",
            purpose = "Verify the brand code is zero-padded to 3 digits and the counter key is lower(table).lower(column).prefix.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=3"
            },
            returns = "\"TH042\" - counter key 'brands.code.TH'")
    @DisplayName("UTCID01 - BRANDS/code/TH, padding=3 -> TH042, key brands.code.TH")
    void utcid01DefaultPadding() {
        assertEquals("TH042", service.generateCode("BRANDS", "code", "TH", 3));
        verify(allocator).nextValue("brands.code.TH", "BRANDS", "code", "TH");
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B",
            purpose = "Verify padding equal to the number of digits (2) adds no leading zero.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=2"
            },
            returns = "\"TH42\"")
    @DisplayName("UTCID02 - padding=2 (bằng số chữ số của 42) -> TH42")
    void utcid02PaddingEqualsDigits() {
        assertEquals("TH42", service.generateCode("BRANDS", "code", "TH", 2));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "B",
            purpose = "Verify the smallest valid padding (1), below the number of digits, does not truncate the number.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=1"
            },
            returns = "\"TH42\"")
    @DisplayName("UTCID03 - padding=1 (nhỏ hơn số chữ số, biên dưới hợp lệ) -> TH42, không cắt số")
    void utcid03PaddingBelowDigitsDoesNotTruncate() {
        assertEquals("TH42", service.generateCode("BRANDS", "code", "TH", 1));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "B",
            purpose = "Verify a wide padding (5) fills the number with leading zeros.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=5"
            },
            returns = "\"TH00042\"")
    @DisplayName("UTCID04 - padding=5 -> TH00042")
    void utcid04WidePadding() {
        assertEquals("TH00042", service.generateCode("BRANDS", "code", "TH", 5));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "A",
            purpose = "Verify padding=0, just below the valid range, is rejected by the formatter.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=0"
            },
            exception = "java.util.DuplicateFormatFlagsException: Flags = '0'")
    @DisplayName("UTCID05 - padding=0 (dưới biên) -> DuplicateFormatFlagsException")
    void utcid05ZeroPaddingIsRejected() {
        assertThrows(DuplicateFormatFlagsException.class, () -> service.generateCode("BRANDS", "code", "TH", 0));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "A",
            purpose = "Verify a negative padding (-1) is rejected by the formatter.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"TH\"",
                    "padding=-1"
            },
            exception = "java.util.IllegalFormatFlagsException: Flags = '-0'")
    @DisplayName("UTCID06 - padding=-1 (âm) -> IllegalFormatFlagsException")
    void utcid06NegativePaddingIsRejected() {
        assertThrows(IllegalFormatFlagsException.class, () -> service.generateCode("BRANDS", "code", "TH", -1));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "B",
            purpose = "Verify an empty prefix yields only the padded number and a counter key ending with a dot.",
            inputs = {
                    "tableName=\"BRANDS\"",
                    "columnName=\"code\"",
                    "prefix=\"\"",
                    "padding=3"
            },
            returns = "\"042\" - counter key 'brands.code.'")
    @DisplayName("UTCID07 - prefix rỗng, padding=3 -> 042, key brands.code.")
    void utcid07EmptyPrefix() {
        assertEquals("042", service.generateCode("BRANDS", "code", "", 3));
        verify(allocator).nextValue("brands.code.", "BRANDS", "code", "");
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N",
            purpose = "Verify the stock transfer code format used by the system (CK- prefix, 5 digits).",
            inputs = {
                    "tableName=\"stock_transfers\"",
                    "columnName=\"transfer_code\"",
                    "prefix=\"CK-\"",
                    "padding=5"
            },
            returns = "\"CK-00042\" - counter key 'stock_transfers.transfer_code.CK-'")
    @DisplayName("UTCID08 - stock_transfers/transfer_code/CK-, padding=5 -> CK-00042")
    void utcid08TransferCodeFormat() {
        assertEquals("CK-00042", service.generateCode("stock_transfers", "transfer_code", "CK-", 5));
        verify(allocator).nextValue("stock_transfers.transfer_code.CK-", "stock_transfers", "transfer_code", "CK-");
    }
}
