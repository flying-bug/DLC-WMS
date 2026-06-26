package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.JwtResponse;
import com.duylongtech.backend.security.JwtUtils;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.exception.BusinessException;
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
    private final RealtimeSessionService realtimeSessionService;

    @org.springframework.beans.factory.annotation.Value("${google.client-id:YOUR_GOOGLE_CLIENT_ID}")
    private String googleClientId;

    public AuthService(AuthenticationManager authenticationManager, JwtUtils jwtUtils, com.duylongtech.backend.repository.UserRepository userRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, EmailService emailService, RealtimeSessionService realtimeSessionService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.realtimeSessionService = realtimeSessionService;
    }

    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String role = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .filter(auth -> auth.startsWith("ROLE_"))
                .findFirst()
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
                throw new BusinessException(SystemMessage.INVALID_GOOGLE_TOKEN);
            }
            String email = (String) response.get("email");

            com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
            
            if (!"APPROVED".equalsIgnoreCase(user.getStatus())) {
                throw new BusinessException(SystemMessage.USER_LOCKED);
            }

            String role = user.getRoles().stream()
                    .findFirst()
                    .map(r -> {
                        String code = r.getCode();
                        return code.startsWith("ROLE_") ? code : "ROLE_" + code;
                    })
                    .orElse("ROLE_USER");
            String jwt = jwtUtils.generateJwtToken(user.getUsername(), role);

            return JwtResponse.builder()
                    .token(jwt)
                    .id(user.getId())
                    .username(user.getUsername())
                    .role(role)
                    .build();
        } catch (Exception e) {
            if (e instanceof BusinessException) {
                throw (BusinessException) e;
            }
            throw new BusinessException("Google Login Failed: " + e.getMessage());
        }
    }

    private final java.util.Map<String, String> otpStorage = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Long> otpExpiry = new java.util.concurrent.ConcurrentHashMap<>();

    public void requestOtp(String email) {
        com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        
        // Sinh OTP 6 chữ số ngẫu nhiên
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        otpStorage.put(email, otp);
        otpExpiry.put(email, System.currentTimeMillis() + 5 * 60 * 1000); // Hết hạn sau 5 phút

        // Gửi email kèm mã OTP
        emailService.sendResetPasswordEmail(email, otp);
    }

    public void verifyOtp(String email, String otp) {
        if (!otpStorage.containsKey(email) || !otpStorage.get(email).equals(otp)) {
            throw new BusinessException(SystemMessage.INVALID_OTP);
        }
        if (System.currentTimeMillis() > otpExpiry.get(email)) {
            otpStorage.remove(email);
            otpExpiry.remove(email);
            throw new BusinessException(SystemMessage.EXPIRED_OTP);
        }
    }

    public void resetPasswordWithOtp(String email, String otp, String newPassword) {
        verifyOtp(email, otp); // Kiểm tra lại OTP lần nữa cho chắc

        com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        realtimeSessionService.forceLogoutUser(user.getId(), "PASSWORD_RESET", "Mat khau cua ban vua duoc thay doi. Vui long dang nhap lai.");

        // Xóa OTP sau khi đổi pass thành công
        otpStorage.remove(email);
        otpExpiry.remove(email);
    }

    public void changePassword(ChangePasswordRequest request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        com.duylongtech.backend.entity.User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BusinessException(SystemMessage.WRONG_PASSWORD);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        realtimeSessionService.forceLogoutUser(user.getId(), "PASSWORD_CHANGED", "Mat khau cua ban vua duoc thay doi. Vui long dang nhap lai.");
    }
}
