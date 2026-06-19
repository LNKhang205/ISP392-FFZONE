package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.ServiceRequest;
import com.ffzone.ffzone_backend.dto.response.ServiceResponse;
import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.enums.ServiceCategory;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.BookingServiceRepository;
import com.ffzone.ffzone_backend.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final BookingServiceRepository bookingServiceRepository;

    public List<ServiceResponse> findAll() {
        return serviceRepository.findAll().stream().map(ServiceResponse::from).toList();
    }

    public List<ServiceResponse> findActive() {
        return serviceRepository.findByIsActive(true).stream().map(ServiceResponse::from).toList();
    }

    public List<ServiceResponse> findByCategory(ServiceCategory category) {
        return serviceRepository.findByCategoryAndIsActive(category, true)
                .stream().map(ServiceResponse::from).toList();
    }

    public ServiceResponse findById(UUID id) {
        return ServiceResponse.from(getOrThrow(id));
    }

    @Transactional
    public ServiceResponse create(ServiceRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            throw AppException.badRequest("Tên dịch vụ không được để trống");
        if (req.getCategory() == null)
            throw AppException.badRequest("Danh mục dịch vụ không được để trống");
        if (req.getPrice() == null || req.getPrice().signum() < 0)
            throw AppException.badRequest("Giá dịch vụ không hợp lệ");

        Service service = Service.builder()
            .name(req.getName().trim())
            .category(req.getCategory())
            .description(req.getDescription())
            .price(req.getPrice())
            .imageUrl(req.getImageUrl())
            .isActive(req.getIsActive() != null ? req.getIsActive() : true)
            .build();
        return ServiceResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public ServiceResponse update(UUID id, ServiceRequest req) {
        Service service = getOrThrow(id);
        if (req.getName()        != null) service.setName(req.getName().trim());
        if (req.getCategory()    != null) service.setCategory(req.getCategory());
        if (req.getDescription() != null) service.setDescription(req.getDescription());
        if (req.getPrice()       != null) service.setPrice(req.getPrice());
        if (req.getImageUrl()    != null) service.setImageUrl(req.getImageUrl());
        if (req.getIsActive()    != null) service.setIsActive(req.getIsActive());
        return ServiceResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public ServiceResponse toggleActive(UUID id) {
        Service service = getOrThrow(id);
        service.setIsActive(!service.getIsActive());
        return ServiceResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public void delete(UUID id) {
        Service service = getOrThrow(id);
        // Đã từng gắn với Booking → soft delete (tắt hoạt động) để bảo toàn lịch sử
        if (bookingServiceRepository.existsByServiceId(id)) {
            service.setIsActive(false);
            serviceRepository.save(service);
        } else {
            serviceRepository.deleteById(id);
        }
    }

    public Service getOrThrow(UUID id) {
        return serviceRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + id));
    }
}
