package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.Gender;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phone;
    private Gender gender;
    private LocalDate dateOfBirth;
    private String avatarUrl;
}
