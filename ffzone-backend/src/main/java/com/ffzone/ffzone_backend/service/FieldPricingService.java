package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.FieldPricingRequest;
import com.ffzone.ffzone_backend.dto.response.FieldPricingResponse;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class FieldPricingService {

    private final FieldPricingRepository pricingRepository;
    private final FieldService fieldService;

    public List<FieldPricingResponse> findByField(UUID fieldId) {
        return pricingRepository.findByFieldIdAndIsActive(fieldId, true)
            .stream().map(FieldPricingResponse::from).toList();
    }

    public FieldPricingResponse findById(UUID id) {
        return FieldPricingResponse.from(getOrThrow(id));
    }

    @Transactional
    public FieldPricingResponse create(FieldPricingRequest req) {
        FieldPricing pricing = FieldPricing.builder()
            .field(fieldService.getOrThrow(req.getFieldId()))
            .price(req.getPrice())
            .dayOfWeek(req.getDayOfWeek())
            .startTime(req.getStartTime())
            .endTime(req.getEndTime())
            .effectiveFrom(req.getEffectiveFrom())
            .effectiveTo(req.getEffectiveTo())
            .isActive(true)
            .build();
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }

    @Transactional
    public FieldPricingResponse update(UUID id, FieldPricingRequest req) {
        FieldPricing pricing = getOrThrow(id);
        if (req.getPrice() != null)        pricing.setPrice(req.getPrice());
        if (req.getDayOfWeek() != null)    pricing.setDayOfWeek(req.getDayOfWeek());
        if (req.getStartTime() != null)    pricing.setStartTime(req.getStartTime());
        if (req.getEndTime() != null)      pricing.setEndTime(req.getEndTime());
        if (req.getEffectiveFrom() != null) pricing.setEffectiveFrom(req.getEffectiveFrom());
        if (req.getEffectiveTo() != null)  pricing.setEffectiveTo(req.getEffectiveTo());
        if (req.getIsActive() != null)     pricing.setIsActive(req.getIsActive());
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }

    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        pricingRepository.deleteById(id);
    }

    private FieldPricing getOrThrow(UUID id) {
        return pricingRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Bảng giá không tồn tại: " + id));
    }
}
