package com.duylongtech.backend.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.duylongtech.backend.entity.SerialNumber;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface SerialNumberRepository extends JpaRepository<SerialNumber, Long> {
    @Query("SELECT s FROM SerialNumber s WHERE s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    List<SerialNumber> findBySerialNumber(@Param("serialNumber") String serialNumber);

    @Query("SELECT s FROM SerialNumber s WHERE s.variantId = :variantId AND s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    Optional<SerialNumber> findByVariantIdAndSerialNumber(@Param("variantId") Long variantId,
                                                           @Param("serialNumber") String serialNumber);

    Optional<SerialNumber> findByAssetTagIgnoreCase(String assetTag);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SerialNumber s WHERE s.id = :id")
    Optional<SerialNumber> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SerialNumber s WHERE s.variantId = :variantId AND s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    Optional<SerialNumber> findByVariantIdAndSerialNumberForUpdate(@Param("variantId") Long variantId, @Param("serialNumber") String serialNumber);

    @Query("SELECT s FROM SerialNumber s WHERE s.normalizedSerialNumber IN :serialNumbers")
    List<SerialNumber> findBySerialNumberIn(@Param("serialNumbers") List<String> serialNumbers);
    List<SerialNumber> findByWarehouseIdAndVariantIdAndStatus(Long warehouseId, Long variantId, String status);
    boolean existsByVariantIdIn(List<Long> variantIds);
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM SerialNumber s WHERE s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    boolean existsBySerialNumber(@Param("serialNumber") String serialNumber);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM SerialNumber s WHERE s.variantId = :variantId AND s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    boolean existsByVariantIdAndSerialNumber(@Param("variantId") Long variantId,
                                              @Param("serialNumber") String serialNumber);
}
