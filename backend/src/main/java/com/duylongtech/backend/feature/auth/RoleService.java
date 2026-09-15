package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.RoleService;
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
    @Transactional(readOnly = true)
    public List<RoleEntity> getAllRoles(String module) {
        List<RoleEntity> roles = roleRepository.findAll();
        if ("WAREHOUSE".equalsIgnoreCase(module)) {
            roles = roles.stream()
                    .filter(r -> r.getCode() != null && !r.getCode().toUpperCase().contains("SUPER_ADMIN") && !r.getCode().toUpperCase().contains("HR_MANAGER"))
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
        log.info("Khôi phục quyền mặc định cho vai trò [{} - {}]: {} quyền", role.getCode(), role.getName(), defaultPerms.size());
        return saved;
    }

    public static Set<PermissionEntity> getDefaultPermissionsForRole(String roleCode, Set<PermissionEntity> allPerms) {
        Set<PermissionEntity> result = new HashSet<>();
        if (roleCode == null) return result;

        String codeNormalized = roleCode.toUpperCase();
        if (!codeNormalized.startsWith("ROLE_")) {
            codeNormalized = "ROLE_" + codeNormalized;
        }

        switch (codeNormalized) {
            case "ROLE_SUPER_ADMIN":
                for (PermissionEntity perm : allPerms) {
                    if (Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                        result.add(perm);
                    }
                }
                break;

            case "ROLE_MANAGER":
                for (PermissionEntity perm : allPerms) {
                    if (!Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                        result.add(perm);
                    }
                }
                break;

            case "ROLE_WAREHOUSE_CONTROLLER":
                for (PermissionEntity perm : allPerms) {
                    String mod = perm.getModule();
                    String code = perm.getCode();
                    if (Arrays.asList("transfer", "stocktake").contains(mod)) {
                        result.add(perm);
                    } else if ("import".equals(mod) && Arrays.asList("import:view", "import:edit", "import:print", "import:post").contains(code)) {
                        result.add(perm);
                    } else if ("export".equals(mod) && Arrays.asList("export:view", "export:add", "export:edit", "export:export", "export:print", "export:post").contains(code)) {
                        result.add(perm);
                    } else if (Arrays.asList("product", "unit", "brand", "warehouse_master", "ai_chat").contains(mod) && code.endsWith(":view")) {
                        result.add(perm);
                    } else if (Arrays.asList("report_balance", "report_ledger", "report_transfer", "report_summary").contains(mod)) {
                        result.add(perm);
                    } else if ("assembly_config".equals(mod) && "assembly_config:view".equals(code)) {
                        result.add(perm);
                    } else if ("assembly".equals(mod) && Arrays.asList("assembly:view", "assembly:execute", "assembly:complete").contains(code)) {
                        result.add(perm);
                    }
                }
                break;

            case "ROLE_TECHNICIAN":
                for (PermissionEntity perm : allPerms) {
                    String mod = perm.getModule();
                    String code = perm.getCode();
                    if ("warranty".equals(mod) && "warranty:view".equals(code)) {
                        result.add(perm);
                    } else if ("repair".equals(mod)) {
                        result.add(perm);
                    } else if ("assembly_config".equals(mod) && Arrays.asList("assembly_config:view", "assembly_config:add", "assembly_config:edit").contains(code)) {
                        result.add(perm);
                    } else if ("assembly".equals(mod) && Arrays.asList("assembly:view", "assembly:add", "assembly:edit", "assembly:delete", "assembly:export", "assembly:print", "assembly:submit").contains(code)) {
                        result.add(perm);
                    } else if (Arrays.asList("product", "product_category", "unit", "export", "warehouse_master", "report_balance", "ai_chat").contains(mod) && code.endsWith(":view")) {
                        result.add(perm);
                    }
                }
                break;

            case "ROLE_ACCOUNTANT":
                for (PermissionEntity perm : allPerms) {
                    String mod = perm.getModule();
                    String code = perm.getCode();
                    if (Arrays.asList("sales_order", "purchase_order", "einvoice", "customer", "supplier").contains(mod)) {
                        result.add(perm);
                    } else if ("import".equals(mod) && Arrays.asList("import:view", "import:add", "import:edit", "import:export", "import:print").contains(code)) {
                        result.add(perm);
                    } else if (Arrays.asList("report_balance", "report_ledger", "report_transfer", "report_debt", "report_sales", "report_summary").contains(mod)) {
                        result.add(perm);
                    } else if ("warranty".equals(mod)) {
                        result.add(perm);
                    } else if (Arrays.asList("product", "product_category", "unit", "brand").contains(mod)
                            && Arrays.asList(mod + ":view", mod + ":add", mod + ":edit").contains(code)) {
                        result.add(perm);
                    } else if ("assembly_config".equals(mod) && "assembly_config:view".equals(code)) {
                        result.add(perm);
                    } else if ("assembly".equals(mod) && Arrays.asList("assembly:view", "assembly:approve").contains(code)) {
                        result.add(perm);
                    } else if ("payment".equals(mod)) {
                        result.add(perm);
                    } else if (Arrays.asList("export", "transfer", "stocktake", "warehouse_master", "ai_chat").contains(mod) && code.endsWith(":view")) {
                        result.add(perm);
                    }
                }
                break;

            case "ROLE_CASHIER_CONTROLLER":
                for (PermissionEntity perm : allPerms) {
                    String mod = perm.getModule();
                    String code = perm.getCode();
                    if ("payment".equals(mod)) {
                        result.add(perm);
                    } else if (Arrays.asList("sales_order", "customer", "ai_chat").contains(mod) && code.endsWith(":view")) {
                        result.add(perm);
                    } else if (Arrays.asList("report_debt").contains(mod)) {
                        result.add(perm);
                    }
                }
                break;

            default:
                break;
        }

        return result;
    }
}
