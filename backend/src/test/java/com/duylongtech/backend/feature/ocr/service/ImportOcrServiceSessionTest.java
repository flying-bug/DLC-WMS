package com.duylongtech.backend.feature.ocr.service;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.inventory.OcrImportResponse;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.VendorProductMappingRepository;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class ImportOcrServiceSessionTest {

    private ImportOcrService service;

    @BeforeEach
    void setUp() {
        // AI bị khóa -> OCR nền kết thúc ngay ở trạng thái ERROR, không cần gọi Vision AI thật.
        SystemSettingsService settings = mock(SystemSettingsService.class);
        service = new ImportOcrService(
                mock(PartnerRepository.class),
                mock(ProductVariantRepository.class),
                mock(VendorProductMappingRepository.class),
                settings);
    }

    private static byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private static void waitUntilProcessed(ImportOcrService.OcrPage page) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while ("PROCESSING".equals(page.getStatus()) && System.currentTimeMillis() < deadline) {
            Thread.sleep(20);
        }
    }

    @Test
    void newSessionIsPendingUntilPhoneJoins() {
        String id = service.initSession();
        assertEquals("PENDING", service.getSessionState(id).getStatus());

        service.joinSession(id);
        assertEquals("CONNECTED", service.getSessionState(id).getStatus());

        service.joinSession(id); // mở lại liên kết trên điện thoại: không đổi gì, không lỗi
        assertEquals("CONNECTED", service.getSessionState(id).getStatus());
    }

    @Test
    void joiningUnknownSessionFails() {
        assertThrows(RuntimeException.class, () -> service.joinSession("khong-ton-tai"));
    }

    @Test
    void everyUploadBecomesItsOwnNumberedPageWithAPreview() throws Exception {
        String id = service.initSession();
        MockMultipartFile photo = new MockMultipartFile("file", "a.png", "image/png", png(2400, 1200));

        service.scanDocumentForSession(id, photo, null);
        service.scanDocumentForSession(id, photo, null);

        var session = service.getSessionState(id);
        assertEquals("CONNECTED", session.getStatus(), "gửi ảnh cũng đồng nghĩa điện thoại đã kết nối");
        assertEquals(2, session.getPages().size());
        assertEquals(1, session.getPages().get(0).getIndex());
        assertEquals(2, session.getPages().get(1).getIndex());
        for (var page : session.getPages()) {
            assertNotNull(page.getPreviewImage());
            assertTrue(page.getPreviewImage().startsWith("data:image/jpeg;base64,"));
            waitUntilProcessed(page);
            assertEquals("ERROR", page.getStatus());
            assertNotNull(page.getErrorMessage());
        }
    }

    @Test
    void previewSentByThePhoneIsPreferredOverServerThumbnail() throws Exception {
        String id = service.initSession();
        MockMultipartFile photo = new MockMultipartFile("file", "a.png", "image/png", png(400, 300));
        MockMultipartFile thumb = new MockMultipartFile("preview", "p.jpg", "image/jpeg", new byte[] {1, 2, 3});

        service.scanDocumentForSession(id, photo, thumb);

        var page = service.getSessionState(id).getPages().get(0);
        assertEquals("data:image/jpeg;base64,AQID", page.getPreviewImage());
        waitUntilProcessed(page);
    }

    @Test
    void pdfHasNoPreviewButIsStillAPage() throws Exception {
        String id = service.initSession();
        MockMultipartFile pdf = new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[] {'%', 'P', 'D', 'F'});

        service.scanDocumentForSession(id, pdf, null);

        var page = service.getSessionState(id).getPages().get(0);
        assertNull(page.getPreviewImage());
        waitUntilProcessed(page);
    }

    @Test
    void scanWithNothingRecognisedIsTreatedAsNotADocument() {
        assertTrue(ImportOcrService.isEmptyScan(null));
        assertTrue(ImportOcrService.isEmptyScan(OcrImportResponse.builder().items(java.util.List.of()).build()));
        assertTrue(!ImportOcrService.isEmptyScan(OcrImportResponse.builder().invoiceCode("HD-01").build()));
        assertTrue(!ImportOcrService.isEmptyScan(OcrImportResponse.builder().rawSupplierName("NCC A").build()));
        assertTrue(!ImportOcrService.isEmptyScan(OcrImportResponse.builder()
                .items(java.util.List.of(new OcrImportResponse.OcrItemLine())).build()));
    }

    @Test
    void rejectsEmptyOrNonImageUploads() {
        String id = service.initSession();

        assertThrows(BusinessException.class,
                () -> service.scanDocumentForSession(id, new MockMultipartFile("file", new byte[0]), null));
        assertThrows(BusinessException.class,
                () -> service.scanDocumentForSession(id,
                        new MockMultipartFile("file", "x.exe", "application/octet-stream", new byte[] {1}), null));
        assertEquals(0, service.getSessionState(id).getPages().size());
    }
}
