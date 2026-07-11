package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AssignRolesRequest;
import com.duylongtech.backend.dto.response.WarehouseStaffResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WarehouseStaffService {
    Page<WarehouseStaffResponse> getStaffList(Long warehouseId, Long roleId, Boolean isActive, String search, Pageable pageable);
    
    void assignRoles(Long warehouseId, AssignRolesRequest request);
    
    void revokeAccess(Long warehouseId, Long userId);
}
