package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.audit.AuditLogRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

/**
 * Unit test report: AuditLogService.buildChangeDetail(Object before, Object after, String note),
 * trả về String (JSON chi tiết thay đổi). Kỹ thuật Branch Coverage. Hàm thuần: kết quả chỉ phụ thuộc tham số.
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "AuditLogService",
        signature = "buildChangeDetail(Object before, Object after, String note)",
        technique = Technique.BRANCH,
        precondition = {"None"})
@DisplayName("buildChangeDetail(Object before, Object after, String note)")
class AuditLogServiceBuildChangeDetailTest {

    private final AuditLogService service = new AuditLogService(mock(AuditLogRepository.class), mock(UserRepository.class));

    /** Map giữ thứ tự field để JSON kết quả ổn định. */
    private static Map<String, Object> fields(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    @Test
    @UnitTestCase(id = "UTCID01", type = "N",
            purpose = "Verify one changed field is listed in changes when two fields are compared and no note is given.",
            inputs = {
                    "before={name=\"Kho A\", status=\"ACTIVE\"}",
                    "after={name=\"Kho B\", status=\"ACTIVE\"}",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\",\"status\":\"ACTIVE\"},\"after\":{\"name\":\"Kho B\",\"status\":\"ACTIVE\"},\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1}")
    @DisplayName("UTCID01 - đổi name Kho A -> Kho B, note=null -> 1 thay đổi, không có note")
    void utcid01OneChangedFieldWithoutNote() {
        assertEquals("{\"before\":{\"name\":\"Kho A\",\"status\":\"ACTIVE\"},\"after\":{\"name\":\"Kho B\",\"status\":\"ACTIVE\"},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1}",
                service.buildChangeDetail(fields("name", "Kho A", "status", "ACTIVE"),
                        fields("name", "Kho B", "status", "ACTIVE"), null));
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "N",
            purpose = "Verify a non-blank note is appended to the change detail.",
            inputs = {
                    "before={name=\"Kho A\"}",
                    "after={name=\"Kho B\"}",
                    "note=\"Đổi tên kho\""
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho B\"},\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1,\"note\":\"Đổi tên kho\"}")
    @DisplayName("UTCID02 - như UTCID01, note='Đổi tên kho' -> JSON có note")
    void utcid02NoteIsAppended() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho B\"},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1,"
                        + "\"note\":\"Đổi tên kho\"}",
                service.buildChangeDetail(fields("name", "Kho A"), fields("name", "Kho B"), "Đổi tên kho"));
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "B",
            purpose = "Verify a note made only of spaces is left out of the change detail.",
            inputs = {
                    "before={name=\"Kho A\"}",
                    "after={name=\"Kho B\"}",
                    "note=\"   \""
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho B\"},\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1}")
    @DisplayName("UTCID03 - note chỉ gồm khoảng trắng -> bỏ note")
    void utcid03BlankNoteIsIgnored() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho B\"},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"}],\"changeCount\":1}",
                service.buildChangeDetail(fields("name", "Kho A"), fields("name", "Kho B"), "   "));
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "B",
            purpose = "Verify identical before and after produce no change entry.",
            inputs = {
                    "before={name=\"Kho A\"}",
                    "after={name=\"Kho A\"}",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho A\"},\"changes\":[],\"changeCount\":0}")
    @DisplayName("UTCID04 - before và after giống hệt -> changes rỗng, changeCount=0")
    void utcid04NoDifference() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho A\"},\"changes\":[],\"changeCount\":0}",
                service.buildChangeDetail(fields("name", "Kho A"), fields("name", "Kho A"), null));
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "N",
            purpose = "Verify every changed field is listed when two fields change.",
            inputs = {
                    "before={name=\"Kho A\", status=\"ACTIVE\"}",
                    "after={name=\"Kho B\", status=\"INACTIVE\"}",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\",\"status\":\"ACTIVE\"},\"after\":{\"name\":\"Kho B\",\"status\":\"INACTIVE\"},\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"},{\"field\":\"status\",\"before\":\"ACTIVE\",\"after\":\"INACTIVE\"}],\"changeCount\":2}")
    @DisplayName("UTCID05 - đổi 2 field name và status -> changeCount=2")
    void utcid05TwoChangedFields() {
        assertEquals("{\"before\":{\"name\":\"Kho A\",\"status\":\"ACTIVE\"},\"after\":{\"name\":\"Kho B\",\"status\":\"INACTIVE\"},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":\"Kho B\"},"
                        + "{\"field\":\"status\",\"before\":\"ACTIVE\",\"after\":\"INACTIVE\"}],\"changeCount\":2}",
                service.buildChangeDetail(fields("name", "Kho A", "status", "ACTIVE"),
                        fields("name", "Kho B", "status", "INACTIVE"), null));
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "N",
            purpose = "Verify a create (before=null) records the new field with before=null.",
            inputs = {
                    "before=null",
                    "after={name=\"Kho A\"}",
                    "note=null"
            },
            returns = "{\"before\":{},\"after\":{\"name\":\"Kho A\"},\"changes\":[{\"field\":\"name\",\"before\":null,\"after\":\"Kho A\"}],\"changeCount\":1}")
    @DisplayName("UTCID06 - before=null (tạo mới) -> before rỗng, field mới có before=null")
    void utcid06CreateHasEmptyBefore() {
        assertEquals("{\"before\":{},\"after\":{\"name\":\"Kho A\"},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":null,\"after\":\"Kho A\"}],\"changeCount\":1}",
                service.buildChangeDetail(null, fields("name", "Kho A"), null));
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "N",
            purpose = "Verify a delete (after=null) records the removed field with after=null.",
            inputs = {
                    "before={name=\"Kho A\"}",
                    "after=null",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{},\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":null}],\"changeCount\":1}")
    @DisplayName("UTCID07 - after=null (xóa) -> after rỗng, field cũ có after=null")
    void utcid07DeleteHasEmptyAfter() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{},"
                        + "\"changes\":[{\"field\":\"name\",\"before\":\"Kho A\",\"after\":null}],\"changeCount\":1}",
                service.buildChangeDetail(fields("name", "Kho A"), null, null));
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "B",
            purpose = "Verify both sides null produce an empty change detail.",
            inputs = {
                    "before=null",
                    "after=null",
                    "note=null"
            },
            returns = "{\"before\":{},\"after\":{},\"changes\":[],\"changeCount\":0}")
    @DisplayName("UTCID08 - before=null, after=null -> JSON rỗng, changeCount=0")
    void utcid08BothNull() {
        assertEquals("{\"before\":{},\"after\":{},\"changes\":[],\"changeCount\":0}",
                service.buildChangeDetail(null, null, null));
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "N",
            purpose = "Verify a difference only in updatedAt is ignored.",
            inputs = {
                    "before={name=\"Kho A\", updatedAt=\"2026-09-01\"}",
                    "after={name=\"Kho A\", updatedAt=\"2026-09-22\"}",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho A\"},\"changes\":[],\"changeCount\":0}")
    @DisplayName("UTCID09 - chỉ khác updatedAt -> updatedAt bị bỏ qua, changeCount=0")
    void utcid09TimestampFieldsIgnored() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{\"name\":\"Kho A\"},\"changes\":[],\"changeCount\":0}",
                service.buildChangeDetail(fields("name", "Kho A", "updatedAt", "2026-09-01"),
                        fields("name", "Kho A", "updatedAt", "2026-09-22"), null));
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "N",
            purpose = "Verify a null field is dropped from the snapshot but its new value is still recorded as a change.",
            inputs = {
                    "before={phone=null, name=\"Kho A\"}",
                    "after={phone=\"0901234567\", name=\"Kho A\"}",
                    "note=null"
            },
            returns = "{\"before\":{\"name\":\"Kho A\"},\"after\":{\"phone\":\"0901234567\",\"name\":\"Kho A\"},\"changes\":[{\"field\":\"phone\",\"before\":null,\"after\":\"0901234567\"}],\"changeCount\":1}")
    @DisplayName("UTCID10 - phone null -> '0901234567' -> field null bị bỏ ở before, ghi nhận 1 thay đổi")
    void utcid10NullFieldDroppedButChangeRecorded() {
        assertEquals("{\"before\":{\"name\":\"Kho A\"},\"after\":{\"phone\":\"0901234567\",\"name\":\"Kho A\"},"
                        + "\"changes\":[{\"field\":\"phone\",\"before\":null,\"after\":\"0901234567\"}],\"changeCount\":1}",
                service.buildChangeDetail(fields("phone", null, "name", "Kho A"),
                        fields("phone", "0901234567", "name", "Kho A"), null));
    }
}
