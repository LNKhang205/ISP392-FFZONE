package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.VoucherRequest;
import com.ffzone.ffzone_backend.dto.response.VoucherResponse;
import com.ffzone.ffzone_backend.entity.Voucher;
import com.ffzone.ffzone_backend.enums.VoucherStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    @Transactional
    public List<VoucherResponse> findAll() {
        LocalDateTime now = LocalDateTime.now();
        List<Voucher> vouchers = voucherRepository.findAll();
        boolean changed = false;
        for (Voucher v : vouchers) {
            if (v.getStatus() == VoucherStatus.ACTIVE && v.getEndDate().isBefore(now)) {
                v.setStatus(VoucherStatus.EXPIRED);
                voucherRepository.save(v);
                changed = true;
            }
        }
        if (changed) {
            voucherRepository.flush();
        }
        return vouchers.stream().map(VoucherResponse::from).toList();
    }

    @Transactional
    public List<VoucherResponse> findAvailable() {
        LocalDateTime now = LocalDateTime.now();
        List<Voucher> active = voucherRepository.findByStatus(VoucherStatus.ACTIVE);
        boolean changed = false;
        for (Voucher v : active) {
            if (v.getEndDate().isBefore(now)) {
                v.setStatus(VoucherStatus.EXPIRED);
                voucherRepository.save(v);
                changed = true;
            }
        }
        if (changed) {
            voucherRepository.flush();
        }
        return voucherRepository.findAvailable(now)
            .stream().map(VoucherResponse::from).toList();
    }

    public VoucherResponse findById(UUID id) {
        return VoucherResponse.from(getOrThrow(id));
    }

    @Transactional
    public VoucherResponse create(VoucherRequest req) {
        if (voucherRepository.existsByCode(req.getCode()))
            throw AppException.conflict("Mã voucher đã tồn tại: " + req.getCode());

        Voucher voucher = Voucher.builder()
            .code(req.getCode().toUpperCase())
            .voucherType(req.getVoucherType())
            .discountValue(req.getDiscountValue())
            .quantity(req.getQuantity())
            .usedQuantity(0)
            .startDate(req.getStartDate())
            .endDate(req.getEndDate())
            .status(VoucherStatus.ACTIVE)
            .build();
        return VoucherResponse.from(voucherRepository.save(voucher));
    }

    @Transactional
    public VoucherResponse update(UUID id, VoucherRequest req) {
        Voucher voucher = getOrThrow(id);
        if (req.getQuantity() != null)  voucher.setQuantity(req.getQuantity());
        if (req.getStartDate() != null) voucher.setStartDate(req.getStartDate());
        if (req.getEndDate() != null)   voucher.setEndDate(req.getEndDate());
        return VoucherResponse.from(voucherRepository.save(voucher));
    }

    @Transactional
    public void deactivate(UUID id) {
        Voucher voucher = getOrThrow(id);
        voucher.setStatus(VoucherStatus.INACTIVE);
        voucherRepository.save(voucher);
    }

    public Voucher getOrThrow(UUID id) {
        return voucherRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Voucher không tồn tại: " + id));
    }
}
