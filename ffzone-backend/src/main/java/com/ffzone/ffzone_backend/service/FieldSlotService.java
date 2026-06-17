package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.FieldSlotResponse;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FieldSlotService {

    private final FieldSlotRepository slotRepository;

    public List<FieldSlotResponse> findByFieldAndDate(UUID fieldId, LocalDate date) {
        return slotRepository.findByFieldIdAndSlotDate(fieldId, date)
            .stream().map(FieldSlotResponse::from).toList();
    }

    public List<FieldSlotResponse> findAvailableByFieldAndDate(UUID fieldId, LocalDate date) {
        return slotRepository.findByFieldIdAndSlotDateAndStatus(fieldId, date, SlotStatus.AVAILABLE)
            .stream().map(FieldSlotResponse::from).toList();
    }

    public List<FieldSlotResponse> findByFieldAndDateRange(UUID fieldId, LocalDate from, LocalDate to) {
        if (to.isAfter(from.plusDays(7)))
            throw AppException.badRequest("Chỉ xem lịch tối đa 7 ngày");
        return slotRepository.findByFieldIdAndDateRange(fieldId, from, to)
            .stream().map(FieldSlotResponse::from).toList();
    }

    public FieldSlotResponse findById(UUID id) {
        return FieldSlotResponse.from(getOrThrow(id));
    }

    public FieldSlot getOrThrow(UUID id) {
        return slotRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Slot không tồn tại: " + id));
    }
}
