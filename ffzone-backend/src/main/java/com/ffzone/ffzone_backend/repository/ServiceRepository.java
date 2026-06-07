package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.enums.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServiceRepository extends JpaRepository<Service, UUID> {
    Optional<Service> findByServiceType(ServiceType serviceType);
    List<Service> findByIsActive(Boolean isActive);
}
