package com.ffzone.ffzone_backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum FieldType {
    FIVE_VS_FIVE("5V5"),
    SEVEN_VS_SEVEN("7V7"),
    ELEVEN_VS_ELEVEN("11V11");

    private final String dbValue;

    FieldType(String dbValue) {
        this.dbValue = dbValue;
    }

    @JsonValue
    public String getDbValue() {
        return dbValue;
    }

    @JsonCreator
    public static FieldType fromValue(String value) {
        for (FieldType type : values()) {
            if (type.dbValue.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown FieldType: " + value);
    }

    // JPA Converter để đọc/ghi DB đúng giá trị "5V5", "7V7", "11V11"
    @Converter(autoApply = true)
    public static class FieldTypeConverter implements AttributeConverter<FieldType, String> {
        @Override
        public String convertToDatabaseColumn(FieldType attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public FieldType convertToEntityAttribute(String dbData) {
            return dbData == null ? null : FieldType.fromValue(dbData);
        }
    }
}
