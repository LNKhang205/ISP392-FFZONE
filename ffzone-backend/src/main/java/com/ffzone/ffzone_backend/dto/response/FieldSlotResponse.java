package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data @Builder
public class FieldSlotResponse {
    private UUID id;
    private UUID fieldId;
    private String fieldName;
    private LocalDate slotDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private SlotStatus status;

    public static FieldSlotResponse from(FieldSlot s) {
        return FieldSlotResponse.builder()
            .id(s.getId()).fieldId(s.getField().getId()).fieldName(s.getField().getName())
            .slotDate(s.getSlotDate()).startTime(s.getStartTime()).endTime(s.getEndTime())
            .status(s.getStatus()).build();
    }
}
