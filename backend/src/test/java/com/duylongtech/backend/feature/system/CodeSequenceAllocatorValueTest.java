package com.duylongtech.backend.feature.system;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test report: CodeSequenceAllocator.nextValues (5 tham số) / previewNextValue (4 tham số), trả về long.
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
class CodeSequenceAllocatorValueTest {

    private static final String KEY = "brands.code.TH";

    private EntityManager entityManager;
    private CodeSequenceRepository repository;
    private Query nativeQuery;
    private CodeSequenceAllocator allocator;

    @BeforeEach
    void setUp() {
        entityManager = mock(EntityManager.class);
        repository = mock(CodeSequenceRepository.class);
        nativeQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        when(nativeQuery.getResultList()).thenReturn(List.of());
        allocator = new CodeSequenceAllocator(entityManager, repository);
    }

    private static CodeSequence sequence(long value) {
        CodeSequence seq = new CodeSequence();
        seq.initSequence(KEY, value);
        return seq;
    }

    @Nested
    @DisplayName("nextValues(String sequenceKey, String tableName, String columnName, String prefix, int quantity)")
    class NextValues {

        @Test
        @DisplayName("UTCID01 - bộ đếm đã có (5), quantity=1 -> 6")
        void utcid01ExistingSequenceIncrementsByOne() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.of(sequence(5)));

            assertEquals(6L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 1));
            verify(repository).save(any(CodeSequence.class));
            verify(entityManager, never()).createNativeQuery(anyString());
        }

        @Test
        @DisplayName("UTCID02 - bộ đếm đã có (5), quantity=10 -> 15")
        void utcid02ExistingSequenceIncrementsByRange() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.of(sequence(5)));

            assertEquals(15L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 10));
        }

        @Test
        @DisplayName("UTCID03 - chưa có bộ đếm, bảng có TH001/TH007/THABC/TH -> khởi tạo 7, trả về 8")
        void utcid03BootstrapFromExistingCodes() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.empty());
            when(nativeQuery.getResultList()).thenReturn(List.of("TH001", "TH007", "THABC", "TH"));

            assertEquals(8L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 1));
            verify(entityManager).createNativeQuery("SELECT code FROM brands WHERE code LIKE :prefixLike");
            verify(nativeQuery).setParameter("prefixLike", "TH%");
            verify(repository).saveAndFlush(any(CodeSequence.class));
        }

        @Test
        @DisplayName("UTCID04 - chưa có bộ đếm, bảng rỗng, quantity=3 -> 3")
        void utcid04BootstrapFromEmptyTable() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.empty());

            assertEquals(3L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 3));
        }

        @Test
        @DisplayName("UTCID05 - khởi tạo trùng (request khác đã tạo, giá trị 20) -> đọc lại, trả về 21")
        void utcid05ConcurrentBootstrapReReadsRow() {
            when(repository.findByIdForUpdate(KEY))
                    .thenReturn(Optional.empty())
                    .thenReturn(Optional.of(sequence(20)));
            when(repository.saveAndFlush(any(CodeSequence.class)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate entry 'brands.code.TH'"));

            assertEquals(21L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 1));
            verify(repository, times(2)).findByIdForUpdate(KEY);
        }

        @Test
        @DisplayName("UTCID06 - khởi tạo trùng nhưng đọc lại không thấy dòng -> ném lại DataIntegrityViolationException")
        void utcid06ConcurrentBootstrapWithoutRowRethrows() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.empty());
            when(repository.saveAndFlush(any(CodeSequence.class)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate entry 'brands.code.TH'"));

            DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                    () -> allocator.nextValues(KEY, "BRANDS", "code", "TH", 1));
            assertEquals("Duplicate entry 'brands.code.TH'", ex.getMessage());
        }

        @Test
        @DisplayName("UTCID07 - biên quantity=0 -> giữ nguyên 5")
        void utcid07ZeroQuantityKeepsValue() {
            when(repository.findByIdForUpdate(KEY)).thenReturn(Optional.of(sequence(5)));

            assertEquals(5L, allocator.nextValues(KEY, "BRANDS", "code", "TH", 0));
        }
    }

    @Nested
    @DisplayName("previewNextValue(String sequenceKey, String tableName, String columnName, String prefix)")
    class PreviewNextValue {

        private static final String PX_KEY = "inventory_documents.doc_code.PX";

        @Test
        @DisplayName("UTCID01 - bộ đếm đã có (41) -> 42, không ghi CSDL")
        void utcid01ExistingSequencePreviewDoesNotSave() {
            when(repository.findById(PX_KEY)).thenReturn(Optional.of(sequence(41)));

            assertEquals(42L, allocator.previewNextValue(PX_KEY, "INVENTORY_DOCUMENTS", "DOC_CODE", "PX"));
            verify(repository, never()).save(any());
            verify(repository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("UTCID02 - chưa có bộ đếm, bảng có PX00009/PX00010 -> 11")
        void utcid02PreviewFromExistingCodes() {
            when(repository.findById(PX_KEY)).thenReturn(Optional.empty());
            when(nativeQuery.getResultList()).thenReturn(List.of("PX00009", "PX00010"));

            assertEquals(11L, allocator.previewNextValue(PX_KEY, "INVENTORY_DOCUMENTS", "DOC_CODE", "PX"));
            verify(entityManager).createNativeQuery("SELECT doc_code FROM inventory_documents WHERE doc_code LIKE :prefixLike");
        }

        @Test
        @DisplayName("UTCID03 - chưa có bộ đếm, bảng rỗng -> 1")
        void utcid03PreviewFromEmptyTable() {
            when(repository.findById(PX_KEY)).thenReturn(Optional.empty());

            assertEquals(1L, allocator.previewNextValue(PX_KEY, "INVENTORY_DOCUMENTS", "DOC_CODE", "PX"));
        }

        @Test
        @DisplayName("UTCID04 - chỉ có mã null / 'PX' / 'PX-A1' (không có hậu tố số) -> 1")
        void utcid04InvalidSuffixesAreIgnored() {
            when(repository.findById(PX_KEY)).thenReturn(Optional.empty());
            when(nativeQuery.getResultList()).thenReturn(Arrays.asList(null, "PX", "PX-A1"));

            assertEquals(1L, allocator.previewNextValue(PX_KEY, "INVENTORY_DOCUMENTS", "DOC_CODE", "PX"));
        }
    }
}
