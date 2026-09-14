package com.duylongtech.backend.feature.product;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.duylongtech.backend.feature.product.SerialNumber;
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

    /**
     * Batch lookup cho nhiều cặp (variantId, serialNumber) cùng lúc - caller tự khớp
     * lại từng cặp bằng (variantId, normalizedSerialNumber), vốn là unique constraint
     * trên bảng này, nên không lo nhầm serial giữa các variant khác nhau.
     */
    @Query("SELECT s FROM SerialNumber s WHERE s.variantId IN :variantIds AND s.normalizedSerialNumber IN :normalizedSerialNumbers")
    List<SerialNumber> findByVariantIdInAndNormalizedSerialNumberIn(@Param("variantIds") java.util.Collection<Long> variantIds,
                                                                     @Param("normalizedSerialNumbers") java.util.Collection<String> normalizedSerialNumbers);
    List<SerialNumber> findByWarehouseIdAndVariantIdAndStatus(Long warehouseId, Long variantId, String status);
    boolean existsByVariantIdIn(List<Long> variantIds);
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM SerialNumber s WHERE s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    boolean existsBySerialNumber(@Param("serialNumber") String serialNumber);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM SerialNumber s WHERE s.variantId = :variantId AND s.normalizedSerialNumber = UPPER(TRIM(:serialNumber))")
    boolean existsByVariantIdAndSerialNumber(@Param("variantId") Long variantId,
                                              @Param("serialNumber") String serialNumber);
}
