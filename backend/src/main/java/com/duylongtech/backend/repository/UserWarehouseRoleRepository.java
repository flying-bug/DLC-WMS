package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.UserWarehouseRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserWarehouseRoleRepository extends JpaRepository<UserWarehouseRole, Long> {

    List<UserWarehouseRole> findByWarehouseId(Long warehouseId);

    List<UserWarehouseRole> findByWarehouseIdAndIsActiveTrue(Long warehouseId);

    List<UserWarehouseRole> findByUserId(Long userId);

    List<UserWarehouseRole> findByUserIdAndWarehouseId(Long userId, Long warehouseId);

    Optional<UserWarehouseRole> findByUserIdAndWarehouseIdAndRoleId(Long userId, Long warehouseId, Long roleId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT uwr.userId FROM UserWarehouseRole uwr WHERE uwr.warehouseId = :warehouseId AND (:isActive IS NULL OR uwr.isActive = :isActive) AND (:roleId IS NULL OR uwr.roleId = :roleId)")
    org.springframework.data.domain.Page<Long> findDistinctUserIdByWarehouseIdAndIsActiveAndRoleId(@org.springframework.data.repository.query.Param("warehouseId") Long warehouseId, @org.springframework.data.repository.query.Param("isActive") Boolean isActive, @org.springframework.data.repository.query.Param("roleId") Long roleId, org.springframework.data.domain.Pageable pageable);
}
