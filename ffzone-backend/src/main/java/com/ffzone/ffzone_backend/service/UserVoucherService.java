package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.UserVoucherResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.entity.UserVoucher;
import com.ffzone.ffzone_backend.entity.Voucher;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.UserVoucherRepository;
import com.ffzone.ffzone_backend.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserVoucherService {

    private final UserVoucherRepository userVoucherRepository;
    private final VoucherRepository voucherRepository;

    @Transactional
    public UserVoucherResponse claim(Account account, UUID voucherId) {
        Voucher voucher = voucherRepository.findById(voucherId)
            .orElseThrow(() -> AppException.notFound("Voucher không tồn tại"));

        if (voucher.getStatus() != com.ffzone.ffzone_backend.enums.VoucherStatus.ACTIVE)
            throw AppException.badRequest("Voucher không hoạt động hoặc đã hết hạn");

        LocalDateTime now = LocalDateTime.now();
        if (voucher.getEndDate().isBefore(now))
            throw AppException.badRequest("Voucher đã hết thời gian nhận");

        if (userVoucherRepository.existsByAccountIdAndVoucherId(account.getId(), voucherId))
            throw AppException.conflict("Bạn đã nhận voucher này rồi");

        Voucher locked = voucherRepository.findByIdWithLock(voucherId)
            .orElseThrow(() -> AppException.notFound("Voucher không tồn tại"));

        if (locked.getUsedQuantity() >= locked.getQuantity())
            throw AppException.conflict("Voucher đã được phát hết");

        locked.setUsedQuantity(locked.getUsedQuantity() + 1);
        voucherRepository.save(locked);

        UserVoucher uv = UserVoucher.builder()
            .account(account)
            .voucher(locked)
            .isUsed(false)
            .build();
        userVoucherRepository.save(uv);

        return UserVoucherResponse.from(uv);
    }

    @Transactional(readOnly = true)
    public List<UserVoucherResponse> findByAccount(Account account) {
        return userVoucherRepository.findByAccountId(account.getId())
            .stream().map(UserVoucherResponse::from).toList();
    }
}