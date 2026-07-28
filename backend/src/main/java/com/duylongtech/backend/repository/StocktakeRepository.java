package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Stocktake;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface StocktakeRepository extends JpaRepository<Stocktake, Long> {

    @Query("SELECT s FROM Stocktake s " +
           "WHERE (:stocktakeCode IS NULL OR LOWER(s.stocktakeCode) LIKE LOWER(CONCAT('%',:stocktakeCode,'%'))) " +
           "AND (:status IS NULL OR s.status = :status) " +
           "AND (:fromDate IS NULL OR s.stocktakeDate >= :fromDate) " +
           "AND (:toDate IS NULL OR s.stocktakeDate <= :toDate) " +
           "ORDER BY s.updatedAt DESC, s.id DESC")
    Page<Stocktake> searchStocktakes(@Param("stocktakeCode") String stocktakeCode,
                                     @Param("status") String status,
                                     @Param("fromDate") LocalDate fromDate,
                                     @Param("toDate") LocalDate toDate,
                                     Pageable pageable);

    @Query("SELECT DISTINCT s FROM Stocktake s LEFT JOIN FETCH s.lines l WHERE s.id = :id")
    Optional<Stocktake> findByIdWithDetails(@Param("id") Long id);

    boolean existsByStocktakeCode(String stocktakeCode);

    Optional<Stocktake> findTopByStocktakeCodeStartingWithOrderByStocktakeCodeDesc(String prefix);
}
