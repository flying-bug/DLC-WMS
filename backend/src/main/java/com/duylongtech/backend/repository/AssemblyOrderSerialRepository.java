package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AssemblyOrderSerial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssemblyOrderSerialRepository extends JpaRepository<AssemblyOrderSerial, Long> {
    List<AssemblyOrderSerial> findByAssemblyOrderId(Long assemblyOrderId);
    void deleteByAssemblyOrderId(Long assemblyOrderId);
}
