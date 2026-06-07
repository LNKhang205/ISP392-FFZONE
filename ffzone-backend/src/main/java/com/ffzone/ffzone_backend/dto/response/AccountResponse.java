package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class AccountResponse {
    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private AccountRole role;
    private String avatarUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static AccountResponse from(Account a) {
        return AccountResponse.builder()
            .id(a.getId()).fullName(a.getFullName()).email(a.getEmail())
            .phone(a.getPhone()).role(a.getRole()).avatarUrl(a.getAvatarUrl())
            .isActive(a.getIsActive()).createdAt(a.getCreatedAt()).build();
    }
}
