package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.audit.AuditLogRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

/**
 * AuditLogService.sanitizeDescription: làm sạch mô tả nhật ký trước khi hiển thị cho người dùng
 * (gộp khoảng trắng, ẩn lỗi SQL/DB thành câu thân thiện, ẩn khối SQL, cắt 240 ký tự).
 */
@UnitTestMethod(module = "AuditLogService",
        signature = "sanitizeDescription(String description)",
        technique = Technique.BRANCH)
class AuditLogServiceSanitizeDescriptionTest {

    private final AuditLogService service = new AuditLogService(mock(AuditLogRepository.class), mock(UserRepository.class));

    @Test
    @UnitTestCase(id = "UTCID01", type = "A", purpose = "Verify a null description becomes an empty text.",
            inputs = "description=null", returns = "\"\" (empty)")
    void utcid01() {
        assertEquals("", service.sanitizeDescription(null));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B", purpose = "Verify a description made only of spaces becomes an empty text.",
            inputs = "description=\"   \"", returns = "\"\" (empty)")
    void utcid02() {
        assertEquals("", service.sanitizeDescription("   "));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N", purpose = "Verify a normal business description is returned unchanged.",
            inputs = "description=\"Tạo phiếu nhập NK00001\"", returns = "\"Tạo phiếu nhập NK00001\"")
    void utcid03() {
        assertEquals("Tạo phiếu nhập NK00001", service.sanitizeDescription("Tạo phiếu nhập NK00001"));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "N", purpose = "Verify leading/trailing spaces are trimmed and inner spaces/new lines collapse to one space.",
            inputs = "description=\"  Tạo   phiếu \\n nhập  \"", returns = "\"Tạo phiếu nhập\"")
    void utcid04() {
        assertEquals("Tạo phiếu nhập", service.sanitizeDescription("  Tạo   phiếu \n nhập  "));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "N", purpose = "Verify a raw 'could not execute statement' error is hidden behind a generic message, keeping the 'thất bại' prefix.",
            inputs = "description=\"Tạo kho thất bại could not execute statement\"",
            returns = "\"Tạo kho thất bại: Lỗi hệ thống, vui lòng liên hệ quản trị viên.\"")
    void utcid05() {
        assertEquals("Tạo kho thất bại: Lỗi hệ thống, vui lòng liên hệ quản trị viên.",
                service.sanitizeDescription("Tạo kho thất bại could not execute statement"));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N", purpose = "Verify a duplicate-entry error is translated to a friendly duplicate-data message.",
            inputs = "description=\"Lưu thất bại Duplicate entry 'KHO01' for key 'uk_code'\"",
            returns = "\"Lưu thất bại: Dữ liệu đã tồn tại trên hệ thống.\"")
    void utcid06() {
        assertEquals("Lưu thất bại: Dữ liệu đã tồn tại trên hệ thống.",
                service.sanitizeDescription("Lưu thất bại Duplicate entry 'KHO01' for key 'uk_code'"));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N", purpose = "Verify a constraint violation without 'thất bại' is translated with no prefix.",
            inputs = "description=\"violates foreign key constraint fk_line_variant\"",
            returns = "\"Dữ liệu không hợp lệ hoặc vi phạm ràng buộc hệ thống.\"")
    void utcid07() {
        assertEquals("Dữ liệu không hợp lệ hoặc vi phạm ràng buộc hệ thống.",
                service.sanitizeDescription("violates foreign key constraint fk_line_variant"));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "N", purpose = "Verify a description mentioning password_hash is never shown and becomes the generic message.",
            inputs = "description=\"update users set password_hash='x'\"",
            returns = "\"Lỗi hệ thống, vui lòng liên hệ quản trị viên.\"")
    void utcid08() {
        assertEquals("Lỗi hệ thống, vui lòng liên hệ quản trị viên.",
                service.sanitizeDescription("update users set password_hash='x'"));
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "N", purpose = "Verify an embedded [update ...] SQL block is masked while the rest of the text is kept.",
            inputs = "description=\"Cập nhật [update brands set name='A'] xong\"",
            returns = "\"Cập nhật [chi tiết SQL đã được ẩn] xong\"")
    void utcid09() {
        assertEquals("Cập nhật [chi tiết SQL đã được ẩn] xong",
                service.sanitizeDescription("Cập nhật [update brands set name='A'] xong"));
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "B", purpose = "Verify a description of exactly 240 characters (the limit) is not cut.",
            inputs = "description=\"a\" repeated 240 times", returns = "the same 240-character text")
    void utcid10() {
        String text = "a".repeat(240);
        assertEquals(text, service.sanitizeDescription(text));
    }

    @Test
    @UnitTestCase(id = "UTCID11", type = "B", purpose = "Verify a description of 241 characters (limit + 1) is cut to 237 characters plus '...'.",
            inputs = "description=\"a\" repeated 241 times", returns = "\"a\" repeated 237 times + \"...\" (240 characters)")
    void utcid11() {
        assertEquals("a".repeat(237) + "...", service.sanitizeDescription("a".repeat(241)));
    }
}
