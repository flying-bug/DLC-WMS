package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * EInvoiceService.convertMoneyToWords: đọc tổng tiền hóa đơn điện tử thành chữ tiếng Việt.
 * Branch Coverage qua các nhánh: null/0, âm, hàng trăm, hàng chục (mười / mươi / mốt / lăm / lẻ), đơn vị nghìn-triệu-tỷ.
 * Kết quả mong đợi theo cách đọc chuẩn trên hóa đơn; các case Fail là lỗi thật đã ghi mã DEF-EINV-01/02.
 */
@UnitTestMethod(module = "EInvoiceService",
        signature = "convertMoneyToWords(BigDecimal totalAmount)",
        technique = Technique.BRANCH)
class EInvoiceServiceConvertMoneyToWordsTest {

    private static String words(String amount) {
        return EInvoiceService.convertMoneyToWords(amount == null ? null : new BigDecimal(amount));
    }

    @Test
    @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a missing total amount is read as zero dong.",
            inputs = "totalAmount=null", returns = "\"Không đồng chẵn.\"")
    void utcid01() {
        assertEquals("Không đồng chẵn.", words(null));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B", purpose = "Verify the zero boundary is read as zero dong.",
            inputs = "totalAmount=0", returns = "\"Không đồng chẵn.\"")
    void utcid02() {
        assertEquals("Không đồng chẵn.", words("0"));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "B", purpose = "Verify the first negative value (-1) is reported as a negative amount.",
            inputs = "totalAmount=-1", returns = "\"Số tiền âm.\"")
    void utcid03() {
        assertEquals("Số tiền âm.", words("-1"));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "B", purpose = "Verify an amount between 0 and 1 dong (0.99) is read as zero dong instead of an empty text.",
            inputs = "totalAmount=0.99", returns = "\"Không đồng chẵn.\"", defectId = "DEF-EINV-02")
    void utcid04() {
        assertEquals("Không đồng chẵn.", words("0.99"));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "B", purpose = "Verify the smallest positive whole amount (1) is read correctly.",
            inputs = "totalAmount=1", returns = "\"Một đồng chẵn.\"")
    void utcid05() {
        assertEquals("Một đồng chẵn.", words("1"));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify 15 uses 'mười lăm' (ten plus the 'lăm' form of five).",
            inputs = "totalAmount=15", returns = "\"Mười lăm đồng chẵn.\"")
    void utcid06() {
        assertEquals("Mười lăm đồng chẵn.", words("15"));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify 21 reads the tens digit before 'mươi' and uses 'mốt' for one.",
            inputs = "totalAmount=21", returns = "\"Hai mươi mốt đồng chẵn.\"", defectId = "DEF-EINV-01")
    void utcid07() {
        assertEquals("Hai mươi mốt đồng chẵn.", words("21"));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify 105 inserts 'lẻ' when the tens digit is zero.",
            inputs = "totalAmount=105", returns = "\"Một trăm lẻ năm đồng chẵn.\"")
    void utcid08() {
        assertEquals("Một trăm lẻ năm đồng chẵn.", words("105"));
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "N", purpose = "Verify 110 reads 'một trăm mười' without a trailing unit digit.",
            inputs = "totalAmount=110", returns = "\"Một trăm mười đồng chẵn.\"")
    void utcid09() {
        assertEquals("Một trăm mười đồng chẵn.", words("110"));
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "B", purpose = "Verify the first four-digit amount (1000) adds the 'nghìn' unit and skips the empty lower group.",
            inputs = "totalAmount=1000", returns = "\"Một nghìn đồng chẵn.\"")
    void utcid10() {
        assertEquals("Một nghìn đồng chẵn.", words("1000"));
    }

    @Test
    @UnitTestCase(id = "UTCID11", type = "N", purpose = "Verify 1005 reads 'không trăm lẻ năm' for a lower group that has no hundreds digit.",
            inputs = "totalAmount=1005", returns = "\"Một nghìn không trăm lẻ năm đồng chẵn.\"", defectId = "DEF-EINV-01")
    void utcid11() {
        assertEquals("Một nghìn không trăm lẻ năm đồng chẵn.", words("1005"));
    }

    @Test
    @UnitTestCase(id = "UTCID12", type = "N", purpose = "Verify a typical invoice total 1,250,000 is read with 'triệu' and 'nghìn' groups.",
            inputs = "totalAmount=1250000", returns = "\"Một triệu hai trăm năm mươi nghìn đồng chẵn.\"", defectId = "DEF-EINV-01")
    void utcid12() {
        assertEquals("Một triệu hai trăm năm mươi nghìn đồng chẵn.", words("1250000"));
    }

    @Test
    @UnitTestCase(id = "UTCID13", type = "B", purpose = "Verify one billion adds the 'tỷ' unit.",
            inputs = "totalAmount=1000000000", returns = "\"Một tỷ đồng chẵn.\"")
    void utcid13() {
        assertEquals("Một tỷ đồng chẵn.", words("1000000000"));
    }

    @Test
    @UnitTestCase(id = "UTCID14", type = "N", purpose = "Verify the decimal part is dropped: 1500.75 is read as 1500.",
            inputs = "totalAmount=1500.75", returns = "\"Một nghìn năm trăm đồng chẵn.\"")
    void utcid14() {
        assertEquals("Một nghìn năm trăm đồng chẵn.", words("1500.75"));
    }
}
