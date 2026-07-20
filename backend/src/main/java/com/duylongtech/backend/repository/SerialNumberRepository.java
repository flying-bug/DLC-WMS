package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.SerialNumber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface SerialNumberRepository extends JpaRepository<SerialNumber, Long> {
    Optional<SerialNumber> findBySerialNumber(String serialNumber);
    List<SerialNumber> findBySerialNumberIn(List<String> serialNumbers);
    boolean existsByVariantIdIn(List<Long> variantIds);
}
