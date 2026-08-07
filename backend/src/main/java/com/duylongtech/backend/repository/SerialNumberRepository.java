package com.duylongtech.backend.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.duylongtech.backend.entity.SerialNumber;
import java.util.Optional;

@Repository
public interface SerialNumberRepository extends JpaRepository<SerialNumber, Long> {
    List<SerialNumber> findBySerialNumber(String serialNumber);
    Optional<SerialNumber> findByVariantIdAndSerialNumber(Long variantId, String serialNumber);
    List<SerialNumber> findBySerialNumberIn(List<String> serialNumbers);
    List<SerialNumber> findByWarehouseIdAndVariantIdAndStatus(Long warehouseId, Long variantId, String status);
    boolean existsByVariantIdIn(List<Long> variantIds);
    boolean existsBySerialNumber(String serialNumber);
}
