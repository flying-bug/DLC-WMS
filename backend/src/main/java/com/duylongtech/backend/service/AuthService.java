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
import java.util.List;
import java.util.stream.Collectors;

public interface AuthService {
    JwtResponse login(LoginRequest request);
    JwtResponse loginWithGoogle(String token);
    void requestOtp(String email);
    void verifyOtp(String email, String otp);
    void resetPasswordWithOtp(String email, String otp, String newPassword);
    void changePassword(ChangePasswordRequest request);
}
