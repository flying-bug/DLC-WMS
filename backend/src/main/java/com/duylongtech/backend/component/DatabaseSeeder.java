package com.duylongtech.backend.component;

import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.BrandRepository;
import com.duylongtech.backend.repository.ProductCategoryRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UnitRepository unitRepository;
    private final BrandRepository brandRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Override
    public void run(String... args) throws Exception {
        // Tạo Role mẫu nếu chưa có
        RoleEntity managerRole = createRoleIfNotFound("ROLE_MANAGER", "Quản lý");
        RoleEntity staffRole = createRoleIfNotFound("ROLE_STAFF", "Nhân viên");

        // Tạo tài khoản mẫu MANAGER
        if (userRepository.findByUsername("manager@duylong.vn").isEmpty()) {
            User manager = User.builder()
                    .username("manager@duylong.vn")
                    .fullName("Quản Lý Hệ Thống")
                    .passwordHash(passwordEncoder.encode("123456")) // Mật khẩu mặc định
                    .status("APPROVED")
                    .roles(new HashSet<>())
                    .build();
            manager.getRoles().add(managerRole);
            userRepository.save(manager);
            System.out.println("✅ Đã tạo tài khoản mẫu: manager@duylong.vn / 123456");
        }

        // Tạo tài khoản mẫu STAFF
        if (userRepository.findByUsername("staff@duylong.vn").isEmpty()) {
            User staff = User.builder()
                    .username("staff@duylong.vn")
                    .fullName("Nhân Viên Kho")
                    .passwordHash(passwordEncoder.encode("123456")) // Mật khẩu mặc định
                    .status("APPROVED")
                    .roles(new HashSet<>())
                    .build();
            staff.getRoles().add(staffRole);
            userRepository.save(staff);
            System.out.println("✅ Đã tạo tài khoản mẫu: staff@duylong.vn / 123456");
        }

        // Seed Đơn vị tính
        Unit caiUnit = seedUnitIfNotFound("Cái");
        Unit lanUnit = seedUnitIfNotFound("Lần");
        seedUnitIfNotFound("Bộ");

        // Seed Thương hiệu
        Brand dellBrand = seedBrandIfNotFound("DELL", "Dell");
        Brand genericBrand = seedBrandIfNotFound("GENERIC", "Khác");

        // Seed Danh mục sản phẩm
        ProductCategory computerCategory = seedCategoryIfNotFound("MAY_TINH", "Máy tính");
        ProductCategory serviceCategory = seedCategoryIfNotFound("DICH_VU", "Dịch vụ");

        // Seed Sản phẩm (Hàng hóa, dịch vụ) khớp hình ảnh mẫu
        if (productRepository.findByProductCode("CPMH").isEmpty()) {
            Product p1 = Product.builder()
                    .productCode("CPMH")
                    .productName("Chi phí mua hàng")
                    .productType("Dịch vụ")
                    .brand(genericBrand)
                    .category(serviceCategory)
                    .unit(lanUnit)
                    .stockQty(BigDecimal.ZERO)
                    .stockValue(BigDecimal.ZERO)
                    .active(true)
                    .taxReductionStatus("Chưa xác định")
                    .build();
            productRepository.save(p1);
        }

        if (productRepository.findByProductCode("VT00001").isEmpty()) {
            Product p2 = Product.builder()
                    .productCode("VT00001")
                    .productName("Bánh Bông")
                    .productType("Hàng hóa")
                    .brand(genericBrand)
                    .category(computerCategory)
                    .unit(caiUnit)
                    .stockQty(BigDecimal.ZERO)
                    .stockValue(BigDecimal.ZERO)
                    .active(true)
                    .taxReductionStatus("Chưa xác định")
                    .build();
            productRepository.save(p2);
        }

        if (productRepository.findByProductCode("VT00002").isEmpty()) {
            Product p3 = Product.builder()
                    .productCode("VT00002")
                    .productName("Máy tính")
                    .productType("Hàng hóa")
                    .brand(dellBrand)
                    .category(computerCategory)
                    .unit(caiUnit)
                    .stockQty(new BigDecimal("247.0000"))
                    .stockValue(new BigDecimal("3500000000.00"))
                    .active(true)
                    .taxReductionStatus("Chưa xác định")
                    .imageUrl("https://picsum.photos/id/1/200/120") // Placeholder image
                    .build();
            productRepository.save(p3);
        }

        if (productRepository.findByProductCode("VT00004").isEmpty()) {
            Product p4 = Product.builder()
                    .productCode("VT00004")
                    .productName("Hiếu")
                    .productType("Thành phẩm")
                    .brand(genericBrand)
                    .category(computerCategory)
                    .unit(caiUnit)
                    .stockQty(BigDecimal.ZERO)
                    .stockValue(BigDecimal.ZERO)
                    .active(true)
                    .taxReductionStatus("Chưa xác định")
                    .build();
            productRepository.save(p4);
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
        newRole.setStatus("ACTIVE");
        return roleRepository.save(newRole);
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

    private Brand seedBrandIfNotFound(String code, String name) {
        Optional<Brand> brandOpt = brandRepository.findByCode(code);
        if (brandOpt.isPresent()) {
            return brandOpt.get();
        }
        Brand newBrand = Brand.builder()
                .code(code)
                .name(name)
                .status("APPROVED")
                .build();
        return brandRepository.save(newBrand);
    }

    private ProductCategory seedCategoryIfNotFound(String code, String name) {
        Optional<ProductCategory> catOpt = categoryRepository.findByCode(code);
        if (catOpt.isPresent()) {
            return catOpt.get();
        }
        ProductCategory newCat = ProductCategory.builder()
                .code(code)
                .name(name)
                .status("APPROVED")
                .build();
        return categoryRepository.save(newCat);
    }
}
