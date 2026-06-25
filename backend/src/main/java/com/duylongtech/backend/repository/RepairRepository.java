package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Repair;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RepairRepository extends JpaRepository<Repair, Long> {
    List<Repair> findByWarrantyId(Long warrantyId);
}
