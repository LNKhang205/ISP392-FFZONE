package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.AccountRole;
import lombok.Data;

@Data
public class AccountRequest {
    private String fullName;
    private String email;
    private String phone;
    private String password;
    private AccountRole role;
    private String avatarUrl;
    private Boolean isActive;
}
