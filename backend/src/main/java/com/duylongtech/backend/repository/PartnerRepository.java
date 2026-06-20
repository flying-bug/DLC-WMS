package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Partner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho Partner (Nhà cung cấp / Khách hàng).
 * Supplier: is_supplier = true
 * Customer: is_customer = true
 */
@Repository
public interface PartnerRepository extends JpaRepository<Partner, Long> {

    Optional<Partner> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    /**
     * Lấy danh sách tất cả nhà cung cấp (is_supplier = true).
     */
    @Query("SELECT p FROM Partner p WHERE p.isSupplier = true ORDER BY p.createdAt DESC")
    List<Partner> findAllSuppliers();

    /**
     * Tìm kiếm nhà cung cấp theo tên hoặc mã (case-insensitive).
     */
    @Query("SELECT p FROM Partner p WHERE p.isSupplier = true " +
           "AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%')))" +
           "ORDER BY p.createdAt DESC")
    List<Partner> searchSuppliers(@Param("keyword") String keyword);

    /**
     * Kiểm tra nhà cung cấp có liên kết giao dịch không (purchase orders).
     * Dùng để xác định có thể xóa hay chỉ được inactive (BR-11).
     */
    @Query("SELECT COUNT(p) > 0 FROM Partner p " +
           "WHERE p.id = :id AND p.isSupplier = true")
    boolean isSupplierById(@Param("id") Long id);

    /**
     * Kiểm tra partner có phải là nhà cung cấp không.
     */
    Optional<Partner> findByIdAndIsSupplierTrue(Long id);
}
