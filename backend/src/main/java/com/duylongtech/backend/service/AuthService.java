package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.response.JwtResponse;
import com.duylongtech.backend.security.JwtUtils;
import com.duylongtech.backend.security.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final com.duylongtech.backend.repository.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${google.client-id:YOUR_GOOGLE_CLIENT_ID}")
    private String googleClientId;

    public AuthService(AuthenticationManager authenticationManager, JwtUtils jwtUtils, com.duylongtech.backend.repository.UserRepository userRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(item -> item.getAuthority())
                .orElse("ROLE_USER");

        String jwt = jwtUtils.generateJwtToken(userDetails.getUsername(), role);

        return JwtResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .role(role)
                .build();
    }

    public JwtResponse loginWithGoogle(String token) {
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + token;
        try {
            java.util.Map<String, Object> response = restTemplate.getForObject(url, java.util.Map.class);
            if (response == null || !googleClientId.equals(response.get("aud"))) {
                throw new RuntimeException("Invalid Google Token");
            }
            String email = (String) response.get("email");
            
            com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại. Vui lòng liên hệ Admin"));
            
            String role = user.getRoles().stream()
                    .findFirst()
                    .map(r -> "ROLE_" + r.getCode())
                    .orElse("ROLE_USER");
            String jwt = jwtUtils.generateJwtToken(user.getUsername(), role);
            
            return JwtResponse.builder()
                    .token(jwt)
                    .id(user.getId())
                    .username(user.getUsername())
                    .role(role)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Google Login Failed: " + e.getMessage());
        }
    }

    public void forgotPassword(String email) {
        com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại."));
        
        // Sinh mật khẩu mới ngẫu nhiên (8 ký tự)
        String newPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Gửi email kèm mật khẩu mới
        emailService.sendResetPasswordEmail(email, newPassword);
    }

    public void changePassword(ChangePasswordRequest request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        com.duylongtech.backend.entity.User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại."));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
