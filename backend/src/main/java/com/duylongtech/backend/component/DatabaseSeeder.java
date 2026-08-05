package com.duylongtech.backend.component;

import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;
    private final AuditLogRepository auditLogRepository;
    private final UnitRepository unitRepository;
    private final BrandRepository brandRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final PartnerRepository partnerRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Ensure REPAIRS.serial_number_id is NULLable for devices without serial
        try {
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
            jdbcTemplate.execute("ALTER TABLE REPAIRS MODIFY COLUMN serial_number_id BIGINT UNSIGNED NULL");
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
            System.out.println("✅ Successfully altered REPAIRS.serial_number_id to NULLABLE");
        } catch (Exception e) {
            System.err.println("❌ Failed to alter REPAIRS.serial_number_id: " + e.getMessage());
        }

        // 1. Seed Roles (Chuẩn Spring Boot với tiền tố ROLE_)
        RoleEntity superAdminRole = createRoleIfNotFound("ROLE_SUPER_ADMIN", "Super Admin");
        RoleEntity managerRole = createRoleIfNotFound("ROLE_MANAGER", "Quản lý");
        RoleEntity staffRole = createRoleIfNotFound("ROLE_STAFF", "Nhân viên");

        // 2. Seed Permissions
        seedPermissions();

        // 3. Gán Permissions cho các Roles
        associatePermissionsWithRoles();

        // 4. Seed Users mẫu
        seedUsers(superAdminRole, managerRole, staffRole);

        // 5. Seed Dữ liệu kinh doanh (Units, Brands, Categories, Products)
        seedWarehouses();
        seedPartners();
        seedBusinessData();

        // 6. Seed Lịch sử hệ thống (Mock Audit Logs)
        seedAuditLogs();
    }

    private void seedWarehouses() {
        if (warehouseRepository.count() == 0) {
            warehouseRepository.save(Warehouse.builder()
                    .code("K01")
                    .name("Kho chính")
                    .address("123 Cầu Giấy, Hà Nội")
                    .type("STANDARD")
                    .status("APPROVED")
                    .build());
            warehouseRepository.save(Warehouse.builder()
                    .code("K02")
                    .name("Kho phụ")
                    .address("456 Giải Phóng, Hà Nội")
                    .type("STANDARD")
                    .status("APPROVED")
                    .build());
            System.out.println("✅ Seeded default warehouses successfully.");
        }
    }

    private void seedPartners() {
        if (partnerRepository.count() == 0) {
            partnerRepository.save(Partner.builder()
                    .code("KH00001")
                    .name("Ng Thu Uyên")
                    .phone("0912 345 678")
                    .email("uyennt@gmail.com")
                    .address("123 Lê Lợi, Q.1, TP.HCM")
                    .taxCode("0123456789")
                    .isCustomer(true)
                    .isSupplier(false)
                    .groupType("RETAIL")
                    .status("APPROVED")
                    .build());
            partnerRepository.save(Partner.builder()
                    .code("KH00002")
                    .name("Công ty TNHH ABC")
                    .phone("0987 654 321")
                    .email("contact@abc.com")
                    .address("456 Nguyễn Huệ, Q.1, TP.HCM")
                    .taxCode("0987654321")
                    .isCustomer(true)
                    .isSupplier(false)
                    .groupType("WHOLESALE")
                    .status("APPROVED")
                    .build());
            partnerRepository.save(Partner.builder()
                    .code("KH00003")
                    .name("Trần Văn Bình")
                    .phone("0901 234 567")
                    .email("binhtv@gmail.com")
                    .address("789 Hai Bà Trưng, Q.3, TP.HCM")
                    .taxCode("")
                    .isCustomer(true)
                    .isSupplier(false)
                    .groupType("RETAIL")
                    .status("INACTIVE")
                    .build());
            partnerRepository.save(Partner.builder()
                    .code("NCC00001")
                    .name("Công ty Máy tính Phong Vũ")
                    .phone("19001808")
                    .email("contact@phongvu.vn")
                    .address("264 Nguyễn Thị Minh Khai, Q.3, TP.HCM")
                    .taxCode("0303102148")
                    .isCustomer(false)
                    .isSupplier(true)
                    .groupType("RETAIL")
                    .status("APPROVED")
                    .build());
            partnerRepository.save(Partner.builder()
                    .code("NCC00002")
                    .name("FPT Shop")
                    .phone("18006601")
                    .email("fptshop@fpt.com.vn")
                    .address("261-263 Khánh Hội, Q.4, TP.HCM")
                    .taxCode("0311609355")
                    .isCustomer(false)
                    .isSupplier(true)
                    .groupType("RETAIL")
                    .status("APPROVED")
                    .build());
            System.out.println("✅ Seeded default partners successfully.");
        }
    }

    private RoleEntity createRoleIfNotFound(String code, String name) {
        Optional<RoleEntity> roleOpt = roleRepository.findByCode(code);
        if (roleOpt.isPresent()) {
            return roleOpt.get();
        }
        RoleEntity newRole = new RoleEntity();
        newRole.setCode(code);
        newRole.setName(name);
        newRole.setStatus("APPROVED");
        return roleRepository.save(newRole);
    }

    private void seedPermissions() {
        java.util.Map<String, String[]> moduleActions = new java.util.LinkedHashMap<>();
        moduleActions.put("import", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("export", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("sales_order", new String[]{"view", "add", "edit", "approve", "export", "print"});
        moduleActions.put("transfer", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("stocktake", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("assembly", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("product", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("product_category", new String[]{"view", "add", "edit", "delete"});
        moduleActions.put("brand", new String[]{"view", "add", "edit", "delete"});
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
                    permissionRepository.save(PermissionEntity.builder()
                            .code(code)
                            .name(action.toUpperCase() + " " + module.toUpperCase())
                            .module(module)
                            .status("APPROVED")
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }
    }

    private void associatePermissionsWithRoles() {
        Set<PermissionEntity> allPerms = new HashSet<>(permissionRepository.findAll());

        roleRepository.findByCode("ROLE_SUPER_ADMIN").ifPresent(role -> {
            Set<PermissionEntity> superAdminPerms = new HashSet<>();
            for (PermissionEntity perm : allPerms) {
                if (java.util.Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                    superAdminPerms.add(perm);
                }
            }
            role.setPermissions(superAdminPerms);
            roleRepository.save(role);
        });

        roleRepository.findByCode("ROLE_MANAGER").ifPresent(role -> {
            Set<PermissionEntity> managerPerms = new HashSet<>();
            for (PermissionEntity perm : allPerms) {
                if (!java.util.Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                    managerPerms.add(perm);
                }
            }
            role.setPermissions(managerPerms);
            roleRepository.save(role);
        });

        roleRepository.findByCode("ROLE_STAFF").ifPresent(role -> {
            Set<PermissionEntity> staffPerms = new HashSet<>();
            for (PermissionEntity perm : allPerms) {
                if (java.util.Arrays.asList("import", "export", "sales_order", "transfer", "stocktake", "assembly", "product", "report_balance").contains(perm.getModule())) {
                    staffPerms.add(perm);
                }
            }
            role.setPermissions(staffPerms);
            roleRepository.save(role);
        });
    }

    private void seedUsers(RoleEntity superAdminRole, RoleEntity managerRole, RoleEntity staffRole) {
        Set<PermissionEntity> allPermissions = new HashSet<>(permissionRepository.findAll());
        Set<PermissionEntity> adminPermissions = new HashSet<>();
        for (PermissionEntity perm : allPermissions) {
            if (java.util.Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                adminPermissions.add(perm);
            }
        }

        // Tài khoản Admin
        Optional<User> adminOpt = userRepository.findByUsername("admin");
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(superAdminRole);
            admin.setStatus("APPROVED");
            admin.setRoles(roles);
            admin.setPermissions(adminPermissions);
            userRepository.save(admin);
        } else {
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(superAdminRole);

            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("System Admin")
                    .email("admin@duylongtech.com")
                    .phone("0123456789")
                    .status("APPROVED")
                    .roles(roles)
                    .permissions(adminPermissions)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Đã tạo tài khoản mặc định: admin / 123456");
        }

        // Tài khoản Manager
        if (userRepository.findByUsername("manager@duylong.vn").isEmpty()) {
            User manager = User.builder()
                    .username("manager@duylong.vn")
                    .fullName("Quản Lý Hệ Thống")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .status("APPROVED")
                    .roles(new HashSet<>())
                    .build();
            manager.getRoles().add(managerRole);
            userRepository.save(manager);
            System.out.println("✅ Đã tạo tài khoản mẫu: manager@duylong.vn / 123456");
        }

        // Tài khoản Staff
        if (userRepository.findByUsername("staff@duylong.vn").isEmpty()) {
            User staff = User.builder()
                    .username("staff@duylong.vn")
                    .fullName("Nhân Viên Kho")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .status("APPROVED")
                    .roles(new HashSet<>())
                    .build();
            staff.getRoles().add(staffRole);
            userRepository.save(staff);
            System.out.println("✅ Đã tạo tài khoản mẫu: staff@duylong.vn / 123456");
        }
    }

    private void seedBusinessData() {
        // Seed Đơn vị tính cơ bản (nếu CSDL rỗng)
        seedUnitIfNotFound("Cái");
        seedUnitIfNotFound("Bộ");
        seedUnitIfNotFound("Lần");

        // Seed Thương hiệu cơ bản (nếu CSDL rỗng)
        seedBrandIfNotFound("DELL", "Dell", "Hãng máy tính Hoa Kỳ", "18008182", "support@dell.com");
        seedBrandIfNotFound("GENERIC", "Khác", "Nhà sản xuất khác", null, null);
    }


    private void seedAuditLogs() {
        if (auditLogRepository.count() == 0) {
            User adminUser = userRepository.findByUsername("admin").orElse(null);

            auditLogRepository.save(AuditLog.builder()
                    .user(adminUser)
                    .action("POST")
                    .entityName("Auth")
                    .ipAddress("192.168.1.15")
                    .status("SUCCESS")
                    .description("Đăng nhập hệ thống")
                    .createdAt(Instant.now().minus(2, ChronoUnit.HOURS))
                    .build());

            auditLogRepository.save(AuditLog.builder()
                    .user(adminUser)
                    .action("UPDATE")
                    .entityName("Product")
                    .ipAddress("192.168.1.24")
                    .status("SUCCESS")
                    .description("Cập nhật số lượng sản phẩm SP-RAM-008")
                    .createdAt(Instant.now().minus(90, ChronoUnit.MINUTES))
                    .build());

            auditLogRepository.save(AuditLog.builder()
                    .user(adminUser)
                    .action("CREATE")
                    .entityName("ExportSlip")
                    .ipAddress("192.168.1.42")
                    .status("SUCCESS")
                    .description("Tạo phiếu xuất kho XK-2024-0012")
                    .createdAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .build());

            auditLogRepository.save(AuditLog.builder()
                    .user(null) // anonymous
                    .action("POST")
                    .entityName("Auth")
                    .ipAddress("203.113.152.4")
                    .status("FAILED")
                    .description("Thử đăng nhập sai mật khẩu")
                    .createdAt(Instant.now().minus(45, ChronoUnit.MINUTES))
                    .build());

            auditLogRepository.save(AuditLog.builder()
                    .user(adminUser)
                    .action("UPDATE")
                    .entityName("Permission")
                    .ipAddress("192.168.1.15")
                    .status("SUCCESS")
                    .description("Phân quyền tài khoản manager@duylong.vn")
                    .createdAt(Instant.now().minus(20, ChronoUnit.MINUTES))
                    .build());

            auditLogRepository.save(AuditLog.builder()
                    .user(adminUser)
                    .action("CREATE")
                    .entityName("Unit")
                    .ipAddress("192.168.1.24")
                    .status("SUCCESS")
                    .description("Thêm mới đơn vị tính: Hộp")
                    .createdAt(Instant.now().minus(5, ChronoUnit.MINUTES))
                    .build());
            System.out.println("✅ Seeded mock audit logs successfully.");
        }
    }

    private Unit seedUnitIfNotFound(String name) {
        Optional<Unit> unitOpt = unitRepository.findByName(name);
        if (unitOpt.isPresent()) {
            return unitOpt.get();
        }
        Unit newUnit = Unit.builder()
                .name(name)
                .status("ACTIVE")
                .build();
        return unitRepository.save(newUnit);
    }

    private Brand seedBrandIfNotFound(String code, String name, String description, String hotline, String email) {
        Optional<Brand> brandOpt = brandRepository.findByCode(code);
        if (brandOpt.isPresent()) {
            return brandOpt.get();
        }
        Brand newBrand = Brand.builder()
                .code(code)
                .name(name)
                .status("APPROVED")
                .description(description)
                .hotline(hotline)
                .contactEmail(email)
                .build();
        return brandRepository.save(newBrand);
    }

    private ProductCategory seedCategoryIfNotFound(String code, String name, Long parentId) {
        Optional<ProductCategory> catOpt = categoryRepository.findByCode(code);
        if (catOpt.isPresent()) {
            return catOpt.get();
        }
        ProductCategory newCat = ProductCategory.builder()
                .code(code)
                .name(name)
                .parentId(parentId)
                .status("APPROVED")
                .build();
        return categoryRepository.save(newCat);
    }

    private ProductVariant seedVariantIfNotFound(Product product, String sku, String name, BigDecimal costPrice, BigDecimal salePrice) {
        Optional<ProductVariant> opt = productVariantRepository.findBySku(sku);
        if (opt.isPresent()) {
            return opt.get();
        }
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(sku)
                .barcode(sku)
                .variantName(name)
                .costPrice(costPrice)
                .salePrice(salePrice)
                .active(true)
                .build();
        return productVariantRepository.save(variant);
    }

    private void seedInventoryBalanceIfNotFound(Long warehouseId, Long variantId, BigDecimal qtyOnHand, BigDecimal avgCost) {
        Optional<InventoryBalance> opt = inventoryBalanceRepository.findFirstByWarehouseIdAndVariantIdAndStockStatus(warehouseId, variantId, "GOOD");
        if (opt.isEmpty()) {
            InventoryBalance balance = InventoryBalance.builder()
                    .warehouseId(warehouseId)
                    .variantId(variantId)
                    .stockStatus("GOOD")
                    .quantityOnHand(qtyOnHand)
                    .quantityReserved(BigDecimal.ZERO)
                    .averageCost(avgCost)
                    .updatedAt(LocalDateTime.now())
                    .build();
            inventoryBalanceRepository.save(balance);
        }
    }
}
