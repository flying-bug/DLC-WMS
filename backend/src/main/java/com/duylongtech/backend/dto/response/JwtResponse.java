package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JwtResponse {
    @Builder.Default
    private String type = "Bearer";
    private String token;
    private Long id;
    private String username;
    private String fullName;
    private String role;
    private List<String> roles;
    private List<String> permissions;
}
