package com.duylongtech.backend.config;

import com.duylongtech.backend.entity.Role;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("System Admin")
                    .email("admin@duylongtech.com")
                    .phone("0123456789")
                    .status("APPROVED")
                    .role(Role.SUPER_ADMIN)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            System.out.println("Tạo tài khoản mặc định thành công: admin / 123456");
        }
    }
}
