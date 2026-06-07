package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.enums.FieldType;
import lombok.Data;

@Data
public class FieldRequest {
    private String code;
    private String name;
    private FieldType type;
    private String description;
    private FieldStatus status;
}
