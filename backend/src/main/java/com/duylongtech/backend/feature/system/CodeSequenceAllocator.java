package com.duylongtech.backend.feature.system;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Cấp số nguyên tử cho {@link CodeGeneratorService}, tách thành bean riêng vì
 * @Transactional(REQUIRES_NEW) chỉ có tác dụng khi được gọi từ bean khác qua
 * Spring proxy - gọi nội bộ (this.xxx()) trong cùng class sẽ bị bỏ qua.
 */
@Service
@RequiredArgsConstructor
class CodeSequenceAllocator {

    private final EntityManager entityManager;
    private final CodeSequenceRepository codeSequenceRepository;

    /**
     * Khóa (hoặc khởi tạo nếu chưa có) dòng bộ đếm ứng với sequenceKey, tăng lên 1
     * và trả về giá trị mới, trong một transaction riêng (REQUIRES_NEW) tách biệt
     * với transaction của caller - chỉ khóa đúng 1 dòng nhỏ trong CODE_SEQUENCES
     * trong thời gian rất ngắn, không đụng đến bảng nghiệp vụ thật.
     */
    public long nextValue(String sequenceKey, String tableName, String columnName, String prefix) {
        return nextValues(sequenceKey, tableName, columnName, prefix, 1);
    }

    /**
     * Tăng bộ đếm lên một khoảng (quantity) và trả về giá trị cuối cùng sau khi tăng.
     * Để lấy danh sách các số vừa cấp, caller sẽ tính từ: (returnedValue - quantity + 1) đến returnedValue.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long nextValues(String sequenceKey, String tableName, String columnName, String prefix, int quantity) {
        CodeSequence seq = codeSequenceRepository.findByIdForUpdate(sequenceKey).orElse(null);
        if (seq == null) {
            long bootstrapSeed = currentMaxSuffix(tableName, columnName, prefix);
            seq = new CodeSequence();
            seq.initSequence(sequenceKey, bootstrapSeed);
            try {
                codeSequenceRepository.saveAndFlush(seq);
            } catch (DataIntegrityViolationException concurrentBootstrap) {
                // Request khác đã khởi tạo bộ đếm này trước - đọc lại và khóa dòng đó.
                seq = codeSequenceRepository.findByIdForUpdate(sequenceKey)
                        .orElseThrow(() -> concurrentBootstrap);
            }
        }
        seq.incrementBy(quantity);
        codeSequenceRepository.save(seq);
        return seq.getNextValue();
    }

    /**
     * Lấy giá trị tiếp theo (preview) mà không tăng bộ đếm trong CSDL.
     */
    @Transactional(readOnly = true)
    public long previewNextValue(String sequenceKey, String tableName, String columnName, String prefix) {
        CodeSequence seq = codeSequenceRepository.findById(sequenceKey).orElse(null);
        if (seq == null) {
            return currentMaxSuffix(tableName, columnName, prefix) + 1;
        }
        return seq.getNextValue() + 1;
    }

    /**
     * Đồng bộ giá trị sequence trong CSDL với giá trị do người dùng tự nhập (nếu lớn hơn).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncSequence(String sequenceKey, String tableName, String columnName, String prefix, long providedValue) {
        CodeSequence seq = codeSequenceRepository.findByIdForUpdate(sequenceKey).orElse(null);
        if (seq == null) {
            long max = currentMaxSuffix(tableName, columnName, prefix);
            seq = new CodeSequence();
            seq.initSequence(sequenceKey, Math.max(max, providedValue));
            try {
                codeSequenceRepository.saveAndFlush(seq);
            } catch (DataIntegrityViolationException e) {
                seq = codeSequenceRepository.findByIdForUpdate(sequenceKey).orElseThrow(() -> e);
                if (seq.getNextValue() < providedValue) {
                    seq.initSequence(sequenceKey, providedValue);
                    codeSequenceRepository.save(seq);
                }
            }
        } else {
            if (seq.getNextValue() < providedValue) {
                seq.initSequence(sequenceKey, providedValue);
                codeSequenceRepository.save(seq);
            }
        }
    }

    /**
     * Quét toàn bộ mã hiện có khớp tiền tố để tìm số lớn nhất - chỉ chạy MỘT LẦN
     * cho mỗi (tableName, columnName, prefix) khi khởi tạo bộ đếm, không chạy lại
     * mỗi lần sinh mã.
     */
    private long currentMaxSuffix(String tableName, String columnName, String prefix) {
        String sql = String.format(
                "SELECT %s FROM %s WHERE %s LIKE :prefixLike",
                columnName.toLowerCase(), tableName.toLowerCase(), columnName.toLowerCase()
        );

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("prefixLike", prefix + "%");

        @SuppressWarnings("unchecked")
        List<String> codes = query.getResultList();

        long maxVal = 0;
        for (String code : codes) {
            if (code != null && code.length() > prefix.length()) {
                String suffix = code.substring(prefix.length());
                try {
                    long val = Long.parseLong(suffix);
                    if (val > maxVal) {
                        maxVal = val;
                    }
                } catch (NumberFormatException e) {
                    // Bỏ qua các mã có hậu tố không phải số
                }
            }
        }
        return maxVal;
    }
}
