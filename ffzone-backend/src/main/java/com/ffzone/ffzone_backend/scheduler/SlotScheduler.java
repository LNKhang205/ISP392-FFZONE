package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.service.FieldSlotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlotScheduler {

    private final FieldSlotService slotService;

    /**
     * Chạy mỗi ngày lúc 00:05 — generate slots cho 7 ngày tới.
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void generateSlotsForNextDays() {
        log.info("=== [SlotScheduler] Generate slots hàng ngày ===");
        generateNext7Days();
    }

    /**
     * Chạy 5 giây sau khi backend khởi động — đảm bảo luôn có slot.
     */
    @Scheduled(initialDelay = 5000, fixedDelay = Long.MAX_VALUE)
    public void generateOnStartup() {
        log.info("=== [SlotScheduler] Startup: generate slots 7 ngày tới ===");
        generateNext7Days();
    }

    private void generateNext7Days() {
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 7; i++) {
            LocalDate date = today.plusDays(i);
            try {
                slotService.generateSlotsForAllFields(date);
            } catch (Exception e) {
                log.error("Lỗi generate slot ngày {}: {}", date, e.getMessage());
            }
        }
    }
}
