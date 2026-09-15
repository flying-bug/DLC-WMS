package com.duylongtech.backend.feature.warranty;

import com.duylongtech.backend.feature.warranty.Warranty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import com.duylongtech.backend.feature.partner.Partner;

public interface WarrantyRepository extends JpaRepository<Warranty, Long> {
    boolean existsByWarrantyCode(String warrantyCode);

    boolean existsByWarrantyCodeAndIdNot(String warrantyCode, Long id);

    @Query("SELECT COUNT(w) > 0 FROM Warranty w JOIN w.lines wl WHERE wl.serialNumberId = :serialNumberId")
    boolean existsBySerialNumberId(@Param("serialNumberId") Long serialNumberId);

    // Tách 2 bước để phân trang đúng: JOIN FETCH trên collection (w.lines) kết hợp
    // Pageable khiến Hibernate không phát được LIMIT/OFFSET ở SQL, phải load toàn bộ
    // kết quả vào bộ nhớ rồi tự cắt trang (cảnh báo HHH000104) - chỉ ổn khi ít dữ liệu,
    // càng nhiều bảo hành thì càng chậm/tốn RAM. Query 1 chỉ lấy id (không fetch join)
    // nên phân trang đúng ở DB; query 2 fetch chi tiết cho đúng các id của trang đó.
    @Query("SELECT w.id FROM Warranty w WHERE w.partnerId = :customerId ORDER BY w.id DESC")
    Page<Long> findWarrantyIdsByCustomerId(@Param("customerId") Long customerId, Pageable pageable);

    @Query("SELECT DISTINCT w FROM Warranty w " +
           "LEFT JOIN FETCH w.lines wl " +
           "LEFT JOIN FETCH wl.serialNumber sn " +
           "WHERE w.id IN :ids")
    List<Warranty> findByIdInWithLines(@Param("ids") List<Long> ids);

    @EntityGraph(attributePaths = {"partner", "lines", "lines.serialNumber", "lines.serialNumber.variant", "lines.productVariant", "lines.productVariant.product"})
    @Query("""
            SELECT DISTINCT w FROM Warranty w
            LEFT JOIN w.partner p
            LEFT JOIN w.lines wl
            LEFT JOIN wl.serialNumber sn
            LEFT JOIN sn.variant pv
            LEFT JOIN wl.productVariant wpv
            WHERE (:status IS NULL OR w.warrantyStatus = :status)
              AND (:fromDate IS NULL OR w.startDate >= :fromDate)
              AND (:toDate IS NULL OR w.endDate <= :toDate)
              AND (
                :keyword IS NULL
                OR LOWER(w.warrantyCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(p.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(sn.serialNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(pv.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(pv.variantName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(wpv.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(wpv.variantName) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY w.id DESC
            """)
    Page<Warranty> searchWarranties(@Param("keyword") String keyword,
                                    @Param("status") String status,
                                    @Param("fromDate") LocalDate fromDate,
                                    @Param("toDate") LocalDate toDate,
                                    Pageable pageable);

    @EntityGraph(attributePaths = {"partner", "lines", "lines.serialNumber", "lines.serialNumber.variant", "lines.productVariant", "lines.productVariant.product"})
    @Query("SELECT w FROM Warranty w WHERE w.id = :id")
    Optional<Warranty> findWithDetailsById(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Warranty w SET w.warrantyStatus = 'EXPIRED' WHERE w.endDate < CURRENT_DATE AND w.warrantyStatus = 'ACTIVE'")
    int expireOutdatedWarranties();
}
