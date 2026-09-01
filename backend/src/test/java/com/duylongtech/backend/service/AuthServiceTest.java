package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.JwtResponse;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.security.JwtUtils;
import com.duylongtech.backend.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String GOOGLE_CLIENT_ID = "dlc-client.apps.googleusercontent.com";

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtils jwtUtils;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private RealtimeSessionService realtimeSessionService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                jwtUtils,
                userRepository,
                passwordEncoder,
                emailService,
                realtimeSessionService
        );
        ReflectionTestUtils.setField(authService, "googleClientId", GOOGLE_CLIENT_ID);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void login_validCredentials_returnsJwtWithFirstRoleAuthority() {
        LoginRequest request = loginRequest("manager", "secret");
        UserDetailsImpl details = new UserDetailsImpl(
                10L,
                "manager",
                "encoded",
                true,
                List.of(new SimpleGrantedAuthority("PRODUCT_VIEW"), new SimpleGrantedAuthority("ROLE_MANAGER"))
        );
        Authentication authentication = Mockito.mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(details);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtUtils.generateJwtToken("manager", "ROLE_MANAGER")).thenReturn("jwt-manager");

        JwtResponse result = authService.login(request);

        ArgumentCaptor<UsernamePasswordAuthenticationToken> tokenCaptor =
                ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
        verify(authenticationManager).authenticate(tokenCaptor.capture());
        assertAll(
                () -> assertEquals("manager", tokenCaptor.getValue().getPrincipal()),
                () -> assertEquals("secret", tokenCaptor.getValue().getCredentials()),
                () -> assertSame(authentication, SecurityContextHolder.getContext().getAuthentication()),
                () -> assertEquals("jwt-manager", result.getToken()),
                () -> assertEquals(10L, result.getId()),
                () -> assertEquals("manager", result.getUsername()),
                () -> assertEquals("ROLE_MANAGER", result.getRole())
        );
    }

    @Test
    void login_noRoleAuthority_usesRoleUserFallback() {
        LoginRequest request = loginRequest("staff", "secret");
        UserDetailsImpl details = new UserDetailsImpl(
                11L,
                "staff",
                "encoded",
                true,
                List.of(new SimpleGrantedAuthority("PRODUCT_VIEW"))
        );
        Authentication authentication = Mockito.mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(details);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtUtils.generateJwtToken("staff", "ROLE_USER")).thenReturn("jwt-staff");

        JwtResponse result = authService.login(request);

        assertEquals("ROLE_USER", result.getRole());
        assertEquals("jwt-staff", result.getToken());
    }

    @Test
    void login_badCredentials_propagatesAuthenticationException() {
        LoginRequest request = loginRequest("manager", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.login(request)
        );

        assertEquals("Bad credentials", exception.getMessage());
        verifyNoInteractions(jwtUtils, userRepository, passwordEncoder, emailService, realtimeSessionService);
        assertEquals(null, SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void loginWithGoogle_invalidAudience_throwsBusinessException() {
        Map<String, Object> tokenInfo = Map.of("aud", "another-client", "email", "user@dlc.vn");

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authService.loginWithGoogle("invalid-audience-token")
            );

            assertEquals("Google Token không hợp lệ.", exception.getMessage());
            verifyNoInteractions(userRepository, jwtUtils);
        }
    }

    @Test
    void loginWithGoogle_nullTokenInfo_throwsBusinessException() {
        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(null)) {
            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authService.loginWithGoogle("empty-response-token")
            );

            assertSame(SystemMessage.INVALID_GOOGLE_TOKEN, exception.getSystemMessage());
            verifyNoInteractions(userRepository, jwtUtils);
        }
    }

    @Test
    void loginWithGoogle_userDoesNotExist_throwsBusinessException() {
        Map<String, Object> tokenInfo = Map.of("aud", GOOGLE_CLIENT_ID, "email", "missing@dlc.vn");
        when(userRepository.findByEmail("missing@dlc.vn")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("missing@dlc.vn")).thenReturn(Optional.empty());

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authService.loginWithGoogle("valid-google-token")
            );

            assertEquals("Không tìm thấy tài khoản trong hệ thống.", exception.getMessage());
            verifyNoInteractions(jwtUtils);
        }
    }

    @Test
    void loginWithGoogle_lockedUser_throwsBusinessException() {
        Map<String, Object> tokenInfo = Map.of("aud", GOOGLE_CLIENT_ID, "email", "locked@dlc.vn");
        User user = user("locked", "locked@dlc.vn", "INACTIVE", "STAFF");
        when(userRepository.findByEmail("locked@dlc.vn")).thenReturn(Optional.of(user));

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authService.loginWithGoogle("valid-google-token")
            );

            assertEquals("Tài khoản đã bị khóa hoặc chưa được phê duyệt.", exception.getMessage());
            verifyNoInteractions(jwtUtils);
        }
    }

    @Test
    void loginWithGoogle_approvedUser_normalizesRoleAndReturnsJwt() {
        Map<String, Object> tokenInfo = Map.of("aud", GOOGLE_CLIENT_ID, "email", "manager@dlc.vn");
        User user = user("manager", "manager@dlc.vn", "approved", "MANAGER");
        when(userRepository.findByEmail("manager@dlc.vn")).thenReturn(Optional.of(user));
        when(jwtUtils.generateJwtToken("manager", "ROLE_MANAGER")).thenReturn("jwt-google");

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            JwtResponse result = authService.loginWithGoogle("valid-google-token");

            assertAll(
                    () -> assertEquals("jwt-google", result.getToken()),
                    () -> assertEquals(10L, result.getId()),
                    () -> assertEquals("manager", result.getUsername()),
                    () -> assertEquals("ROLE_MANAGER", result.getRole())
            );
        }
    }

    @Test
    void loginWithGoogle_emailLookupMisses_usesUsernameAndKeepsPrefixedRole() {
        Map<String, Object> tokenInfo = Map.of("aud", GOOGLE_CLIENT_ID, "email", "admin@dlc.vn");
        User user = user("admin", "admin@dlc.vn", "APPROVED", "ROLE_ADMIN");
        when(userRepository.findByEmail("admin@dlc.vn")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("admin@dlc.vn")).thenReturn(Optional.of(user));
        when(jwtUtils.generateJwtToken("admin", "ROLE_ADMIN")).thenReturn("jwt-admin");

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            JwtResponse result = authService.loginWithGoogle("valid-google-token");

            assertAll(
                    () -> assertEquals("jwt-admin", result.getToken()),
                    () -> assertEquals(10L, result.getId()),
                    () -> assertEquals("admin", result.getUsername()),
                    () -> assertEquals("ROLE_ADMIN", result.getRole())
            );
            verify(userRepository).findByEmail("admin@dlc.vn");
            verify(userRepository).findByUsername("admin@dlc.vn");
        }
    }

    @Test
    void loginWithGoogle_approvedUserWithoutRoles_usesRoleUserFallback() {
        Map<String, Object> tokenInfo = Map.of("aud", GOOGLE_CLIENT_ID, "email", "staff@dlc.vn");
        User user = User.builder()
                .id(12L)
                .username("staff")
                .email("staff@dlc.vn")
                .status("APPROVED")
                .roles(Set.of())
                .build();
        when(userRepository.findByEmail("staff@dlc.vn")).thenReturn(Optional.of(user));
        when(jwtUtils.generateJwtToken("staff", "ROLE_USER")).thenReturn("jwt-staff");

        try (MockedConstruction<RestTemplate> ignored = mockGoogleTokenInfo(tokenInfo)) {
            JwtResponse result = authService.loginWithGoogle("valid-google-token");

            assertEquals("ROLE_USER", result.getRole());
            assertEquals("jwt-staff", result.getToken());
        }
    }

    @Test
    void loginWithGoogle_transportFailure_wrapsException() {
        try (MockedConstruction<RestTemplate> ignored = Mockito.mockConstruction(
                RestTemplate.class,
                (mock, context) -> when(mock.getForObject(any(String.class), Mockito.eq(Map.class)))
                        .thenThrow(new RestClientException("connection timeout"))
        )) {
            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authService.loginWithGoogle("google-token")
            );

            assertEquals("Google Login Failed: connection timeout", exception.getMessage());
            verifyNoInteractions(userRepository, jwtUtils);
        }
    }

    @Test
    void requestOtp_userDoesNotExist_throwsBusinessException() {
        when(userRepository.findByEmail("missing@dlc.vn")).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.requestOtp("missing@dlc.vn")
        );

        assertEquals("Không tìm thấy tài khoản trong hệ thống.", exception.getMessage());
        verifyNoInteractions(emailService);
    }

    @Test
    void requestOtp_existingUser_storesSixDigitOtpAndEmailsIt() {
        when(userRepository.findByEmail("user@dlc.vn"))
                .thenReturn(Optional.of(user("user", "user@dlc.vn", "APPROVED", "STAFF")));

        authService.requestOtp("user@dlc.vn");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendResetPasswordEmail(Mockito.eq("user@dlc.vn"), otpCaptor.capture());
        String otp = otpCaptor.getValue();
        assertAll(
                () -> assertTrue(otp.matches("\\d{6}")),
                () -> assertEquals(otp, otpStorage().get("user@dlc.vn")),
                () -> assertTrue(otpExpiry().get("user@dlc.vn") > System.currentTimeMillis())
        );
    }

    @Test
    void verifyOtp_missingOrWrongOtp_throwsBusinessException() {
        otpStorage().put("user@dlc.vn", "123456");
        otpExpiry().put("user@dlc.vn", System.currentTimeMillis() + 60_000);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.verifyOtp("user@dlc.vn", "654321")
        );

        assertTrue(exception.getMessage().contains("Mã OTP không chính xác"));
    }

    @Test
    void verifyOtp_expiredOtp_removesOtpAndThrowsBusinessException() {
        otpStorage().put("user@dlc.vn", "123456");
        otpExpiry().put("user@dlc.vn", System.currentTimeMillis() - 1);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.verifyOtp("user@dlc.vn", "123456")
        );

        assertAll(
                () -> assertTrue(exception.getMessage().contains("hết hạn")),
                () -> assertFalse(otpStorage().containsKey("user@dlc.vn")),
                () -> assertFalse(otpExpiry().containsKey("user@dlc.vn"))
        );
    }

    @Test
    void verifyOtp_validOtp_returnsNormallyAndKeepsOtpUntilReset() {
        otpStorage().put("user@dlc.vn", "123456");
        otpExpiry().put("user@dlc.vn", System.currentTimeMillis() + 60_000);

        authService.verifyOtp("user@dlc.vn", "123456");

        assertEquals("123456", otpStorage().get("user@dlc.vn"));
        assertTrue(otpExpiry().containsKey("user@dlc.vn"));
    }

    @Test
    void resetPasswordWithOtp_invalidOtp_doesNotChangePassword() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.resetPasswordWithOtp("user@dlc.vn", "000000", "NewSecret123")
        );

        assertTrue(exception.getMessage().contains("Mã OTP không chính xác"));
        verifyNoInteractions(passwordEncoder, realtimeSessionService);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPasswordWithOtp_validOtpButMissingUser_throwsBusinessException() {
        seedValidOtp("user@dlc.vn", "123456");
        when(userRepository.findByEmail("user@dlc.vn")).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.resetPasswordWithOtp("user@dlc.vn", "123456", "NewSecret123")
        );

        assertEquals("Không tìm thấy tài khoản trong hệ thống.", exception.getMessage());
        verifyNoInteractions(passwordEncoder, realtimeSessionService);
    }

    @Test
    void resetPasswordWithOtp_validData_updatesHashLogsOutAndConsumesOtp() {
        seedValidOtp("user@dlc.vn", "123456");
        User user = user("user", "user@dlc.vn", "APPROVED", "STAFF");
        when(userRepository.findByEmail("user@dlc.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecret123")).thenReturn("encoded-new-password");

        authService.resetPasswordWithOtp("user@dlc.vn", "123456", "NewSecret123");

        assertEquals("encoded-new-password", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(realtimeSessionService).forceLogoutUser(
                eq(10L),
                eq("PASSWORD_RESET"),
                anyString()
        );
        assertFalse(otpStorage().containsKey("user@dlc.vn"));
        assertFalse(otpExpiry().containsKey("user@dlc.vn"));
    }

    @Test
    void changePassword_authenticatedUserDoesNotExist_throwsBusinessException() {
        authenticateAs("missing");
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.changePassword(changePasswordRequest("Old123", "New123"))
        );

        assertEquals("Không tìm thấy tài khoản trong hệ thống.", exception.getMessage());
        verifyNoInteractions(passwordEncoder, realtimeSessionService);
    }

    @Test
    void changePassword_wrongOldPassword_throwsBusinessException() {
        authenticateAs("user");
        User user = user("user", "user@dlc.vn", "APPROVED", "STAFF");
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Wrong123", "encoded-old-password")).thenReturn(false);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.changePassword(changePasswordRequest("Wrong123", "New123"))
        );

        assertEquals("Mật khẩu cũ không chính xác.", exception.getMessage());
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
        verifyNoInteractions(realtimeSessionService);
    }

    @Test
    void changePassword_validData_updatesHashAndForcesLogout() {
        authenticateAs("user");
        User user = user("user", "user@dlc.vn", "APPROVED", "STAFF");
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Old123", "encoded-old-password")).thenReturn(true);
        when(passwordEncoder.encode("New123")).thenReturn("encoded-new-password");

        authService.changePassword(changePasswordRequest("Old123", "New123"));

        assertEquals("encoded-new-password", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(realtimeSessionService).forceLogoutUser(
                10L,
                "PASSWORD_CHANGED",
                "Mat khau cua ban vua duoc thay doi. Vui long dang nhap lai."
        );
    }

    private MockedConstruction<RestTemplate> mockGoogleTokenInfo(Map<String, Object> tokenInfo) {
        return Mockito.mockConstruction(
                RestTemplate.class,
                (mock, context) -> when(mock.getForObject(any(String.class), Mockito.eq(Map.class)))
                        .thenReturn(tokenInfo)
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> otpStorage() {
        return (Map<String, String>) ReflectionTestUtils.getField(authService, "otpStorage");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Long> otpExpiry() {
        return (Map<String, Long>) ReflectionTestUtils.getField(authService, "otpExpiry");
    }

    private void seedValidOtp(String email, String otp) {
        otpStorage().put(email, otp);
        otpExpiry().put(email, System.currentTimeMillis() + 60_000);
    }

    private static LoginRequest loginRequest(String username, String password) {
        LoginRequest request = new LoginRequest();
        request.setUsername(username);
        request.setPassword(password);
        return request;
    }

    private static ChangePasswordRequest changePasswordRequest(String oldPassword, String newPassword) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword(oldPassword);
        request.setNewPassword(newPassword);
        return request;
    }

    private static User user(String username, String email, String status, String roleCode) {
        return User.builder()
                .id(10L)
                .username(username)
                .email(email)
                .passwordHash("encoded-old-password")
                .fullName("DLC User")
                .status(status)
                .roles(Set.of(RoleEntity.builder().id(1L).code(roleCode).name(roleCode).status("APPROVED").build()))
                .build();
    }

    private static void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of())
        );
    }
}
