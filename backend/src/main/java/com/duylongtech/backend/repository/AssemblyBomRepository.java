package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AssemblyBom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssemblyBomRepository extends JpaRepository<AssemblyBom, Long> {
    boolean existsByBomCode(String bomCode);

    boolean existsByBomCodeAndIdNot(String bomCode, Long id);

    @Query("SELECT DISTINCT b FROM AssemblyBom b " +
            "JOIN FETCH b.product p " +
            "LEFT JOIN FETCH p.unit " +
            "LEFT JOIN FETCH b.lines l " +
            "LEFT JOIN FETCH l.componentVariant cv " +
            "LEFT JOIN FETCH cv.product cp " +
            "LEFT JOIN FETCH cp.unit " +
            "WHERE (:status IS NULL OR b.status = :status) " +
            "ORDER BY b.updatedAt DESC")
    List<AssemblyBom> findAllWithLines(@Param("status") String status);

    @Query("SELECT DISTINCT b FROM AssemblyBom b " +
            "JOIN FETCH b.product p " +
            "LEFT JOIN FETCH p.unit " +
            "LEFT JOIN FETCH b.lines l " +
            "LEFT JOIN FETCH l.componentVariant cv " +
            "LEFT JOIN FETCH cv.product cp " +
            "LEFT JOIN FETCH cp.unit " +
            "WHERE b.id = :id")
    Optional<AssemblyBom> findByIdWithLines(@Param("id") Long id);
}
