package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import com.ffzone.ffzone_backend.enums.AuthProvider;
import com.ffzone.ffzone_backend.enums.Gender;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
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
    private AuthProvider provider;
    private Gender gender;
    private LocalDate dateOfBirth;

    public static AccountResponse from(Account a) {
        return AccountResponse.builder()
            .id(a.getId()).fullName(a.getFullName()).email(a.getEmail())
            .phone(a.getPhone()).role(a.getRole()).avatarUrl(a.getAvatarUrl())
            .isActive(a.getIsActive()).createdAt(a.getCreatedAt())
            .provider(a.getProvider())
            .gender(a.getGender())
            .dateOfBirth(a.getDateOfBirth())
            .build();
    }
}
