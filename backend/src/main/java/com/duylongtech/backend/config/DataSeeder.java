package com.duylongtech.backend.config;

import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.UserRepository;
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

    public DataSeeder(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
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

        if (userRepository.findByUsername("admin").isEmpty()) {
            RoleEntity superAdminRole = roleRepository.findByCode("SUPER_ADMIN").orElseThrow();
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
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            System.out.println("Tạo tài khoản mặc định thành công: admin / 123456");
        }
    }
}
