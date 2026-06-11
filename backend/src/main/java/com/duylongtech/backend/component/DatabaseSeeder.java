package com.duylongtech.backend.component;

import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

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
}
