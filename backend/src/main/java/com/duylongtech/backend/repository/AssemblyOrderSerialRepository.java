package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AssemblyOrderSerial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssemblyOrderSerialRepository extends JpaRepository<AssemblyOrderSerial, Long> {
    @org.springframework.data.jpa.repository.Query("""
            SELECT s FROM AssemblyOrderSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            WHERE s.assemblyOrder.id = :assemblyOrderId
            ORDER BY s.targetSerial ASC, s.createdAt ASC
            """)
    List<AssemblyOrderSerial> findByAssemblyOrderId(@org.springframework.data.repository.query.Param("assemblyOrderId") Long assemblyOrderId);

    void deleteByAssemblyOrderId(Long assemblyOrderId);

    @org.springframework.data.jpa.repository.Query("""
            SELECT s FROM AssemblyOrderSerial s
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            WHERE s.targetVariant.id = :targetVariantId
              AND s.targetSerial IN :targetSerials
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            """)
    List<AssemblyOrderSerial> findByTargetVariantIdAndTargetSerialsIn(@org.springframework.data.repository.query.Param("targetVariantId") Long targetVariantId, @org.springframework.data.repository.query.Param("targetSerials") List<String> targetSerials);

    @org.springframework.data.jpa.repository.Query("""
            SELECT s FROM AssemblyOrderSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            WHERE s.targetVariant.id = :targetVariantId
              AND s.targetSerial = :targetSerial
            ORDER BY s.createdAt ASC
            """)
    List<AssemblyOrderSerial> findByTargetVariantIdAndTargetSerial(
            @org.springframework.data.repository.query.Param("targetVariantId") Long targetVariantId,
            @org.springframework.data.repository.query.Param("targetSerial") String targetSerial);

    @org.springframework.data.jpa.repository.Query("""
            SELECT s FROM AssemblyOrderSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            WHERE s.targetSerial = :targetSerial
            ORDER BY s.createdAt ASC
            """)
    List<AssemblyOrderSerial> findByTargetSerial(@org.springframework.data.repository.query.Param("targetSerial") String targetSerial);

    @org.springframework.data.jpa.repository.Query("""
            SELECT DISTINCT s.componentSerial FROM AssemblyOrderSerial s
            WHERE s.componentVariant.id = :componentVariantId
              AND s.componentSerial IN :componentSerials
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            """)
    List<String> findActiveComponentSerials(
            @org.springframework.data.repository.query.Param("componentVariantId") Long componentVariantId,
            @org.springframework.data.repository.query.Param("componentSerials") List<String> componentSerials);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COUNT(s) > 0 FROM AssemblyOrderSerial s
            WHERE s.componentVariant.id = :componentVariantId
              AND LOWER(s.componentSerial) = LOWER(:componentSerial)
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            """)
    boolean existsActiveComponentSerial(
            @org.springframework.data.repository.query.Param("componentVariantId") Long componentVariantId,
            @org.springframework.data.repository.query.Param("componentSerial") String componentSerial);
}
