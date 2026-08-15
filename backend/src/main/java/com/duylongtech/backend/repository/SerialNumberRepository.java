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
    List<SerialNumber> findBySerialNumber(String serialNumber);
    Optional<SerialNumber> findByVariantIdAndSerialNumber(Long variantId, String serialNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SerialNumber s WHERE s.id = :id")
    Optional<SerialNumber> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SerialNumber s WHERE s.variantId = :variantId AND s.serialNumber = :serialNumber")
    Optional<SerialNumber> findByVariantIdAndSerialNumberForUpdate(@Param("variantId") Long variantId, @Param("serialNumber") String serialNumber);

    List<SerialNumber> findBySerialNumberIn(List<String> serialNumbers);
    List<SerialNumber> findByWarehouseIdAndVariantIdAndStatus(Long warehouseId, Long variantId, String status);
    boolean existsByVariantIdIn(List<Long> variantIds);
    boolean existsBySerialNumber(String serialNumber);
}
