package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AssignRolesRequest {
    
    @NotNull(message = "Mã nhân viên là bắt buộc")
    private Long userId;
    
    private List<Long> roleIds;
}
