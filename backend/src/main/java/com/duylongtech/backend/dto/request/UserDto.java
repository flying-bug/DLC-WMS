package com.duylongtech.backend.dto.request;

import lombok.Data;
import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
public class UserDto {
    private Long id;
    @NotBlank(message = "FIELD_REQUIRED")
    private String username;
    
    @NotBlank(message = "FIELD_REQUIRED")
    private String fullName;
    
    @NotBlank(message = "FIELD_REQUIRED")
    @Email(message = "INVALID_EMAIL")
    private String email;
    
    @NotBlank(message = "FIELD_REQUIRED")
    @Pattern(regexp = com.duylongtech.backend.constant.AppConstants.MOBILE_REGEX, message = "INVALID_PHONE")
    private String phone;
    private String status;
    private String avatarUrl;
    
    @NotBlank(message = "FIELD_REQUIRED")
    private String idCard;
    private java.time.LocalDate dob;
    private String gender;
    private java.time.LocalDate startDate;
    private String position;
    private String department;
    private String address;
    private List<String> roles;
    private List<String> permissions;
}
