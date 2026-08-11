package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PermissionRepository;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.constant.SystemMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private CloudinaryService cloudinaryService;
    @Mock
    private EmailService emailService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                roleRepository,
                passwordEncoder,
                permissionRepository,
                cloudinaryService,
                emailService
        );
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateCurrentUserProfile_updatesOnlyNameAndPhone() {
        RoleEntity staffRole = RoleEntity.builder().code("ROLE_STAFF").name("Nhan vien").build();
        User user = User.builder()
                .id(7L)
                .username("staff")
                .passwordHash("encoded")
                .fullName("Ten cu")
                .avatarUrl("https://cdn.example.com/avatar.png")
                .email("old@example.com")
                .phone("0912345678")
                .status("APPROVED")
                .roles(Set.of(staffRole))
                .build();
        UserDto request = new UserDto();
        request.setFullName("  Ten moi  ");
        request.setPhone(" 0987 654 321 ");
        request.setEmail("changed@example.com");
        request.setRoles(List.of("ROLE_SUPER_ADMIN"));

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new UserDetailsImpl(7L, "staff", "encoded", true, List.of()),
                null,
                List.of()
        ));
        when(userRepository.findWithRolesById(7L)).thenReturn(Optional.of(user));
        when(userRepository.existsByPhoneAndIdNot("0987654321", 7L)).thenReturn(false);
        when(userRepository.save(user)).thenReturn(user);

        UserDetailResponseDTO result = userService.updateCurrentUserProfile(request);

        assertEquals("Ten moi", result.getFullName());
        assertEquals("0987654321", result.getPhone());
        assertEquals("old@example.com", result.getEmail());
        assertEquals("ROLE_STAFF", result.getRoles().get(0).getCode());
        verify(userRepository).save(user);
    }

    @Test
    void getAllUsers_returnsAvatarUrl() {
        User user = User.builder()
                .id(7L)
                .username("staff")
                .fullName("Ten nhan vien")
                .avatarUrl("https://cdn.example.com/avatar.png")
                .email("staff@example.com")
                .phone("0912345678")
                .status("APPROVED")
                .roles(Set.of())
                .build();
        when(userRepository.findAll()).thenReturn(List.of(user));

        List<UserDto> result = userService.getAllUsers();

        assertEquals("https://cdn.example.com/avatar.png", result.get(0).getAvatarUrl());
    }

    @Test
    void createUser_generatesPasswordAndEmailsCredentials() {
        RoleEntity staffRole = RoleEntity.builder().code("ROLE_STAFF").name("Nhan vien").build();
        UserDto request = new UserDto();
        request.setUsername("staff01");
        request.setFullName("Nguyen Van A");
        request.setEmail("staff01@example.com");
        request.setPhone("0912345678");
        request.setIdCard("012345678901");

        when(passwordEncoder.encode(anyString())).thenReturn("encoded-temp-password");
        when(roleRepository.findByCode("STAFF")).thenReturn(Optional.of(staffRole));
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        UserDto result = userService.createUser(request);

        assertEquals(10L, result.getId());
        verify(passwordEncoder).encode(org.mockito.ArgumentMatchers.matches("[A-HJ-NP-Za-km-z2-9]{12}"));
        verify(emailService).sendNewEmployeeCredentialsEmail(
                org.mockito.Mockito.eq("staff01@example.com"),
                org.mockito.Mockito.eq("Nguyen Van A"),
                org.mockito.Mockito.eq("staff01"),
                org.mockito.ArgumentMatchers.matches("[A-HJ-NP-Za-km-z2-9]{12}")
        );
    }

    @Test
    void updateCurrentUserProfile_rejectsInvalidFullName() {
        User user = User.builder()
                .id(7L)
                .username("staff")
                .passwordHash("encoded")
                .fullName("Ten cu")
                .email("old@example.com")
                .phone("0912345678")
                .status("APPROVED")
                .roles(Set.of())
                .build();
        UserDto request = new UserDto();
        request.setFullName("Nguyen 123");
        request.setPhone("0912345678");

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new UserDetailsImpl(7L, "staff", "encoded", true, List.of()),
                null,
                List.of()
        ));
        when(userRepository.findWithRolesById(7L)).thenReturn(Optional.of(user));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.updateCurrentUserProfile(request));

        assertSame(SystemMessage.INVALID_FULL_NAME, exception.getSystemMessage());
        verify(userRepository, never()).save(user);
    }
}
