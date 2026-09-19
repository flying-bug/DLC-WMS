package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.RoleService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.notification.RealtimeSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.brand.Brand;
import com.duylongtech.backend.feature.einvoice.EInvoice;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warranty.Warranty;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RealtimeSessionService realtimeSessionService;
    @Transactional(readOnly = true)
    public List<RoleEntity> getAllRoles(String module) {
        List<RoleEntity> roles = roleRepository.findAll();
        if ("WAREHOUSE".equalsIgnoreCase(module)) {
            // Chỉ các vai trò thực sự cần gán theo từng kho (Thủ kho, Kỹ thuật viên).
            // Quản lý/Kế toán được bypass ràng buộc kho ở WarehouseAccessGuard nên không cần gán ở đây.
            roles = roles.stream()
                    .filter(r -> r.getCode() != null
                            && (r.getCode().toUpperCase().contains("WAREHOUSE_CONTROLLER")
                                    || r.getCode().toUpperCase().contains("TECHNICIAN")))
                    .collect(Collectors.toList());
        }
        return roles;
    }
    @Transactional(readOnly = true)
    public RoleEntity getRoleById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy vai trò với ID: " + id));
    }
    @Transactional
    public RoleEntity updateRolePermissions(Long id, List<String> permissionCodes) {
        RoleEntity role = roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy vai trò với ID: " + id));

        Set<PermissionEntity> targetPermissions = new HashSet<>();
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            for (String code : permissionCodes) {
                if (code != null && !code.isBlank()) {
                    String normalizedCode = code.trim();
                    PermissionEntity permission = permissionRepository.findByCode(normalizedCode)
                            .orElseThrow(() -> new BusinessException("Quyền không tồn tại: " + normalizedCode));
                    targetPermissions.add(permission);
                }
            }
        }

        role.updatePermissions(targetPermissions);
        RoleEntity saved = roleRepository.save(role);
        
        List<User> affectedUsers = userRepository.findByRoles_Id(id);
        for (User u : affectedUsers) {
            realtimeSessionService.forceLogoutUser(u.getId(), "ROLE_PERMISSIONS_CHANGED", "Quyền của vai trò " + role.getName() + " đã thay đổi. Vui lòng đăng nhập lại.");
        }
        
        log.info("Cập nhật phân quyền cho vai trò [{} - {}]: {} quyền", role.getCode(), role.getName(), targetPermissions.size());
        return saved;
    }
    @Transactional
    public RoleEntity resetRolePermissions(Long id) {
        RoleEntity role = roleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy vai trò với ID: " + id));

        Set<PermissionEntity> allPerms = new HashSet<>(permissionRepository.findAll());
        Set<PermissionEntity> defaultPerms = getDefaultPermissionsForRole(role.getCode(), allPerms);

        role.updatePermissions(defaultPerms);
        RoleEntity saved = roleRepository.save(role);
        
        List<User> affectedUsers = userRepository.findByRoles_Id(id);
        for (User u : affectedUsers) {
            realtimeSessionService.forceLogoutUser(u.getId(), "ROLE_PERMISSIONS_CHANGED", "Quyền của vai trò " + role.getName() + " đã được khôi phục mặc định. Vui lòng đăng nhập lại.");
        }
        
        log.info("Khôi phục quyền mặc định cho vai trò [{} - {}]: {} quyền", role.getCode(), role.getName(), defaultPerms.size());
        return saved;
    }

    public static Set<PermissionEntity> getDefaultPermissionsForRole(String roleCode, Set<PermissionEntity> allPerms) {
        Set<PermissionEntity> result = new HashSet<>();
        if (roleCode == null) return result;

        String normalizedRoleCode = normalizeRoleCode(roleCode);
        for (PermissionEntity perm : allPerms) {
            if (isDefaultPermission(normalizedRoleCode, perm.getModule(), perm.getCode())) {
                result.add(perm);
            }
        }
        return result;
    }

    public static String normalizeRoleCode(String roleCode) {
        if (roleCode == null) return null;
        String normalized = roleCode.toUpperCase();
        return normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized;
    }

    public static boolean isDefaultPermission(String normalizedRoleCode, String module, String code) {
        if (normalizedRoleCode == null) return false;
        return switch (normalizedRoleCode) {
            case "ROLE_SUPER_ADMIN" -> isDefaultPermissionForSuperAdmin(module);
            case "ROLE_MANAGER" -> isDefaultPermissionForManager(module);
            case "ROLE_WAREHOUSE_CONTROLLER" -> isDefaultPermissionForWarehouseController(module, code);
            case "ROLE_TECHNICIAN" -> isDefaultPermissionForTechnician(module, code);
            case "ROLE_ACCOUNTANT" -> isDefaultPermissionForAccountant(module, code);
            case "ROLE_CASHIER_CONTROLLER" -> isDefaultPermissionForCashierController(module, code);
            default -> false;
        };
    }

    public static boolean isDefaultPermissionForSuperAdmin(String module) {
        return Arrays.asList("account", "auth", "audit").contains(module);
    }

    public static boolean isDefaultPermissionForManager(String module) {
        return !Arrays.asList("account", "auth", "audit").contains(module);
    }

    public static boolean isDefaultPermissionForWarehouseController(String module, String code) {
        if (Arrays.asList("transfer", "stocktake").contains(module)) return true;
        if ("import".equals(module)) return Arrays.asList("import:view", "import:edit", "import:print", "import:post").contains(code);
        if ("export".equals(module)) return Arrays.asList("export:view", "export:add", "export:edit", "export:export", "export:print", "export:post").contains(code);
        if (Arrays.asList("product", "unit", "brand", "warehouse_master", "ai_chat").contains(module)) return code.endsWith(":view");
        if (Arrays.asList("report_balance", "report_ledger", "report_transfer", "report_summary").contains(module)) return true;
        if ("assembly_config".equals(module)) return "assembly_config:view".equals(code);
        if ("assembly".equals(module)) return Arrays.asList("assembly:view", "assembly:execute", "assembly:complete").contains(code);
        return false;
    }

    public static boolean isDefaultPermissionForTechnician(String module, String code) {
        if ("warranty".equals(module)) return "warranty:view".equals(code);
        if ("repair".equals(module)) return true;
        if ("assembly_config".equals(module)) return Arrays.asList("assembly_config:view", "assembly_config:add", "assembly_config:edit").contains(code);
        if ("assembly".equals(module)) return Arrays.asList("assembly:view", "assembly:add", "assembly:edit", "assembly:delete", "assembly:export", "assembly:print", "assembly:submit").contains(code);
        if ("customer".equals(module)) return Arrays.asList("customer:view", "customer:add").contains(code);
        if (Arrays.asList("product", "product_category", "unit", "export", "warehouse_master", "report_balance", "ai_chat").contains(module)) return code.endsWith(":view");
        return false;
    }

    public static boolean isDefaultPermissionForAccountant(String module, String code) {
        if (Arrays.asList("sales_order", "purchase_order", "einvoice", "customer", "supplier").contains(module)) return true;
        if ("import".equals(module)) return Arrays.asList("import:view", "import:add", "import:edit", "import:export", "import:print").contains(code);
        if ("export".equals(module)) return Arrays.asList("export:view", "export:add", "export:edit", "export:export", "export:print").contains(code);
        if (Arrays.asList("report_balance", "report_ledger", "report_transfer", "report_debt", "report_sales", "report_summary").contains(module)) return true;
        if ("warranty".equals(module)) return true;
        if (Arrays.asList("product", "product_category", "unit", "brand").contains(module)) {
            return Arrays.asList(module + ":view", module + ":add", module + ":edit").contains(code);
        }
        if ("assembly_config".equals(module)) return "assembly_config:view".equals(code);
        if ("assembly".equals(module)) return Arrays.asList("assembly:view", "assembly:approve").contains(code);
        if ("payment".equals(module)) return true;
        if (Arrays.asList("transfer", "stocktake", "warehouse_master", "ai_chat").contains(module)) return code.endsWith(":view");
        return false;
    }

    public static boolean isDefaultPermissionForCashierController(String module, String code) {
        if ("payment".equals(module)) return "payment:view".equals(code);
        if (Arrays.asList("customer", "ai_chat").contains(module)) return code.endsWith(":view");
        return "report_debt".equals(module);
    }
}
