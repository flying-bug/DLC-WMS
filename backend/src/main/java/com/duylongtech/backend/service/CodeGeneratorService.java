package com.duylongtech.backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CodeGeneratorService {

    private final EntityManager entityManager;

    /**
     * Tự động sinh mã tuần tự dựa trên tiền tố (prefix) và số lượng chữ số (padding).
     * VD: generateCode("BRANDS", "code", "TH", 3) -> "TH001" (nếu chưa có) -> "TH002"
     *
     * @param tableName  Tên bảng trong CSDL (vd: BRANDS)
     * @param columnName Tên cột lưu mã (vd: code)
     * @param prefix     Tiền tố của mã (vd: TH)
     * @param padding    Số lượng chữ số (vd: 3 -> 001)
     * @return Mã sinh tự động
     */
    @Transactional(readOnly = true)
    public String generateCode(String tableName, String columnName, String prefix, int padding) {
        String sql = String.format(
                "SELECT %s FROM %s WHERE %s LIKE :prefixLike",
                columnName.toLowerCase(), tableName.toLowerCase(), columnName.toLowerCase()
        );

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("prefixLike", prefix + "%");

        @SuppressWarnings("unchecked")
        java.util.List<String> codes = query.getResultList();
        
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

        String format = "%s%0" + padding + "d";
        return String.format(format, prefix, maxVal + 1);
    }
}
