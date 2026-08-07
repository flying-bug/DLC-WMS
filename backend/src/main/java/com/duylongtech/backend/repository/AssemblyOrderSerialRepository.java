package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AssemblyOrderSerial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssemblyOrderSerialRepository extends JpaRepository<AssemblyOrderSerial, Long> {
    List<AssemblyOrderSerial> findByAssemblyOrderId(Long assemblyOrderId);
    void deleteByAssemblyOrderId(Long assemblyOrderId);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM AssemblyOrderSerial s JOIN FETCH s.componentVariant WHERE s.targetVariant.id = :targetVariantId AND s.targetSerial IN :targetSerials")
    List<AssemblyOrderSerial> findByTargetVariantIdAndTargetSerialsIn(@org.springframework.data.repository.query.Param("targetVariantId") Long targetVariantId, @org.springframework.data.repository.query.Param("targetSerials") List<String> targetSerials);
}
