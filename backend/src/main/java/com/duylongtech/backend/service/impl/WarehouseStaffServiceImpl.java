package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.AssignRolesRequest;
import com.duylongtech.backend.dto.response.WarehouseStaffResponse;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.UserWarehouseRole;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import com.duylongtech.backend.service.WarehouseStaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WarehouseStaffServiceImpl implements WarehouseStaffService {

    private final UserWarehouseRoleRepository userWarehouseRoleRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final StockTransferRepository stockTransferRepository;

    @Override
    public Page<WarehouseStaffResponse> getStaffList(Long warehouseId, Long roleId, Boolean isActive, String search, Pageable pageable) {
        if (isActive == null) {
            isActive = true;
        }

        Page<Long> userIdsPage = userWarehouseRoleRepository.findDistinctUserIdByWarehouseIdAndIsActiveAndRoleId(
                warehouseId, isActive, roleId, pageable);

        if (userIdsPage.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> userIds = userIdsPage.getContent();
        List<User> users = userRepository.findAllById(userIds);
        
        // Cần lấy tất cả roles của các user này trong kho
        List<UserWarehouseRole> userRoles = userWarehouseRoleRepository.findByWarehouseId(warehouseId);
        List<RoleEntity> allRoles = roleRepository.findAll();
        Map<Long, RoleEntity> roleMap = allRoles.stream().collect(Collectors.toMap(RoleEntity::getId, r -> r));

        List<WarehouseStaffResponse> responses = users.stream().map(user -> {
            List<UserWarehouseRole> userRoleMappings = userRoles.stream()
                    .filter(ur -> ur.getUserId().equals(user.getId()) && ur.getIsActive().equals(true))
                    .toList();

            List<WarehouseStaffResponse.RoleDto> roleDtos = userRoleMappings.stream()
                    .map(ur -> {
                        RoleEntity role = roleMap.get(ur.getRoleId());
                        if (role != null) {
                            return WarehouseStaffResponse.RoleDto.builder()
                                    .id(role.getId())
                                    .code(role.getCode())
                                    .name(role.getName())
                                    .build();
                        }
                        return null;
                    })
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());

            // Check if any mapping is active
            boolean isUserActive = userRoles.stream()
                    .anyMatch(ur -> ur.getUserId().equals(user.getId()) && ur.getIsActive());

            return WarehouseStaffResponse.builder()
                    .userId(user.getId())
                    .fullName(user.getFullName())
                    .email(user.getEmail())
                    .roles(roleDtos)
                    .isActive(isUserActive)
                    .build();
        }).collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, userIdsPage.getTotalElements());
    }

    @Override
    @Transactional
    public void assignRoles(Long warehouseId, AssignRolesRequest request) {
        // Validate user
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        // Get current roles of this user in this warehouse
        List<UserWarehouseRole> currentRoles = userWarehouseRoleRepository.findByUserIdAndWarehouseId(request.getUserId(), warehouseId);

        List<Long> requestedRoleIds = request.getRoleIds() != null ? request.getRoleIds() : java.util.Collections.emptyList();

        // Filter out roles that are in the request
        for (Long roleId : requestedRoleIds) {
            RoleEntity role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new BusinessException(SystemMessage.ACCESS_DENIED));

            // Prevent assigning system roles
            if ("SUPER_ADMIN".equals(role.getCode()) || "HR_MANAGER".equals(role.getCode())) {
                throw new BusinessException(SystemMessage.WH_STAFF_INVALID_ROLE);
            }

            UserWarehouseRole existingMapping = currentRoles.stream()
                    .filter(ur -> ur.getRoleId().equals(roleId))
                    .findFirst()
                    .orElse(null);

            if (existingMapping != null) {
                if (!existingMapping.getIsActive()) {
                    existingMapping.setIsActive(true);
                    userWarehouseRoleRepository.save(existingMapping);
                }
            } else {
                UserWarehouseRole newMapping = UserWarehouseRole.builder()
                        .userId(request.getUserId())
                        .warehouseId(warehouseId)
                        .roleId(roleId)
                        .isActive(true)
                        .build();
                userWarehouseRoleRepository.save(newMapping);
            }
        }

        // Deactivate roles not in the request
        for (UserWarehouseRole currentRole : currentRoles) {
            if (!requestedRoleIds.contains(currentRole.getRoleId()) && currentRole.getIsActive()) {
                currentRole.setIsActive(false);
                userWarehouseRoleRepository.save(currentRole);
            }
        }
    }

    @Override
    @Transactional
    public void revokeAccess(Long warehouseId, Long userId) {
        // 1. Hard Block: Check if the user is the creator of any DRAFT/SUBMITTED docs
        // Check Inventory Documents
        boolean hasPendingInvDocs = inventoryDocumentRepository.existsByCreatedByAndWarehouseIdAndStatusIn(userId, warehouseId, List.of("DRAFT", "SUBMITTED"));
        if (hasPendingInvDocs) {
            throw new BusinessException(SystemMessage.WH_STAFF_HAS_PENDING_DOCS);
        }

        // Check Stock Transfers
        boolean hasPendingTransfers = stockTransferRepository.existsByCreatedByAndFromWarehouseIdAndStatusIn(userId, warehouseId, List.of("DRAFT", "SUBMITTED"));
        if (hasPendingTransfers) {
            throw new BusinessException(SystemMessage.WH_STAFF_HAS_PENDING_DOCS);
        }

        List<UserWarehouseRole> currentRoles = userWarehouseRoleRepository.findByUserIdAndWarehouseId(userId, warehouseId);
        if (currentRoles.isEmpty()) {
            throw new BusinessException(SystemMessage.WH_STAFF_NOT_FOUND);
        }

        boolean updated = false;
        for (UserWarehouseRole role : currentRoles) {
            if (role.getIsActive()) {
                role.setIsActive(false);
                userWarehouseRoleRepository.save(role);
                updated = true;
            }
        }

        if (!updated) {
            throw new BusinessException(SystemMessage.WH_STAFF_NOT_FOUND);
        }
    }
}
