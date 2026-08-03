package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Repair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface RepairRepository extends JpaRepository<Repair, Long> {

    boolean existsByRepairCode(String repairCode);

    boolean existsByRepairCodeAndIdNot(String repairCode, Long id);

    List<Repair> findByWarrantyId(Long warrantyId);

    /**
     * Tìm kiếm danh sách lệnh sửa chữa có phân trang và lọc theo keyword/status.
     */
    @EntityGraph(attributePaths = {"warranty"})
    @Query("""
            SELECT r FROM Repair r
            WHERE (:status IS NULL OR r.repairStatus = :status)
              AND (
                :keyword IS NULL
                OR LOWER(r.repairCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
              AND (CAST(:fromDate AS date) IS NULL OR r.receivedDate >= :fromDate)
              AND (CAST(:toDate AS date) IS NULL OR r.receivedDate <= :toDate)
            ORDER BY r.createdAt DESC
            """)
    Page<Repair> searchRepairs(@Param("keyword") String keyword,
                               @Param("status") String status,
                               @Param("fromDate") java.time.LocalDate fromDate,
                               @Param("toDate") java.time.LocalDate toDate,
                               Pageable pageable);

    /**
     * Lấy chi tiết lệnh kèm lines và fees (dùng khi cần đọc toàn bộ).
     */
    @EntityGraph(attributePaths = {"repairLines", "repairLines.componentVariant", "warranty"})
    @Query("SELECT r FROM Repair r WHERE r.id = :id")
    Optional<Repair> findWithDetailsById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"repairLines", "repairLines.componentVariant", "warranty"})
    @Query("SELECT r FROM Repair r WHERE r.publicToken = :token")
    Optional<Repair> findByPublicTokenWithDetails(@Param("token") String token);

    /**
     * Lock pessimistic khi cần thực hiện workflow chuyển trạng thái.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Repair r WHERE r.id = :id")
    Optional<Repair> findByIdForUpdate(@Param("id") Long id);



    /**
     * Lấy số thứ tự lớn nhất của mã dạng SC-XXXXX để sinh mã tiếp theo.
     */
    @Query("SELECT r.repairCode FROM Repair r WHERE r.repairCode LIKE 'SC-%' ORDER BY r.repairCode DESC")
    List<String> findLatestScCodes(Pageable pageable);
}
