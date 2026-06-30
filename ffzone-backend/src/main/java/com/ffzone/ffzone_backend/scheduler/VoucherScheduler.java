package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.entity.Voucher;
import com.ffzone.ffzone_backend.enums.VoucherStatus;
import com.ffzone.ffzone_backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
2. * Tự động quét và cập nhật trạng thái voucher đã quá ngày hết hạn sang EXPIRED.
3. * Chạy mỗi 1 phút để đồng bộ hóa trạng thái voucher tự động.
4. */
@Slf4j
@Component
@RequiredArgsConstructor
public class VoucherScheduler {

    private final VoucherRepository voucherRepository;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void checkExpiredVouchers() {
        LocalDateTime now = LocalDateTime.now();
        List<Voucher> active = voucherRepository.findByStatus(VoucherStatus.ACTIVE);
        int count = 0;
        for (Voucher v : active) {
            if (v.getEndDate().isBefore(now)) {
                v.setStatus(VoucherStatus.EXPIRED);
                voucherRepository.save(v);
                count++;
                log.info("[VoucherScheduler] Voucher {} đã hết hạn (endDate: {}). Đổi trạng thái sang EXPIRED.",
                        v.getCode(), v.getEndDate());
            }
        }
        if (count > 0) {
            log.info("[VoucherScheduler] Đã tự động cập nhật trạng thái hết hạn cho {} voucher.", count);
        }
    }
}
