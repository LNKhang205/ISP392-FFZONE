package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.ServiceCategory;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ServiceRequest {
    private String name;
    private ServiceCategory category;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private Boolean isActive;
}
