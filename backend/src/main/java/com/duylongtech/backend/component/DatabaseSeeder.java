package com.duylongtech.backend.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import com.duylongtech.backend.feature.auth.RoleService;
import com.duylongtech.backend.feature.audit.AuditLog;
import com.duylongtech.backend.feature.audit.AuditLogRepository;
import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;

import com.duylongtech.backend.feature.brand.Brand;
import com.duylongtech.backend.feature.brand.BrandRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductCategory;
import com.duylongtech.backend.feature.product.ProductCategoryRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.system.SystemSetting;
import com.duylongtech.backend.feature.system.SystemSettingRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.Warranty;

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
    private final SystemSettingRepository systemSettingRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Ensure REPAIRS.serial_number_id is NULLable for devices without serial
        // Ensure USERS table has all required columns
        String[] schemaAlterStatements = new String[]{
            "ALTER TABLE USERS ADD COLUMN user_code VARCHAR(50) NULL",
            "ALTER TABLE USERS ADD COLUMN avatar_url VARCHAR(255) NULL",
            "ALTER TABLE USERS ADD COLUMN address TEXT NULL",
            "ALTER TABLE USERS ADD COLUMN id_card VARCHAR(20) NULL",
            "ALTER TABLE USERS ADD COLUMN dob DATE NULL",
            "ALTER TABLE USERS ADD COLUMN gender VARCHAR(10) NULL",
            "ALTER TABLE USERS ADD COLUMN start_date DATE NULL",
            "ALTER TABLE USERS ADD COLUMN position VARCHAR(50) NULL",
            "ALTER TABLE USERS ADD COLUMN department VARCHAR(50) NULL",
            "ALTER TABLE INVENTORY_DOCUMENTS ADD COLUMN has_discrepancy BOOLEAN DEFAULT FALSE",
            "ALTER TABLE INVENTORY_DOCUMENTS ADD COLUMN discrepancy_note TEXT NULL",
            "ALTER TABLE INVENTORY_DOCUMENT_LINES ADD COLUMN expected_quantity DECIMAL(15,4) NULL",
            "ALTER TABLE INVENTORY_DOCUMENT_LINES ADD COLUMN rejected_quantity DECIMAL(15,4) NULL",
            "ALTER TABLE INVENTORY_DOCUMENT_LINES ADD COLUMN discrepancy_reason VARCHAR(255) NULL",
            "CREATE TABLE IF NOT EXISTS APP_NOTIFICATIONS (" +
            "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "  recipient_role VARCHAR(50) NULL," +
            "  user_id BIGINT NULL," +
            "  title VARCHAR(200) NOT NULL," +
            "  message TEXT NOT NULL," +
            "  type VARCHAR(50) NULL," +
            "  reference_type VARCHAR(50) NULL," +
            "  reference_id BIGINT NULL," +
            "  link VARCHAR(255) NULL," +
            "  is_read BOOLEAN DEFAULT FALSE," +
            "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
            ")"
        };
        for (String sql : schemaAlterStatements) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception ignored) {
            }
        }

        // 1. Seed Roles (Chuẩn Spring Boot với tiền tố ROLE_)
        RoleEntity superAdminRole = createRoleIfNotFound("ROLE_SUPER_ADMIN", "Super Admin");
        RoleEntity managerRole = createRoleIfNotFound("ROLE_MANAGER", "Quản lý");
        RoleEntity whControllerRole = createRoleIfNotFound("ROLE_WAREHOUSE_CONTROLLER", "Thủ kho");
        RoleEntity technicianRole = createRoleIfNotFound("ROLE_TECHNICIAN", "Kỹ thuật viên");
        RoleEntity accountantRole = createRoleIfNotFound("ROLE_ACCOUNTANT", "Kế toán");
        RoleEntity cashierRole = createRoleIfNotFound("ROLE_CASHIER_CONTROLLER", "Thủ quỹ");

        // 2. Seed Permissions
        seedPermissions();

        // 3. Gán Permissions cho các Roles
        associatePermissionsWithRoles();

        // 3b. Vá các quyền module mới thêm sau khi hệ thống đã khởi tạo (vd. "einvoice")
        // - associatePermissionsWithRoles() ở trên chỉ gán full bộ quyền mặc định cho role
        // đang trống hẳn, để không ghi đè quyền admin đã tùy chỉnh qua màn Phân quyền. Nếu
        // module mới được thêm vào seedPermissions() sau khi hệ thống đã chạy, role không còn
        // trống nữa nên sẽ không tự nhận được quyền mới đó. Hàm này chỉ merge thêm đúng những
        // quyền còn thiếu của module mới, không đụng tới bất kỳ quyền nào khác của role.
        backfillNewModulePermissions();

        // 4. Seed Users mẫu cho 6 Roles
        seedUsers(superAdminRole, managerRole, whControllerRole, technicianRole, accountantRole, cashierRole);

        // 5. Seed Dữ liệu kinh doanh (Đã comment ra để hệ thống trắng)
        // seedWarehouses();
        // seedPartners();
        // seedBusinessData();

        // 6. Seed Lịch sử hệ thống (Mock Audit Logs)
        // seedAuditLogs();
    }

    @SuppressWarnings("unused")
    private void seedWarehouses() {
        if (warehouseRepository.count() == 0) {
            Warehouse w1 = new Warehouse();
            w1.initWarehouse("K01", "Kho chính", "123 Cầu Giấy, Hà Nội", "STANDARD");
            w1.setStatus("APPROVED");
            warehouseRepository.save(w1);
            
            Warehouse w2 = new Warehouse();
            w2.initWarehouse("K02", "Kho phụ", "456 Giải Phóng, Hà Nội", "STANDARD");
            w2.setStatus("APPROVED");
            warehouseRepository.save(w2);
            System.out.println("✅ Seeded default warehouses successfully.");
        }
    }

    @SuppressWarnings("unused")
    private void seedPartners() {
        if (partnerRepository.count() == 0) {
            Partner p1 = new Partner();
            p1.initPartner("KH00001", "Ng Thu Uyên", "INDIVIDUAL", true, false, "RETAIL");
            p1.updateContact("0912 345 678", "uyennt@gmail.com", "123 Lê Lợi, Q.1, TP.HCM", "0123456789");
            partnerRepository.save(p1);
            Partner p2 = new Partner();
            p2.initPartner("KH00002", "Công ty TNHH ABC", "COMPANY", true, false, "WHOLESALE");
            p2.updateContact("0987 654 321", "contact@abc.com", "456 Nguyễn Huệ, Q.1, TP.HCM", "0987654321");
            partnerRepository.save(p2);
            Partner p3 = new Partner();
            p3.initPartner("KH00003", "Trần Văn Bình", "INDIVIDUAL", true, false, "RETAIL");
            p3.updateContact("0901 234 567", "binhtv@gmail.com", "789 Hai Bà Trưng, Q.3, TP.HCM", "");
            p3.deactivate();
            partnerRepository.save(p3);
            Partner p4 = new Partner();
            p4.initPartner("NCC00001", "Công ty Máy tính Phong Vũ", "COMPANY", false, true, "RETAIL");
            p4.updateContact("19001808", "contact@phongvu.vn", "264 Nguyễn Thị Minh Khai, Q.3, TP.HCM", "0303102148");
            partnerRepository.save(p4);
            Partner p5 = new Partner();
            p5.initPartner("NCC00002", "FPT Shop", "COMPANY", false, true, "RETAIL");
            p5.updateContact("18006601", "fptshop@fpt.com.vn", "261-263 Khánh Hội, Q.4, TP.HCM", "0311609355");
            partnerRepository.save(p5);
            System.out.println("✅ Seeded default partners successfully.");
        }
    }

    private RoleEntity createRoleIfNotFound(String code, String name) {
        Optional<RoleEntity> roleOpt = roleRepository.findByCode(code);
        if (roleOpt.isPresent()) {
            return roleOpt.get();
        }
        RoleEntity newRole = new RoleEntity();
        newRole.initRole(code, name, null, "APPROVED");
        return roleRepository.save(newRole);
    }

    private void seedPermissions() {
        Map<String, String[]> moduleActions = new LinkedHashMap<>();
        moduleActions.put("import", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("export", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("purchase_order", new String[]{"view", "add", "edit"});
        moduleActions.put("sales_order", new String[]{"view", "add", "edit", "export", "print"});
        moduleActions.put("einvoice", new String[]{"view", "add", "edit"});
        moduleActions.put("payment", new String[]{"view", "add", "edit", "delete"});
        moduleActions.put("transfer", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("stocktake", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("assembly_config", new String[]{"view", "add", "edit"});
        // approve/submit: AssemblyOrderController đã dùng "assembly:approve"/"assembly:submit"
        // và RoleService đã có sẵn logic gán 2 quyền này cho Kế toán/Kỹ thuật viên, nhưng chưa
        // từng được seed - nghĩa là quyền này chưa bao giờ thực sự tồn tại để cấp cho ai, nên
        // mọi API duyệt/nộp BOM và lệnh lắp ráp/tháo dỡ trước giờ luôn trả 403 cho tất cả role.
        moduleActions.put("assembly", new String[]{"view", "add", "edit", "delete", "export", "print", "approve", "submit"});
        moduleActions.put("warranty", new String[]{"view", "add", "edit"});
        moduleActions.put("repair", new String[]{"view", "add", "edit", "delete"});
        moduleActions.put("product", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("product_category", new String[]{"view", "add", "edit", "delete"});
        moduleActions.put("brand", new String[]{"view", "add", "edit", "delete"});
        moduleActions.put("unit", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("customer", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("supplier", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("warehouse_master", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("report_balance", new String[]{"view", "export"});
        moduleActions.put("report_ledger", new String[]{"view", "export"});
        moduleActions.put("report_transfer", new String[]{"view", "export"});
        moduleActions.put("report_debt", new String[]{"view", "export"});
        moduleActions.put("report_summary", new String[]{"view", "export"});
        moduleActions.put("report_sales", new String[]{"view", "export"});
        moduleActions.put("ai_chat", new String[]{"view"});
        moduleActions.put("account", new String[]{"view", "add", "edit", "delete", "export", "print"});
        moduleActions.put("auth", new String[]{"view", "edit"});
        moduleActions.put("audit", new String[]{"view", "export"});

        for (Map.Entry<String, String[]> entry : moduleActions.entrySet()) {
            String module = entry.getKey();
            for (String action : entry.getValue()) {
                String code = module + ":" + action;
                if (permissionRepository.findByCode(code).isEmpty()) {
                    permissionRepository.save(createPermission(code, action.toUpperCase() + " " + module.toUpperCase(), module, null, "APPROVED"));
                }
            }
        }
    }

    private void associatePermissionsWithRoles() {
        boolean isInitialized = systemSettingRepository.findBySettingKey("system.roles_permissions_initialized")
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(false);

        List<RoleEntity> allRoles = roleRepository.findAll();
        // Nếu đã khởi tạo và các role đều đã có quyền, bỏ qua hoàn toàn để không ghi đè quyền admin chỉnh sửa
        if (isInitialized) {
            boolean hasEmptyRole = allRoles.stream().anyMatch(r -> r.getPermissions() == null || r.getPermissions().isEmpty());
            if (!hasEmptyRole) {
                return;
            }
        }

        Set<PermissionEntity> allPerms = new HashSet<>(permissionRepository.findAll());

        for (RoleEntity role : allRoles) {
            if (!isInitialized || role.getPermissions() == null || role.getPermissions().isEmpty()) {
                Set<PermissionEntity> defaultPerms = RoleService.getDefaultPermissionsForRole(role.getCode(), allPerms);
                if (!defaultPerms.isEmpty()) {
                    role.updatePermissions(defaultPerms);
                    roleRepository.save(role);
                }
            }
        }

        if (!isInitialized) {
            systemSettingRepository.findBySettingKey("system.roles_permissions_initialized")
                    .ifPresentOrElse(
                            s -> {
                                s.updateValue("true");
                                systemSettingRepository.save(s);
                            },
                            () -> systemSettingRepository.save(createSystemSetting("system.roles_permissions_initialized", "true", "Đánh dấu quyền vai trò đã được khởi tạo lần đầu"))
                    );
        }
    }

    private void backfillNewModulePermissions() {
        // PermissionEntity không override equals()/hashCode() (mặc định theo tham chiếu object),
        // nên so sánh "đã có quyền X chưa" phải dựa theo id - nếu dùng thẳng Set.contains(entity)
        // như associatePermissionsWithRoles(), 2 instance khác nhau cùng trỏ 1 dòng DB (permission
        // vừa fetch riêng vs. permission đã có sẵn trong role.getPermissions()) sẽ bị coi là khác
        // nhau, merge xong role sẽ có 2 bản ghi trùng permission_id trong ROLE_PERMISSIONS.
        Set<PermissionEntity> allPerms = new HashSet<>(permissionRepository.findAll());
        for (RoleEntity role : roleRepository.findAll()) {
            Set<PermissionEntity> defaults = RoleService.getDefaultPermissionsForRole(role.getCode(), allPerms);
            Set<PermissionEntity> current = role.getPermissions();
            Set<Long> currentIds = new HashSet<>();
            if (current != null) {
                for (PermissionEntity p : current) {
                    currentIds.add(p.getId());
                }
            }
            Set<PermissionEntity> missing = new HashSet<>();
            for (PermissionEntity perm : defaults) {
                if (!currentIds.contains(perm.getId())) {
                    missing.add(perm);
                }
            }
            if (!missing.isEmpty()) {
                Set<PermissionEntity> merged = new HashSet<>(current != null ? current : Set.of());
                merged.addAll(missing);
                role.updatePermissions(merged);
                roleRepository.save(role);
            }
        }
    }

    private void seedUsers(RoleEntity superAdminRole, RoleEntity managerRole, RoleEntity whControllerRole,
                           RoleEntity technicianRole, RoleEntity accountantRole, RoleEntity cashierRole) {
        Set<PermissionEntity> allPermissions = new HashSet<>(permissionRepository.findAll());
        Set<PermissionEntity> adminPermissions = new HashSet<>();
        for (PermissionEntity perm : allPermissions) {
            if (Arrays.asList("account", "auth", "audit").contains(perm.getModule())) {
                adminPermissions.add(perm);
            }
        }

        // 1. Tài khoản Super Admin
        Optional<User> adminOpt = userRepository.findByUsername("admin");
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(superAdminRole);
                        admin.updateRoles(roles);
            admin.updatePermissions(adminPermissions);
            userRepository.save(admin);
        } else {
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(superAdminRole);

            User admin = new User();
            admin.initUser("admin", null, passwordEncoder.encode("123456"), "System Admin", "APPROVED");
            admin.updateProfile("System Admin", null, "admin@duylongtech.com", "0123456789", null, null, null, null);
            admin.updateRoles(roles);
            admin.updatePermissions(adminPermissions);
            userRepository.save(admin);
            System.out.println("✅ Đã tạo tài khoản mặc định: admin / 123456");
        }

        // 2. Tài khoản Manager mẫu
        seedUserIfNotFound("manager@duylong.vn", "Quản Lý Hệ Thống", "manager@duylong.vn", "0981111111", managerRole);

        // 3. Tài khoản Warehouse Controller (Thủ kho)
        seedUserIfNotFound("wh_controller@duylong.vn", "Trưởng Kho Vận", "wh_controller@duylong.vn", "0982222222", whControllerRole);

        // 4. Tài khoản Technician (Kỹ thuật viên)
        seedUserIfNotFound("technician@duylong.vn", "Kỹ Thuật Viên Trưởng", "technician@duylong.vn", "0983333333", technicianRole);

        // 5. Tài khoản Accountant (Kế toán)
        seedUserIfNotFound("accountant@duylong.vn", "Kế Toán Tổng Hợp", "accountant@duylong.vn", "0984444444", accountantRole);

        // 6. Tài khoản Cashier Controller (Thủ quỹ)
        seedUserIfNotFound("cashier@duylong.vn", "Thủ Quỹ Thu Ngân", "cashier@duylong.vn", "0985555555", cashierRole);
    }

    private void seedUserIfNotFound(String username, String fullName, String email, String phone, RoleEntity role) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getRoles() == null || user.getRoles().isEmpty()) {
                Set<RoleEntity> roles = new HashSet<>();
                roles.add(role);
                user.updateRoles(roles);
                userRepository.save(user);
            }
        } else {
            Set<RoleEntity> roles = new HashSet<>();
            roles.add(role);
            User user = new User();
            user.initUser(username, null, passwordEncoder.encode("123456"), fullName, "APPROVED");
            user.updateProfile(fullName, null, email, phone, null, null, null, null);
            user.updateRoles(roles);
            userRepository.save(user);
            System.out.println("✅ Đã tạo tài khoản mẫu: " + username + " / 123456 (" + role.getName() + ")");
        }
    }

    @SuppressWarnings("unused")
    private void seedBusinessData() {
        // Seed Đơn vị tính cơ bản (nếu CSDL rỗng)
        seedUnitIfNotFound("Cái");
        seedUnitIfNotFound("Bộ");
        seedUnitIfNotFound("Lần");

        // Seed Thương hiệu cơ bản (nếu CSDL rỗng)
        seedBrandIfNotFound("DELL", "Dell", "Hãng máy tính Hoa Kỳ", "18008182", "support@dell.com");
        seedBrandIfNotFound("GENERIC", "Khác", "Nhà sản xuất khác", null, null);
    }

    @SuppressWarnings("unused")
    private void seedAuditLogs() {
        if (auditLogRepository.count() == 0) {
            User adminUser = userRepository.findByUsername("admin").orElse(null);

            AuditLog log1 = new AuditLog();
            log1.initLog(adminUser, "POST", "Auth", null, null, "192.168.1.15", "SUCCESS", "Đăng nhập hệ thống");
            auditLogRepository.save(log1);

            AuditLog log2 = new AuditLog();
            log2.initLog(adminUser, "UPDATE", "Product", null, null, "192.168.1.24", "SUCCESS", "Cập nhật số lượng sản phẩm SP-RAM-008");
            auditLogRepository.save(log2);

            AuditLog log3 = new AuditLog();
            log3.initLog(adminUser, "CREATE", "ExportSlip", null, null, "192.168.1.42", "SUCCESS", "Tạo phiếu xuất kho XK-2024-0012");
            auditLogRepository.save(log3);

            AuditLog log4 = new AuditLog();
            log4.initLog(null, "POST", "Auth", null, null, "203.113.152.4", "FAILED", "Thử đăng nhập sai mật khẩu");
            auditLogRepository.save(log4);

            AuditLog log5 = new AuditLog();
            log5.initLog(adminUser, "UPDATE", "Permission", null, null, "192.168.1.15", "SUCCESS", "Phân quyền tài khoản manager@duylong.vn");
            auditLogRepository.save(log5);

            AuditLog log6 = new AuditLog();
            log6.initLog(adminUser, "CREATE", "Unit", null, null, "192.168.1.24", "SUCCESS", "Thêm mới đơn vị tính: Hộp");
            auditLogRepository.save(log6);
            System.out.println("✅ Seeded mock audit logs successfully.");
        }
    }

    private Unit seedUnitIfNotFound(String name) {
        Optional<Unit> unitOpt = unitRepository.findByName(name);
        if (unitOpt.isPresent()) {
            return unitOpt.get();
        }
        Unit newUnit = new Unit();
        newUnit.initUnit(name, "", null);
        return unitRepository.save(newUnit);
    }

    private Brand seedBrandIfNotFound(String code, String name, String description, String hotline, String email) {
        Optional<Brand> brandOpt = brandRepository.findByCode(code);
        if (brandOpt.isPresent()) {
            return brandOpt.get();
        }
        Brand newBrand = new Brand();
        newBrand.initBrand(code, name, "APPROVED", description, hotline, email);
        return brandRepository.save(newBrand);
    }

    private ProductCategory seedCategoryIfNotFound(String code, String name, Long parentId) {
        Optional<ProductCategory> catOpt = categoryRepository.findByCode(code);
        if (catOpt.isPresent()) {
            return catOpt.get();
        }
        ProductCategory newCat = new ProductCategory();
        newCat.initCategory(name, "", null);
        newCat.setCode(code);
        newCat.setParentId(parentId);
        return categoryRepository.save(newCat);
    }

    private ProductVariant seedVariantIfNotFound(Product product, String sku, String name, BigDecimal costPrice, BigDecimal salePrice) {
        Optional<ProductVariant> opt = productVariantRepository.findBySku(sku);
        if (opt.isPresent()) {
            return opt.get();
        }
        ProductVariant variant = new ProductVariant();
        variant.initVariant(product, sku, sku, name);
        variant.updatePricing(costPrice, salePrice);
        variant.activate();
        return productVariantRepository.save(variant);
    }

    private void seedInventoryBalanceIfNotFound(Long warehouseId, Long variantId, BigDecimal qtyOnHand, BigDecimal avgCost) {
        Optional<InventoryBalance> opt = inventoryBalanceRepository.findFirstByWarehouseIdAndVariantIdAndStockStatus(warehouseId, variantId, "GOOD");
        if (opt.isEmpty()) {
            InventoryBalance balance = new InventoryBalance();
            balance.initBalance(warehouseId, variantId, null, "GOOD", qtyOnHand, BigDecimal.ZERO, avgCost);
            inventoryBalanceRepository.save(balance);
        }
    }

    

    

    private PermissionEntity createPermission(String code, String name, String module, String description, String status) {
        PermissionEntity p = new PermissionEntity();
        p.initPermission(code, name, module, description, status);
        return p;
    }

    private SystemSetting createSystemSetting(String key, String value, String description) {
        SystemSetting s = new SystemSetting();
        s.initSetting(key, value, description);
        return s;
    }

    private User createUser(String username, String passwordHash, String email, String fullName, String status, java.util.Set<RoleEntity> roles) {
        User u = new User();
        u.initUser(username, null, passwordHash, fullName, status);
        u.updateProfile(fullName, null, email, null, null, null, null, null);
        u.updateRoles(roles);
        return u;
    }

    private AuditLog createAuditLog(String action, String entityName, Long entityId, String detail, String status) {
        AuditLog log = new AuditLog();
        log.initLog(null, action, entityName, entityId, detail, null, status, null);
        return log;
    }
}
