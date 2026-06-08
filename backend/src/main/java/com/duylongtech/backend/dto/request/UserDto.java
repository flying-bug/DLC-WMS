package com.duylongtech.backend.dto.request;

import lombok.Data;

@Data
public class UserDto {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String status;
}
