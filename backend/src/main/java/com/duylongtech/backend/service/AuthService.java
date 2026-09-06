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
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> response = restTemplate.getForObject(url, java.util.Map.class);
            if (response == null || !googleClientId.equals(response.get("aud"))) {
                throw new BusinessException(SystemMessage.INVALID_GOOGLE_TOKEN);
            }
            String email = (String) response.get("email");

            com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                    .orElseGet(() -> userRepository.findByUsername(email)
                            .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND)));
            
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
            throw new BusinessException(String.format(SystemMessage.AUTH_ERR_001.getMessage(), e.getMessage()));
        }
    }

    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final long OTP_EXPIRATION_MS = 5 * 60 * 1000L; // Hết hạn sau 5 phút
    private static final long OTP_REQUEST_COOLDOWN_MS = 60 * 1000L; // Giới hạn gửi lại sau 60 giây
    private static final java.security.SecureRandom SECURE_RANDOM = new java.security.SecureRandom();

    private final java.util.Map<String, String> otpStorage = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Long> otpExpiry = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Integer> otpAttempts = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Long> otpLastRequestTime = new java.util.concurrent.ConcurrentHashMap<>();

    public void requestOtp(String email) {
        com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        long now = System.currentTimeMillis();
        Long lastRequest = otpLastRequestTime.get(email);
        if (lastRequest != null && (now - lastRequest) < OTP_REQUEST_COOLDOWN_MS) {
            throw new BusinessException(SystemMessage.OTP_REQUEST_TOO_FAST);
        }

        // Sinh OTP 6 chữ số an toàn tuyệt đối với SecureRandom (từ 000000 đến 999999)
        int randomCode = SECURE_RANDOM.nextInt(1_000_000);
        String otp = String.format("%06d", randomCode);

        otpStorage.put(email, otp);
        otpExpiry.put(email, now + OTP_EXPIRATION_MS);
        otpAttempts.put(email, 0);
        otpLastRequestTime.put(email, now);

        // Gửi email kèm mã OTP
        emailService.sendResetPasswordEmail(email, otp);
    }

    public void verifyOtp(String email, String otp) {
        if (!otpStorage.containsKey(email) || !otpExpiry.containsKey(email)) {
            throw new BusinessException(SystemMessage.INVALID_OTP);
        }

        long now = System.currentTimeMillis();
        if (now > otpExpiry.get(email)) {
            clearOtpData(email);
            throw new BusinessException(SystemMessage.EXPIRED_OTP);
        }

        String expectedOtp = otpStorage.get(email);
        if (otp == null || !expectedOtp.equals(otp.trim())) {
            int currentAttempts = otpAttempts.getOrDefault(email, 0) + 1;
            otpAttempts.put(email, currentAttempts);

            if (currentAttempts >= MAX_OTP_ATTEMPTS) {
                clearOtpData(email);
                throw new BusinessException(SystemMessage.TOO_MANY_OTP_ATTEMPTS);
            }

            int remaining = MAX_OTP_ATTEMPTS - currentAttempts;
            throw new BusinessException(String.format("Mã OTP không chính xác. Bạn còn %d lần thử.", remaining));
        }
    }

    private void clearOtpData(String email) {
        otpStorage.remove(email);
        otpExpiry.remove(email);
        otpAttempts.remove(email);
    }

    public void resetPasswordWithOtp(String email, String otp, String newPassword) {
        verifyOtp(email, otp); // Kiểm tra lại OTP lần nữa cho chắc

        com.duylongtech.backend.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        realtimeSessionService.forceLogoutUser(user.getId(), "PASSWORD_RESET", "Mật khẩu của bạn vừa được thay đổi. Vui lòng đăng nhập lại.");

        // Xóa sạch OTP sau khi đổi pass thành công
        clearOtpData(email);
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
