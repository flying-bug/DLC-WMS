package com.duylongtech.backend.security;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService, JwtAuthenticationFilter jwtAuthFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.ASYNC, DispatcherType.FORWARD)
                        .permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/login-google",
                                "/api/v1/auth/forgot-password/**",
                                "/api/v1/imports/ocr-session/**",
                                "/api/v1/einvoices/preview/**",
                                "/api/v1/email/google/callback",
                                "/error",
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/swagger-resources",
                                "/swagger-resources/**",
                                "/configuration/ui",
                                "/configuration/security",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/webjars/**")
                        .permitAll()
                        // Phân hệ Kế toán / Mua hàng / Bán hàng / Hóa đơn: Chặn Thủ quỹ và các vai trò không phận sự
                        .requestMatchers("/api/v1/purchase-orders/**").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        .requestMatchers("/api/v1/sales-orders/**").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        .requestMatchers("/api/v1/einvoices/**").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        // Thu chi: Lập, sửa, xóa chứng từ thuộc trách nhiệm Kế toán và Quản trị
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments/receipts", "/api/v1/payments/vouchers").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/payments/**").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/payments/**").hasAnyRole("ACCOUNTANT", "MANAGER", "SUPER_ADMIN")
                        // Ghi sổ / Bỏ ghi sổ quỹ: Chỉ Thủ quỹ và Quản trị
                        .requestMatchers("/api/v1/payments/*/post", "/api/v1/payments/*/unpost").hasAnyRole("CASHIER_CONTROLLER", "MANAGER", "SUPER_ADMIN")
                        .requestMatchers("/api/v1/ai/**").authenticated()
                        .anyRequest().authenticated());

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
