package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Partner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
    @Query("SELECT p FROM Partner p WHERE p.isSupplier = true " +
           "AND (:status IS NULL OR :status = '' OR p.status = :status) " +
           "ORDER BY p.createdAt DESC")
    List<Partner> findAllSuppliers(@Param("status") String status);

    /**
     * Tìm kiếm nhà cung cấp theo tên hoặc mã (case-insensitive) và status (nếu có).
     */
    @Query("SELECT p FROM Partner p WHERE p.isSupplier = true " +
           "AND (:keyword IS NULL OR :keyword = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%')))" +
           "AND (:status IS NULL OR :status = '' OR p.status = :status) " +
           "ORDER BY p.createdAt DESC")
    List<Partner> searchSuppliers(@Param("keyword") String keyword, @Param("status") String status);

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

    // ==========================================
    // CUSTOMER METHODS
    // ==========================================

    Optional<Partner> findByPhoneAndIsCustomerTrue(String phone);

    boolean existsByPhoneAndIsCustomerTrue(String phone);

    boolean existsByPhoneAndIsCustomerTrueAndIdNot(String phone, Long id);

    @Query("SELECT p FROM Partner p WHERE p.isCustomer = true " +
           "AND (:keyword IS NULL OR p.phone LIKE CONCAT('%', :keyword, '%') " +
           "     OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:groupType IS NULL OR p.groupType = :groupType)")
    Page<Partner> searchCustomers(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("groupType") String groupType,
            Pageable pageable);

    @Query("SELECT p FROM Partner p WHERE p.isCustomer = true AND p.id IN :ids")
    List<Partner> findCustomersByIds(@Param("ids") List<Long> ids);

    @Query("SELECT p FROM Partner p WHERE p.isCustomer = true " +
           "AND (:keyword IS NULL OR p.phone LIKE CONCAT('%', :keyword, '%') " +
           "     OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:groupType IS NULL OR p.groupType = :groupType)")
    List<Partner> findAllCustomersForExport(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("groupType") String groupType);

    Optional<Partner> findByIdAndIsCustomerTrue(Long id);

    @Query("SELECT COUNT(p) FROM Partner p WHERE p.isCustomer = true")
    long countCustomersForAi();

    @Query("SELECT COUNT(p) FROM Partner p WHERE p.isSupplier = true")
    long countSuppliersForAi();

    @Query("""
           SELECT p FROM Partner p
           WHERE (:keyword IS NULL OR :keyword = ''
              OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(p.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(p.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
             AND (:customerOnly = false OR p.isCustomer = true)
             AND (:supplierOnly = false OR p.isSupplier = true)
           ORDER BY p.createdAt DESC
           """)
    Page<Partner> searchPartnersForAi(@Param("keyword") String keyword,
                                      @Param("customerOnly") boolean customerOnly,
                                      @Param("supplierOnly") boolean supplierOnly,
                                      Pageable pageable);

    /**
     * Kiểm tra khách hàng có thiết bị đang trong trạng thái sửa chữa không.
     * Dùng để chặn vô hiệu hóa (CUST03).
     * Trạng thái RECEIVED hoặc REPAIRING thuộc bảng REPAIRS.
     */
    @Query("SELECT COUNT(r) > 0 FROM Repair r WHERE r.partnerId = :partnerId " +
           "AND r.repairStatus IN ('RECEIVED', 'REPAIRING')")
    boolean hasActiveRepairByPartnerId(@Param("partnerId") Long partnerId);

    /**
     * Tính tổng tiền đã thu từ khách hàng (chỉ tính phiếu thu hoàn thành POSTED/APPROVED).
     */
    @Query(value = "SELECT COALESCE(SUM(amount), 0) " +
           "FROM payment_transactions " +
           "WHERE partner_id = :customerId AND type = 'RECEIPT' AND status IN ('POSTED', 'APPROVED')",
           nativeQuery = true)
    java.math.BigDecimal getTotalPaidByCustomerId(@Param("customerId") Long customerId);

    /**
     * Lấy lịch sử thu chi (UNION ALL giữa RECEIPTS và VOUCHERS).
     */
     @Query(value = "SELECT id AS receiptId, transaction_code AS code, amount, status, payment_method AS paymentMethod, " +
           "created_at AS createdAt, type, note " +
           "FROM payment_transactions WHERE partner_id = :customerId " +
           "ORDER BY created_at DESC",
           countQuery = "SELECT COUNT(*) FROM payment_transactions WHERE partner_id = :customerId",
           nativeQuery = true)
    Page<Object[]> findPaymentHistoryByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
}
