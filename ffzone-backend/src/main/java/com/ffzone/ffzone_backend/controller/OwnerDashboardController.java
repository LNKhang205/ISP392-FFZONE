package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.OwnerDashboardResponse;
import com.ffzone.ffzone_backend.service.OwnerDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/owner")
@RequiredArgsConstructor
public class OwnerDashboardController {

    private final OwnerDashboardService ownerDashboardService;

    /**
     * GET /api/owner/dashboard?period=today|week|month
     * Yêu cầu role OWNER hoặc IT_ADMIN (cấu hình trong SecurityConfig).
     */
    @GetMapping("/dashboard")
    public ResponseEntity<OwnerDashboardResponse> getDashboard(
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(ownerDashboardService.getDashboard(period));
    }
}
