package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.UserVoucherResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.UserVoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-vouchers")
@RequiredArgsConstructor
public class UserVoucherController {

    private final UserVoucherService userVoucherService;

    @PostMapping("/claim/{voucherId}")
    public ResponseEntity<UserVoucherResponse> claim(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID voucherId) {
        return ResponseEntity.ok(userVoucherService.claim(account, voucherId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<UserVoucherResponse>> myVouchers(
            @AuthenticationPrincipal Account account) {
        return ResponseEntity.ok(userVoucherService.findByAccount(account));
    }
}