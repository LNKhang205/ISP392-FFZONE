package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.enums.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data @Builder
public class ServiceResponse {
    private UUID id;
    private String name;
    private ServiceType serviceType;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private Boolean isActive;

    public static ServiceResponse from(Service s) {
        return ServiceResponse.builder()
            .id(s.getId()).name(s.getName()).serviceType(s.getServiceType())
            .description(s.getDescription()).price(s.getPrice())
            .imageUrl(s.getImageUrl()).isActive(s.getIsActive()).build();
    }
}
