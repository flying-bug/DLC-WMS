package com.duylongtech.backend.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class UserDto {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private List<String> roles;
    private List<String> permissions;
}
