package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.service.SlotGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class SlotScheduler {

    private final SlotGeneratorService slotGeneratorService;  // thay FieldSlotService

    /** Mỗi ngày 00:05 GMT+7 — generate ngày mới nhất (today+13). */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void generateDailySlots() {
        LocalDate targetDate = LocalDate.now().plusDays(13);
        log.info("=== [SlotScheduler] Cron daily: generate slots ngày {} ===", targetDate);
        try {
            slotGeneratorService.generateForAllFields(targetDate);
        } catch (Exception e) {
            log.error("[SlotScheduler] Lỗi generate ngày {}: {}", targetDate, e.getMessage());
        }
    }

    /**
     * 3 giây sau khi backend khởi động — generate đủ 7 ngày.
     * Loop ngoài, mỗi ngày là 1 batch tx nhỏ → không giữ connection pool.
     */
    @Scheduled(initialDelay = 3000, fixedDelay = Long.MAX_VALUE)
    public void generateOnStartup() {
        log.info("=== [SlotScheduler] Startup: generate slots 14 ngày tới ===");
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 14; i++) {
            LocalDate date = today.plusDays(i);
            try {
                slotGeneratorService.generateForAllFields(date);
                log.info("[SlotScheduler] Xong ngày {}", date);
            } catch (Exception e) {
                log.error("[SlotScheduler] Lỗi ngày {}: {}", date, e.getMessage());
            }
        }
        log.info("=== [SlotScheduler] Startup xong ===");
    }
}
