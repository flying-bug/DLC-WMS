package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

/**
 * CodeGeneratorService.generatePrefixFromName: tạo tiền tố mã danh mục từ tên.
 * Phân vùng tương đương: rỗng, 1 từ, nhiều từ (≤3 / >3), có dấu tiếng Việt / chữ Đ, chỉ chữ số, trộn số.
 */
@UnitTestMethod(module = "CodeGeneratorService",
        signature = "generatePrefixFromName(String name)",
        technique = Technique.EP)
class CodeGeneratorServicePrefixFromNameTest {

    private final CodeGeneratorService service = new CodeGeneratorService(mock(CodeSequenceAllocator.class));

    @Test
    @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a null name falls back to the default prefix DM.",
            inputs = "name=null", returns = "\"DM\"")
    void utcid01() {
        assertEquals("DM", service.generatePrefixFromName(null));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B", purpose = "Verify a name made only of spaces falls back to the default prefix DM.",
            inputs = "name=\"   \"", returns = "\"DM\"")
    void utcid02() {
        assertEquals("DM", service.generatePrefixFromName("   "));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify a single accented word keeps its first two letters without diacritics.",
            inputs = "name=\"Chuột\"", returns = "\"CH\"")
    void utcid03() {
        assertEquals("CH", service.generatePrefixFromName("Chuột"));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify a two-word name uses the initial of each word.",
            inputs = "name=\"Bàn phím\"", returns = "\"BP\"")
    void utcid04() {
        assertEquals("BP", service.generatePrefixFromName("Bàn phím"));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify the Vietnamese letter Đ is converted to D.",
            inputs = "name=\"Đèn\"", returns = "\"DE\"")
    void utcid05() {
        assertEquals("DE", service.generatePrefixFromName("Đèn"));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify a three-word name keeps all three initials.",
            inputs = "name=\"Ổ cứng SSD\"", returns = "\"OCS\"")
    void utcid06() {
        assertEquals("OCS", service.generatePrefixFromName("Ổ cứng SSD"));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "B", purpose = "Verify a four-word name is cut to the maximum of three initials.",
            inputs = "name=\"Máy tính xách tay\"", returns = "\"MTX\"")
    void utcid07() {
        assertEquals("MTX", service.generatePrefixFromName("Máy tính xách tay"));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "B", purpose = "Verify a one-letter name returns that single letter.",
            inputs = "name=\"a\"", returns = "\"A\"")
    void utcid08() {
        assertEquals("A", service.generatePrefixFromName("a"));
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "A", purpose = "Verify a name with only digits falls back to DM because digits are removed.",
            inputs = "name=\"123\"", returns = "\"DM\"")
    void utcid09() {
        assertEquals("DM", service.generatePrefixFromName("123"));
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "N", purpose = "Verify digits inside the initials are removed and only letters remain.",
            inputs = "name=\"4G Router\"", returns = "\"R\"")
    void utcid10() {
        assertEquals("R", service.generatePrefixFromName("4G Router"));
    }

    @Test
    @UnitTestCase(id = "UTCID11", type = "N", purpose = "Verify a lower-case accented name with đ is upper-cased and de-accented.",
            inputs = "name=\"đồ điện tử\"", returns = "\"DDT\"")
    void utcid11() {
        assertEquals("DDT", service.generatePrefixFromName("đồ điện tử"));
    }
}
