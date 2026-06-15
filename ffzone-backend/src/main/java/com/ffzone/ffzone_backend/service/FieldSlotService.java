package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.FieldSlotResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FieldSlotService {

    private final FieldSlotRepository    slotRepository;
    private final FieldRepository        fieldRepository;
    private final FieldPricingRepository pricingRepository;

    private static final int PLAY_MINUTES  = 60;
    private static final int BREAK_MINUTES = 15;
    private static final int SLOT_STEP     = PLAY_MINUTES + BREAK_MINUTES; // 75 phút

    // ── Public API ─────────────────────────────────────────────

    @Transactional
    public List<FieldSlotResponse> findAllByDate(LocalDate date) {
        fieldRepository.findAll().forEach(f -> ensureSlotsGenerated(f, date));
        return slotRepository.findBySlotDateOrderByStartTime(date)
                .stream().map(FieldSlotResponse::from).toList();
    }

    @Transactional
    public List<FieldSlotResponse> findByFieldAndDate(UUID fieldId, LocalDate date) {
        Field field = getFieldOrThrow(fieldId);
        ensureSlotsGenerated(field, date);
        return slotRepository.findByFieldIdAndSlotDate(fieldId, date)
                .stream().map(FieldSlotResponse::from).toList();
    }

    public List<FieldSlotResponse> findAvailableByFieldAndDate(UUID fieldId, LocalDate date) {
        Field field = getFieldOrThrow(fieldId);
        ensureSlotsGenerated(field, date);
        return slotRepository.findByFieldIdAndSlotDateAndStatus(fieldId, date, SlotStatus.AVAILABLE)
                .stream().map(FieldSlotResponse::from).toList();
    }

    @Transactional
    public List<FieldSlotResponse> findByFieldAndDateRange(UUID fieldId, LocalDate from, LocalDate to) {
        if (to.isAfter(from.plusDays(7)))
            throw AppException.badRequest("Chỉ xem lịch tối đa 7 ngày");
        Field field = getFieldOrThrow(fieldId);
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1))
            ensureSlotsGenerated(field, d);
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

    // ── Public generate (dùng bởi Scheduler) ───────────────────

    @Transactional
    public void generateSlotsForAllFields(LocalDate date) {
        fieldRepository.findAll().forEach(f -> ensureSlotsGenerated(f, date));
    }

    @Transactional
    public void generateSlotsForField(Field field, LocalDate date) {
        ensureSlotsGenerated(field, date);
    }

    /** Xóa slot AVAILABLE rồi generate lại — dùng khi pricing thay đổi */
    @Transactional
    public void regenerateSlotsForField(UUID fieldId, LocalDate date) {
        if (date.isBefore(LocalDate.now())) return;
        Field field = getFieldOrThrow(fieldId);
        // Chỉ xóa slot AVAILABLE, giữ nguyên BOOKED
        slotRepository.deleteByFieldIdAndSlotDateAndStatus(fieldId, date, SlotStatus.AVAILABLE);
        ensureSlotsGenerated(field, date);
    }

    // ── Auto-generate logic ─────────────────────────────────────

    private void ensureSlotsGenerated(Field field, LocalDate date) {
        if (date.isBefore(LocalDate.now())) return;
        if (slotRepository.existsByFieldIdAndSlotDate(field.getId(), date)) return;

        DayOfWeek dow = date.getDayOfWeek();
        boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);
        String dayType = isWeekend ? "WEEKEND" : "WEEKDAY";

        List<FieldPricing> allActive = pricingRepository
                .findByFieldIdAndIsActive(field.getId(), true)
                .stream()
                .filter(p -> isInEffectivePeriod(p, date))
                .toList();

        // Lọc theo đúng dayType trước
        List<FieldPricing> pricings = allActive.stream()
                .filter(p -> matchesDay(p, dayType))
                .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                .toList();

        // Nếu không có pricing cho ngày này → fallback dùng WEEKDAY (áp dụng cuối tuần)
        if (pricings.isEmpty() && isWeekend) {
            pricings = allActive.stream()
                    .filter(p -> matchesDay(p, "WEEKDAY"))
                    .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                    .toList();
            if (!pricings.isEmpty())
                log.info("Field {} has no WEEKEND pricing, fallback to WEEKDAY pricing", field.getName());
        }

        if (pricings.isEmpty()) {
            log.info("No pricing for field {} on {} ({}), skip", field.getName(), date, dayType);
            return;
        }

        List<FieldSlot> toSave = new ArrayList<>();
        for (FieldPricing pricing : pricings) {
            LocalTime cursor     = pricing.getStartTime();
            LocalTime pricingEnd = pricing.getEndTime();
            while (!cursor.plusMinutes(PLAY_MINUTES).isAfter(pricingEnd)) {
                LocalTime slotEnd = cursor.plusMinutes(PLAY_MINUTES);
                boolean exists = slotRepository.existsByFieldIdAndSlotDateAndStartTime(
                        field.getId(), date, cursor);
                if (!exists) {
                    toSave.add(FieldSlot.builder()
                            .field(field)
                            .slotDate(date)
                            .startTime(cursor)
                            .endTime(slotEnd)
                            .status(SlotStatus.AVAILABLE)
                            .build());
                }
                cursor = cursor.plusMinutes(SLOT_STEP);
            }
        }

        if (!toSave.isEmpty()) {
            slotRepository.saveAll(toSave);
            log.info("Generated {} slots for field {} on {}", toSave.size(), field.getName(), date);
        }
    }

    private boolean isInEffectivePeriod(FieldPricing p, LocalDate date) {
        if (p.getEffectiveFrom() != null && date.isBefore(p.getEffectiveFrom())) return false;
        if (p.getEffectiveTo()   != null && date.isAfter(p.getEffectiveTo()))     return false;
        return true;
    }

    private boolean matchesDay(FieldPricing p, String dayType) {
        String dow = p.getDayOfWeek();
        if (dow == null || dow.isBlank() || "ALL".equalsIgnoreCase(dow)) return true;
        return dow.equalsIgnoreCase(dayType);
    }

    private Field getFieldOrThrow(UUID fieldId) {
        return fieldRepository.findById(fieldId)
                .orElseThrow(() -> AppException.notFound("Sân không tồn tại: " + fieldId));
    }
}
