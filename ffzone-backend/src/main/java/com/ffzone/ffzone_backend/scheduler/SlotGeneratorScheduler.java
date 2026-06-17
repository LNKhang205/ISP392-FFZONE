package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlotGeneratorScheduler {

    private final FieldRepository     fieldRepository;
    private final FieldSlotRepository fieldSlotRepository;

    /**
     * Mỗi slot dài 60 phút, cách nhau 15 phút (buffer dọn sân).
     * Khung giờ hoạt động: 05:00 → 23:45 (slot cuối 22:45-23:45).
     * Offset tính bằng phút kể từ 05:00, mỗi slot cách nhau 75 phút (60 + 15).
     * => 13 slot/ngày: 05:00, 06:15, 07:30, ... , 22:45
     */
    private static final int[] OFFSETS_MINUTES = {
        0, 75, 150, 225, 300, 375, 450, 525, 600, 675, 750, 825, 900
    };

    private static final LocalTime DAY_START = LocalTime.of(5, 0);
    private static final int SLOT_DURATION_MINUTES = 60;

    /** Số ngày luôn được giữ sẵn slot (rolling window) */
    private static final int ROLLING_WINDOW_DAYS = 7;

    /**
     * Chạy mỗi ngày lúc 00:05 sáng (giờ server).
     * Đảm bảo luôn có đủ slot cho 7 ngày tới (từ hôm nay) cho mọi sân ACTIVE.
     * An toàn khi chạy lại nhiều lần — dùng existsBy... để tránh tạo trùng.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void generateDailySlots() {
        log.info("SlotGeneratorScheduler: bắt đầu generate slot cho {} ngày tới", ROLLING_WINDOW_DAYS);

        List<Field> activeFields = fieldRepository.findByStatus(FieldStatus.ACTIVE);
        LocalDate today = LocalDate.now();

        int totalCreated = 0;
        for (Field field : activeFields) {
            for (int dayOffset = 0; dayOffset < ROLLING_WINDOW_DAYS; dayOffset++) {
                LocalDate targetDate = today.plusDays(dayOffset);
                totalCreated += generateSlotsForFieldAndDate(field, targetDate);
            }
        }

        log.info("SlotGeneratorScheduler: hoàn tất, tạo mới {} slot", totalCreated);
    }

    /**
     * Tạo slot cho 1 sân + 1 ngày cụ thể (nếu chưa tồn tại).
     * @return số slot mới được tạo
     */
    private int generateSlotsForFieldAndDate(Field field, LocalDate date) {
        int created = 0;
        for (int offsetMinutes : OFFSETS_MINUTES) {
            LocalTime startTime = DAY_START.plusMinutes(offsetMinutes);
            LocalTime endTime = startTime.plusMinutes(SLOT_DURATION_MINUTES);

            boolean exists = fieldSlotRepository
                .existsByFieldIdAndSlotDateAndStartTime(field.getId(), date, startTime);

            if (!exists) {
                FieldSlot slot = FieldSlot.builder()
                    .field(field)
                    .slotDate(date)
                    .startTime(startTime)
                    .endTime(endTime)
                    .status(SlotStatus.AVAILABLE)
                    .build();
                fieldSlotRepository.save(slot);
                created++;
            }
        }
        return created;
    }

    /**
     * Chạy 1 lần ngay khi ứng dụng khởi động (sau 10 giây) để đảm bảo
     * môi trường dev/test luôn có sẵn slot mà không cần chờ tới 00:05.
     */
    @Scheduled(initialDelay = 10_000, fixedDelay = Long.MAX_VALUE)
    @Transactional
    public void generateOnStartup() {
        log.info("SlotGeneratorScheduler: generate slot lần đầu khi khởi động ứng dụng");
        generateDailySlots();
    }
}
