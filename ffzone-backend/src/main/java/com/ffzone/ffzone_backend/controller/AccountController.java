package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.AccountRequest;
import com.ffzone.ffzone_backend.dto.request.ChangePasswordRequest;
import com.ffzone.ffzone_backend.dto.request.UpdateProfileRequest;
import com.ffzone.ffzone_backend.dto.response.AccountResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAll() {
        return ResponseEntity.ok(accountService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(accountService.findById(id));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@RequestBody AccountRequest req) {
        AccountResponse created = accountService.create(req);
        return ResponseEntity.created(URI.create("/api/accounts/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountResponse> update(@PathVariable UUID id, @RequestBody AccountRequest req) {
        return ResponseEntity.ok(accountService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        accountService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    // ── My Profile (self-service — any authenticated account, CUSTOMER-only UI is enforced on frontend) ──
    @PutMapping("/me/profile")
    public ResponseEntity<AccountResponse> updateMyProfile(
            @AuthenticationPrincipal Account account,
            @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(accountService.updateMyProfile(account, req));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changeMyPassword(
            @AuthenticationPrincipal Account account,
            @Valid @RequestBody ChangePasswordRequest req) {
        accountService.changePassword(account, req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AccountResponse> uploadMyAvatar(
            @AuthenticationPrincipal Account account,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountService.uploadMyAvatar(account, file));
    }
}
