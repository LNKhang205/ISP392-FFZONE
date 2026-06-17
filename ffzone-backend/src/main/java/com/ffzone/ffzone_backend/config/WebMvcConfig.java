package com.ffzone.ffzone_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.field-images-dir:uploads/field-images}")
    private String fieldImagesDir;

    @Value("${app.upload.avatars-dir:uploads/avatars}")
    private String avatarsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get(fieldImagesDir).toAbsolutePath().normalize();
        String resourceLocation = uploadDir.toUri().toString();
        if (!resourceLocation.endsWith("/")) {
            resourceLocation += "/";
        }

        registry.addResourceHandler("/uploads/field-images/**")
            .addResourceLocations(resourceLocation);

        Path avatarDir = Paths.get(avatarsDir).toAbsolutePath().normalize();
        String avatarResourceLocation = avatarDir.toUri().toString();
        if (!avatarResourceLocation.endsWith("/")) {
            avatarResourceLocation += "/";
        }

        registry.addResourceHandler("/uploads/avatars/**")
            .addResourceLocations(avatarResourceLocation);
    }
}
