package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.UserWarehouseRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserWarehouseRoleRepository extends JpaRepository<UserWarehouseRole, Long> {

    List<UserWarehouseRole> findByWarehouseId(Long warehouseId);

    List<UserWarehouseRole> findByUserId(Long userId);
}
