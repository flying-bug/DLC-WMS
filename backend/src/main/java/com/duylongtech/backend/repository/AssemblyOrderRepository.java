package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AssemblyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AssemblyOrderRepository extends JpaRepository<AssemblyOrder, Long> {
    boolean existsByOrderCode(String orderCode);

    @Query("SELECT o.orderCode FROM AssemblyOrder o WHERE o.orderCode LIKE CONCAT(:prefix, '%')")
    List<String> findOrderCodesByPrefix(@Param("prefix") String prefix);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM AssemblyOrder o WHERE o.targetVariant.id IN :variantIds")
    boolean existsByTargetVariantIdIn(@Param("variantIds") List<Long> variantIds);

    @Query("SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END FROM AssemblyOrderLine l WHERE l.componentVariant.id IN :variantIds")
    boolean existsByComponentVariantIdIn(@Param("variantIds") List<Long> variantIds);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM AssemblyOrder o WHERE o.orderCode = :orderCode AND o.id <> :id")
    boolean existsByOrderCodeAndIdNot(@Param("orderCode") String orderCode, @Param("id") Long id);

    @Query("SELECT DISTINCT o FROM AssemblyOrder o " +
            "LEFT JOIN FETCH o.bom b " +
            "LEFT JOIN FETCH o.targetVariant tv " +
            "LEFT JOIN FETCH tv.product tp " +
            "LEFT JOIN FETCH o.lines l " +
            "LEFT JOIN FETCH l.componentVariant cv " +
            "LEFT JOIN FETCH cv.product cp " +
            "WHERE (:keyword IS NULL OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(b.bomCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(b.bomName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(tv.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(tv.variantName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(tp.productCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(tp.productName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:orderType IS NULL OR o.orderType = :orderType) " +
            "AND (:status IS NULL OR o.status = :status) " +
            "AND (:warehouseId IS NULL OR o.warehouseId = :warehouseId) " +
            "AND (:fromDate IS NULL OR o.executionDate >= :fromDate) " +
            "AND (:toDate IS NULL OR o.executionDate <= :toDate) " +
            "ORDER BY o.executionDate DESC, o.id DESC")
    List<AssemblyOrder> search(@Param("keyword") String keyword,
                               @Param("orderType") String orderType,
                               @Param("status") String status,
                               @Param("warehouseId") Long warehouseId,
                               @Param("fromDate") LocalDate fromDate,
                               @Param("toDate") LocalDate toDate);

    @Query("SELECT DISTINCT o FROM AssemblyOrder o " +
            "LEFT JOIN FETCH o.bom b " +
            "LEFT JOIN FETCH b.product bp " +
            "LEFT JOIN FETCH bp.unit " +
            "LEFT JOIN FETCH o.targetVariant tv " +
            "LEFT JOIN FETCH tv.product tp " +
            "LEFT JOIN FETCH tp.unit " +
            "LEFT JOIN FETCH o.lines l " +
            "LEFT JOIN FETCH l.componentVariant cv " +
            "LEFT JOIN FETCH cv.product cp " +
            "LEFT JOIN FETCH cp.unit " +
            "WHERE o.id = :id")
    Optional<AssemblyOrder> findByIdWithLines(@Param("id") Long id);

    boolean existsByBomIdAndStatusIn(Long bomId, List<String> statuses);
}
