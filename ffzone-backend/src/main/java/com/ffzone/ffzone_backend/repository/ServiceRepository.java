package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.enums.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ServiceRepository extends JpaRepository<Service, UUID> {
    List<Service> findByIsActive(Boolean isActive);
    List<Service> findByCategory(ServiceCategory category);
    List<Service> findByCategoryAndIsActive(ServiceCategory category, Boolean isActive);
}
