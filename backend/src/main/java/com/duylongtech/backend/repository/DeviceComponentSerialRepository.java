package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.DeviceComponentSerial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceComponentSerialRepository extends JpaRepository<DeviceComponentSerial, Long> {
    @Query("""
            SELECT s FROM DeviceComponentSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            LEFT JOIN FETCH s.removedByAssemblyOrder rao
            WHERE s.sourceAssemblyOrder.id = :sourceAssemblyOrderId
            ORDER BY s.targetSerial ASC, s.createdAt ASC
            """)
    List<DeviceComponentSerial> findBySourceAssemblyOrderId(@Param("sourceAssemblyOrderId") Long sourceAssemblyOrderId);

    @Modifying
    @Query("DELETE FROM DeviceComponentSerial s WHERE s.sourceAssemblyOrder.id = :sourceAssemblyOrderId")
    void deleteBySourceAssemblyOrderId(@Param("sourceAssemblyOrderId") Long sourceAssemblyOrderId);

    @Query("""
            SELECT s FROM DeviceComponentSerial s
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            WHERE s.targetVariant.id = :targetVariantId
              AND s.targetSerial IN :targetSerials
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            ORDER BY s.targetSerial ASC, s.createdAt ASC
            """)
    List<DeviceComponentSerial> findActiveByTargetVariantIdAndTargetSerialsIn(
            @Param("targetVariantId") Long targetVariantId,
            @Param("targetSerials") List<String> targetSerials);

    @Query("""
            SELECT s FROM DeviceComponentSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            LEFT JOIN FETCH s.sourceAssemblyOrder sao
            LEFT JOIN FETCH s.removedByAssemblyOrder rao
            WHERE s.targetVariant.id = :targetVariantId
              AND s.targetSerial = :targetSerial
            ORDER BY s.createdAt ASC
            """)
    List<DeviceComponentSerial> findByTargetVariantIdAndTargetSerial(
            @Param("targetVariantId") Long targetVariantId,
            @Param("targetSerial") String targetSerial);

    @Query("""
            SELECT s FROM DeviceComponentSerial s
            JOIN FETCH s.targetVariant tv
            LEFT JOIN FETCH tv.product tp
            JOIN FETCH s.componentVariant cv
            LEFT JOIN FETCH cv.product cp
            LEFT JOIN FETCH s.sourceAssemblyOrder sao
            LEFT JOIN FETCH s.removedByAssemblyOrder rao
            WHERE s.targetSerial = :targetSerial
            ORDER BY s.createdAt ASC
            """)
    List<DeviceComponentSerial> findByTargetSerial(@Param("targetSerial") String targetSerial);

    @Query("""
            SELECT DISTINCT s.componentSerial FROM DeviceComponentSerial s
            WHERE s.componentVariant.id = :componentVariantId
              AND s.componentSerial IN :componentSerials
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            """)
    List<String> findActiveComponentSerials(
            @Param("componentVariantId") Long componentVariantId,
            @Param("componentSerials") List<String> componentSerials);

    @Query("""
            SELECT COUNT(s) > 0 FROM DeviceComponentSerial s
            WHERE s.componentVariant.id = :componentVariantId
              AND LOWER(s.componentSerial) = LOWER(:componentSerial)
              AND (s.status IS NULL OR s.status = 'ACTIVE')
            """)
    boolean existsActiveComponentSerial(
            @Param("componentVariantId") Long componentVariantId,
            @Param("componentSerial") String componentSerial);
}
