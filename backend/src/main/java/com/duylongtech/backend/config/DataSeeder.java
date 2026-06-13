package com.duylongtech.backend.config;

import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.PermissionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;

    public DataSeeder(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Seed roles
        String[] roleCodes = {"SUPER_ADMIN", "MANAGER", "STAFF"};
        for (String code : roleCodes) {
            if (roleRepository.findByCode(code).isEmpty()) {
                roleRepository.save(RoleEntity.builder()
                        .code(code)
                        .name(code)
                        .status("APPROVED")
                        .build());
            }
        }

        // Seed permissions
        java.util.Map<String, String[]> moduleActions = new java.util.LinkedHashMap<>();
        moduleActions.put("import", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("export", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("transfer", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("stocktake", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("assembly", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("product", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("unit", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("customer", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("supplier", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("warehouse_master", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("report_balance", new String[]{"view", "export"});
        moduleActions.put("report_ledger", new String[]{"view", "export"});
        moduleActions.put("report_summary", new String[]{"view", "export"});
        moduleActions.put("account", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("auth", new String[]{"view", "edit"});
        moduleActions.put("audit", new String[]{"view", "export"});

        for (java.util.Map.Entry<String, String[]> entry : moduleActions.entrySet()) {
            String module = entry.getKey();
            for (String action : entry.getValue()) {
                String code = module + ":" + action;
                if (permissionRepository.findByCode(code).isEmpty()) {
                    permissionRepository.save(com.duylongtech.backend.entity.PermissionEntity.builder()
                            .code(code)
                            .name(action.toUpperCase() + " " + module.toUpperCase())
                            .module(module)
                            .status("APPROVED")
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }

        // Associate permissions with roles
        Set<com.duylongtech.backend.entity.PermissionEntity> allPerms = new HashSet<>(permissionRepository.findAll());

        roleRepository.findByCode("SUPER_ADMIN").ifPresent(role -> {
            role.setPermissions(new HashSet<>(allPerms));
            roleRepository.save(role);
        });

        roleRepository.findByCode("MANAGER").ifPresent(role -> {
            Set<com.duylongtech.backend.entity.PermissionEntity> managerPerms = new HashSet<>();
            for (com.duylongtech.backend.entity.PermissionEntity perm : allPerms) {
                if (!java.util.Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                    managerPerms.add(perm);
                }
            }
            role.setPermissions(managerPerms);
            roleRepository.save(role);
        });

        roleRepository.findByCode("STAFF").ifPresent(role -> {
            Set<com.duylongtech.backend.entity.PermissionEntity> staffPerms = new HashSet<>();
            for (com.duylongtech.backend.entity.PermissionEntity perm : allPerms) {
                if (java.util.Arrays.asList("import", "export", "transfer", "stocktake", "assembly").contains(perm.getModule())) {
                    staffPerms.add(perm);
                }
            }
            role.setPermissions(staffPerms);
            roleRepository.save(role);
        });

        if (userRepository.findByUsername("admin").isEmpty()) {
            RoleEntity superAdminRole = roleRepository.findByCode("SUPER_ADMIN").orElseThrow();
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(superAdminRole);

            Set<com.duylongtech.backend.entity.PermissionEntity> allPermissions = new HashSet<>(permissionRepository.findAll());

            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("System Admin")
                    .email("admin@duylongtech.com")
                    .phone("0123456789")
                    .status("APPROVED")
                    .roles(roles)
                    .permissions(allPermissions)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            System.out.println("Tạo tài khoản mặc định thành công: admin / 123456");
        }
    }
}
