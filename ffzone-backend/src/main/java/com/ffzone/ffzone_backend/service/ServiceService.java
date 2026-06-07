package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.ServiceRequest;
import com.ffzone.ffzone_backend.dto.response.ServiceResponse;
import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;

    public List<ServiceResponse> findAll() {
        return serviceRepository.findAll().stream().map(ServiceResponse::from).toList();
    }

    public List<ServiceResponse> findActive() {
        return serviceRepository.findByIsActive(true).stream().map(ServiceResponse::from).toList();
    }

    public ServiceResponse findById(UUID id) {
        return ServiceResponse.from(getOrThrow(id));
    }

    @Transactional
    public ServiceResponse create(ServiceRequest req) {
        if (serviceRepository.findByServiceType(req.getServiceType()).isPresent())
            throw AppException.conflict("Loại dịch vụ đã tồn tại: " + req.getServiceType());

        Service service = Service.builder()
            .name(req.getName()).serviceType(req.getServiceType())
            .description(req.getDescription()).price(req.getPrice())
            .imageUrl(req.getImageUrl()).isActive(true).build();
        return ServiceResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public ServiceResponse update(UUID id, ServiceRequest req) {
        Service service = getOrThrow(id);
        if (req.getName() != null)        service.setName(req.getName());
        if (req.getDescription() != null) service.setDescription(req.getDescription());
        if (req.getPrice() != null)       service.setPrice(req.getPrice());
        if (req.getImageUrl() != null)    service.setImageUrl(req.getImageUrl());
        if (req.getIsActive() != null)    service.setIsActive(req.getIsActive());
        return ServiceResponse.from(serviceRepository.save(service));
    }

    public Service getOrThrow(UUID id) {
        return serviceRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + id));
    }
}
