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
                "SELECT MAX(CAST(SUBSTRING(%s, %d) AS UNSIGNED)) FROM %s WHERE %s LIKE :prefixLike",
                columnName, prefix.length() + 1, tableName, columnName
        );

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("prefixLike", prefix + "%");

        Number maxNumber = (Number) query.getSingleResult();
        long nextVal = 1;
        if (maxNumber != null) {
            nextVal = maxNumber.longValue() + 1;
        }

        String format = "%s%0" + padding + "d";
        return String.format(format, prefix, nextVal);
    }
}
