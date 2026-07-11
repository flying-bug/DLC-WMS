package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.AssignRolesRequest;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.UserWarehouseRole;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import com.duylongtech.backend.service.impl.WarehouseStaffServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarehouseStaffServiceTest {

    @Mock
    private UserWarehouseRoleRepository userWarehouseRoleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private InventoryDocumentRepository inventoryDocumentRepository;
    @Mock
    private StockTransferRepository stockTransferRepository;

    @InjectMocks
    private WarehouseStaffServiceImpl warehouseStaffService;

    @Test
    void assignRoles_success() {
        AssignRolesRequest req = new AssignRolesRequest();
        req.setUserId(1L);
        req.setRoleIds(List.of(10L));

        User user = new User();
        user.setId(1L);

        RoleEntity role = new RoleEntity();
        role.setId(10L);
        role.setCode("WH_KEEPER");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userWarehouseRoleRepository.findByUserIdAndWarehouseId(1L, 100L)).thenReturn(List.of());
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));

        warehouseStaffService.assignRoles(100L, req);

        verify(userWarehouseRoleRepository, times(1)).save(any(UserWarehouseRole.class));
    }

    @Test
    void assignRoles_failAdminRole() {
        AssignRolesRequest req = new AssignRolesRequest();
        req.setUserId(1L);
        req.setRoleIds(List.of(10L));

        User user = new User();
        user.setId(1L);

        RoleEntity role = new RoleEntity();
        role.setId(10L);
        role.setCode("SUPER_ADMIN");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userWarehouseRoleRepository.findByUserIdAndWarehouseId(1L, 100L)).thenReturn(List.of());
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));

        BusinessException ex = assertThrows(BusinessException.class, () -> warehouseStaffService.assignRoles(100L, req));
        assertEquals(SystemMessage.WH_STAFF_INVALID_ROLE, ex.getSystemMessage());
    }

    @Test
    void revokeAccess_success() {
        when(inventoryDocumentRepository.existsByCreatedByAndWarehouseIdAndStatusIn(anyLong(), anyLong(), anyList())).thenReturn(false);
        when(stockTransferRepository.existsByCreatedByAndFromWarehouseIdAndStatusIn(anyLong(), anyLong(), anyList())).thenReturn(false);

        UserWarehouseRole uwr = new UserWarehouseRole();
        uwr.setIsActive(true);
        when(userWarehouseRoleRepository.findByUserIdAndWarehouseId(1L, 100L)).thenReturn(List.of(uwr));

        warehouseStaffService.revokeAccess(100L, 1L);

        assertFalse(uwr.getIsActive());
        verify(userWarehouseRoleRepository, times(1)).save(uwr);
    }

    @Test
    void revokeAccess_failPendingDocs() {
        when(inventoryDocumentRepository.existsByCreatedByAndWarehouseIdAndStatusIn(anyLong(), anyLong(), anyList())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> warehouseStaffService.revokeAccess(100L, 1L));
        assertEquals(SystemMessage.WH_STAFF_HAS_PENDING_DOCS, ex.getSystemMessage());
        
        verify(stockTransferRepository, never()).existsByCreatedByAndFromWarehouseIdAndStatusIn(anyLong(), anyLong(), anyList());
        verify(userWarehouseRoleRepository, never()).save(any());
    }
}
