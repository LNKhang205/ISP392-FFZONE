package com.ffzone.ffzone_backend.service;
 
import com.ffzone.ffzone_backend.dto.request.ServiceRequest;
import com.ffzone.ffzone_backend.dto.response.ServiceResponse;
import com.ffzone.ffzone_backend.entity.Service;
import com.ffzone.ffzone_backend.enums.ServiceCategory;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.BookingServiceRepository;
import com.ffzone.ffzone_backend.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
 
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
 
@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {
 
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final String PUBLIC_URL_PREFIX = "uploads/service-images/";
 
    private final ServiceRepository serviceRepository;
    private final BookingServiceRepository bookingServiceRepository;
 
    @Value("${app.upload.service-images-dir:uploads/service-images}")
    private String serviceImagesDir;
 
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
            deletePhysicalImage(service.getImageUrl());
            serviceRepository.deleteById(id);
        }
    }
 
    /** Upload file ảnh cho 1 dịch vụ — ghi đè imageUrl hiện tại, giống cơ chế FieldImage. */
    @Transactional
    public ServiceResponse uploadImage(UUID id, MultipartFile file) {
        if (file == null || file.isEmpty())
            throw AppException.badRequest("Vui lòng chọn file ảnh");
 
        Service service = getOrThrow(id);
        String extension = getAllowedExtension(file.getOriginalFilename());
 
        String fileName = UUID.randomUUID() + extension;
        Path uploadDir = Paths.get(serviceImagesDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        if (!target.startsWith(uploadDir))
            throw AppException.badRequest("Invalid upload path");
 
        try {
            Files.createDirectories(uploadDir);
            file.transferTo(target);
        } catch (IOException ex) {
            throw new AppException("Could not store image file", HttpStatus.INTERNAL_SERVER_ERROR);
        }
 
        // Xóa ảnh cũ (nếu có) sau khi lưu ảnh mới thành công
        deletePhysicalImage(service.getImageUrl());
 
        service.setImageUrl(PUBLIC_URL_PREFIX + fileName);
        return ServiceResponse.from(serviceRepository.save(service));
    }
 
    private String getAllowedExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank())
            throw AppException.badRequest("Tên file ảnh không hợp lệ");
 
        String lower = originalFilename.toLowerCase(Locale.ROOT);
        return ALLOWED_EXTENSIONS.stream()
            .filter(lower::endsWith)
            .findFirst()
            .orElseThrow(() -> AppException.badRequest("Chỉ chấp nhận file jpg, jpeg, png, gif, webp"));
    }
 
    private void deletePhysicalImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(PUBLIC_URL_PREFIX)) return;
 
        String fileName = imageUrl.substring(PUBLIC_URL_PREFIX.length());
        Path uploadDir = Paths.get(serviceImagesDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        if (!target.startsWith(uploadDir)) return;
 
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Vẫn cho phép xóa DB record dù file vật lý lỗi
        }
    }
 
    public Service getOrThrow(UUID id) {
        return serviceRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + id));
    }
}
 