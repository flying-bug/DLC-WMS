package com.duylongtech.backend.feature.ocr.service;

import com.duylongtech.backend.feature.inventory.OcrImportResponse;
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ImportOcrService.isEmptyScan: ảnh quét bị coi là rỗng khi KHÔNG có dòng hàng VÀ KHÔNG có số hóa đơn
 * VÀ KHÔNG nhận ra nhà cung cấp. Condition Coverage: lần lượt cho từng điều kiện con nhận giá trị đúng/sai.
 */
@UnitTestMethod(module = "ImportOcrService",
        signature = "isEmptyScan(OcrImportResponse result)",
        technique = Technique.CONDITION)
class ImportOcrServiceIsEmptyScanTest {

    private static final OcrImportResponse.OcrItemLine ITEM = OcrImportResponse.OcrItemLine.builder().build();

    @Test
    @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a missing OCR result counts as an empty scan.",
            inputs = "result=null", returns = "true")
    void utcid01() {
        assertTrue(ImportOcrService.isEmptyScan(null));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B", purpose = "Verify a result with every field null is an empty scan.",
            inputs = "result={items=null, invoiceCode=null, rawSupplierName=null, matchedSupplierId=null}", returns = "true")
    void utcid02() {
        assertTrue(ImportOcrService.isEmptyScan(OcrImportResponse.builder().build()));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "B", purpose = "Verify an empty item list and a blank invoice code still count as an empty scan.",
            inputs = "result={items=[], invoiceCode=\"  \", rawSupplierName=\"\", matchedSupplierId=null}", returns = "true")
    void utcid03() {
        assertTrue(ImportOcrService.isEmptyScan(OcrImportResponse.builder()
                .items(List.of()).invoiceCode("  ").rawSupplierName("").build()));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify one recognised item line alone makes the scan not empty.",
            inputs = "result={items=[1 line], invoiceCode=null, rawSupplierName=null, matchedSupplierId=null}", returns = "false")
    void utcid04() {
        assertFalse(ImportOcrService.isEmptyScan(OcrImportResponse.builder().items(List.of(ITEM)).build()));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify a recognised invoice code alone makes the scan not empty.",
            inputs = "result={items=null, invoiceCode=\"HD0001\", rawSupplierName=null, matchedSupplierId=null}", returns = "false")
    void utcid05() {
        assertFalse(ImportOcrService.isEmptyScan(OcrImportResponse.builder().invoiceCode("HD0001").build()));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify a raw supplier name alone makes the scan not empty.",
            inputs = "result={items=null, invoiceCode=null, rawSupplierName=\"Cty Phong Vu\", matchedSupplierId=null}", returns = "false")
    void utcid06() {
        assertFalse(ImportOcrService.isEmptyScan(OcrImportResponse.builder().rawSupplierName("Cty Phong Vu").build()));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify a matched supplier id alone (no raw name) makes the scan not empty.",
            inputs = "result={items=null, invoiceCode=null, rawSupplierName=null, matchedSupplierId=5}", returns = "false")
    void utcid07() {
        assertFalse(ImportOcrService.isEmptyScan(OcrImportResponse.builder().matchedSupplierId(5L).build()));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify a fully recognised document is not empty.",
            inputs = "result={items=[1 line], invoiceCode=\"HD0001\", rawSupplierName=\"Cty Phong Vu\", matchedSupplierId=5}", returns = "false")
    void utcid08() {
        assertFalse(ImportOcrService.isEmptyScan(OcrImportResponse.builder().items(List.of(ITEM))
                .invoiceCode("HD0001").rawSupplierName("Cty Phong Vu").matchedSupplierId(5L).build()));
    }
}
