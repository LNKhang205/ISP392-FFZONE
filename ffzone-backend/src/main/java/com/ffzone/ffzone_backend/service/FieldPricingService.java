package com.ffzone.ffzone_backend.service;
 
import com.ffzone.ffzone_backend.dto.request.FieldPricingRequest;
import com.ffzone.ffzone_backend.dto.response.FieldPricingResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
 
@Slf4j
@Service
@RequiredArgsConstructor
public class FieldPricingService {
 
    private final FieldPricingRepository pricingRepository;
    private final FieldRepository        fieldRepository;
    private final FieldSlotRepository    slotRepository;
    private final FieldService           fieldService;
    private final EntityManager          em;
 
    private static final LocalTime DEFAULT_OPEN  = LocalTime.of(5, 0);
    private static final LocalTime DEFAULT_CLOSE = LocalTime.of(23, 0);
    // Sync slot từ hôm nay đến 14 ngày tới (bao phủ window generate slot)
    private static final int SYNC_DAYS = 14;
 
    // ════════════════════════════════════════════════════════════
    // CÁC METHOD CŨ — GIỮ NGUYÊN
    // ════════════════════════════════════════════════════════════
 
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
                .startTime(req.getParsedStartTime())
                .endTime(req.getParsedEndTime())
                .effectiveFrom(req.getEffectiveFrom())
                .effectiveTo(req.getEffectiveTo())
                .isActive(true)
                .build();
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }
 
    @Transactional
    public FieldPricingResponse update(UUID id, FieldPricingRequest req) {
        FieldPricing pricing = getOrThrow(id);
        if (req.getPrice()           != null) pricing.setPrice(req.getPrice());
        if (req.getDayOfWeek()       != null) pricing.setDayOfWeek(req.getDayOfWeek());
        if (req.getParsedStartTime() != null) pricing.setStartTime(req.getParsedStartTime());
        if (req.getParsedEndTime()   != null) pricing.setEndTime(req.getParsedEndTime());
        if (req.getEffectiveFrom()   != null) pricing.setEffectiveFrom(req.getEffectiveFrom());
        if (req.getEffectiveTo()     != null) pricing.setEffectiveTo(req.getEffectiveTo());
        if (req.getIsActive()        != null) pricing.setIsActive(req.getIsActive());
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }
 
    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        pricingRepository.deleteById(id);
    }
 
    // ════════════════════════════════════════════════════════════
    // METHOD MỚI
    // ════════════════════════════════════════════════════════════
 
    @Transactional(readOnly = true)
    public List<FieldPricingResponse> findAll() {
        return pricingRepository.findAllWithField()
                .stream().map(FieldPricingResponse::from).toList();
    }
 
    public List<FieldPricingResponse> findCurrentHolidays() {
        LocalDate today   = LocalDate.now();
        LocalDate horizon = today.plusDays(30);
        return pricingRepository.findAllWithField().stream()
            .filter(p -> "HOLIDAY".equals(p.getDayOfWeek()) && Boolean.TRUE.equals(p.getIsActive()))
            .filter(p -> {
                LocalDate to   = p.getEffectiveTo();
                LocalDate from = p.getEffectiveFrom();
                return (to == null || !to.isBefore(today)) && !from.isAfter(horizon);
            })
            .collect(java.util.stream.Collectors.collectingAndThen(
                java.util.stream.Collectors.toMap(
                    p -> p.getHolidayName() + "__" + p.getEffectiveFrom() + "__" + p.getEffectiveTo(),
                    p -> p, (a, b) -> a, java.util.LinkedHashMap::new
                ),
                map -> map.values().stream().map(FieldPricingResponse::from).toList()
            ));
    }
 
    public List<FieldPricingResponse> findAllHolidays() {
        return pricingRepository.findAllWithField().stream()
                .filter(p -> "HOLIDAY".equals(p.getDayOfWeek()) && Boolean.TRUE.equals(p.getIsActive()))
                .map(FieldPricingResponse::from).toList();
    }
 
    /**
     * Tạo hoặc cập nhật giá bình thường cho 1 sân.
     *
     * Logic đúng:
     *  - KHÔNG xóa bản ghi cũ mà set effectiveTo = effectiveFrom - 1 ngày để giữ
     *    lịch sử và đảm bảo slot trước effectiveFrom vẫn hiển thị đúng giá cũ.
     *  - Insert bản ghi mới với effectiveFrom mong muốn.
     *  - Sync slot từ effectiveFrom (không hardcode today) để cập nhật đúng tất cả
     *    slot đã generate sẵn trong khoảng [effectiveFrom, today+SYNC_DAYS].
     */
    @Transactional
    public List<FieldPricingResponse> createOrUpdate(UUID fieldId, FieldPricingRequest req) {
        if (req.getWeekdayPrice() == null)
            throw AppException.badRequest("Vui lòng nhập giá ngày thường (weekdayPrice)");

        Field      field = getFieldOrThrow(fieldId);
        BigDecimal wd    = req.getWeekdayPrice();
        BigDecimal we    = calcWeekend(wd);
        LocalTime  open  = req.getParsedStartTime() != null ? req.getParsedStartTime() : DEFAULT_OPEN;
        LocalTime  close = req.getParsedEndTime()   != null ? req.getParsedEndTime()   : DEFAULT_CLOSE;
        LocalDate  from  = req.getEffectiveFrom()   != null ? req.getEffectiveFrom()   : LocalDate.now();
        LocalDate  to    = req.getEffectiveTo();

        // Đóng các bản ghi cũ WEEKDAY/WEEKEND bằng cách set effectiveTo = from - 1 day.
        // Chỉ đóng bản ghi còn hiệu lực tại thời điểm from (effectiveTo IS NULL hoặc >= from).
        // Không xóa để giữ lịch sử giá.
        LocalDate dayBeforeFrom = from.minusDays(1);
        expireByType(fieldId, "WEEKDAY", from, dayBeforeFrom);
        expireByType(fieldId, "WEEKEND", from, dayBeforeFrom);
        em.flush();

        FieldPricing wdP = pricingRepository.save(FieldPricing.builder()
                .field(field).price(wd).dayOfWeek("WEEKDAY")
                .startTime(open).endTime(close)
                .effectiveFrom(from).effectiveTo(to).isActive(true).build());

        FieldPricing weP = pricingRepository.save(FieldPricing.builder()
                .field(field).price(we).dayOfWeek("WEEKEND")
                .startTime(open).endTime(close)
                .effectiveFrom(from).effectiveTo(to).isActive(true).build());

        em.flush();

        // Sync từ effectiveFrom để cập nhật đúng slot đã generate sẵn trong tương lai.
        // Nếu effectiveFrom đã qua (quá khứ) thì chỉ sync từ hôm nay trở đi.
        LocalDate syncFrom = from.isBefore(LocalDate.now()) ? LocalDate.now() : from;
        LocalDate syncTo   = LocalDate.now().plusDays(SYNC_DAYS);
        syncSlotPrices(List.of(fieldId), syncFrom, syncTo);

        log.info("[Pricing] San {} -> WD:{} WE:{} tu {} (sync: {}->{})",
                field.getName(), wd, we, from, syncFrom, syncTo);
        return List.of(FieldPricingResponse.from(wdP), FieldPricingResponse.from(weP));
    }
 
    /**
     * Áp giá ngày lễ cho nhiều sân cùng lúc.
     * Sau khi lưu pricing → sync slot trong khoảng ngày lễ.
     */
    @Transactional
    public List<FieldPricingResponse> createHolidayBulk(FieldPricingRequest req) {
        if (req.getEffectiveFrom()      == null) throw AppException.badRequest("Cần effectiveFrom");
        if (req.getEffectiveTo()        == null) throw AppException.badRequest("Cần effectiveTo");
        if (req.getIncreasePercentage() == null) throw AppException.badRequest("Cần increasePercentage");
        if (req.getEffectiveTo().isBefore(req.getEffectiveFrom()))
            throw AppException.badRequest("effectiveTo phải sau effectiveFrom");
 
        List<Field> targets = resolveTargetFields(req);
        if (targets.isEmpty()) throw AppException.badRequest("Không tìm thấy sân nào phù hợp");
 
        BigDecimal multiplier = BigDecimal.ONE.add(
                req.getIncreasePercentage().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
 
        LocalTime  open        = req.getParsedStartTime() != null ? req.getParsedStartTime() : DEFAULT_OPEN;
        LocalTime  close       = req.getParsedEndTime()   != null ? req.getParsedEndTime()   : DEFAULT_CLOSE;
        String     holidayName = req.getHolidayName()     != null ? req.getHolidayName()     : "Ngày lễ";
 
        List<FieldPricingResponse> results = new ArrayList<>();
        List<UUID> fieldIds = new ArrayList<>();
 
        for (Field field : targets) {
            BigDecimal basePrice    = getCurrentWeekdayPrice(field);
            BigDecimal holidayPrice = basePrice.multiply(multiplier)
                    .divide(new BigDecimal("1000"), 0, RoundingMode.CEILING)
                    .multiply(new BigDecimal("1000"));
 
            results.add(FieldPricingResponse.from(pricingRepository.save(
                FieldPricing.builder()
                    .field(field).price(holidayPrice).dayOfWeek("HOLIDAY")
                    .startTime(open).endTime(close)
                    .effectiveFrom(req.getEffectiveFrom()).effectiveTo(req.getEffectiveTo())
                    .holidayName(holidayName).isActive(true).build()
            )));
            fieldIds.add(field.getId());
            log.info("[Holiday] Sân {} → {} ({} × {}%)",
                    field.getName(), holidayPrice, basePrice, req.getIncreasePercentage());
        }
 
        em.flush();
 
        // Sync slot trong khoảng ngày lễ — chỉ sync các ngày đã có slot
        LocalDate syncFrom = req.getEffectiveFrom().isBefore(LocalDate.now())
                ? LocalDate.now() : req.getEffectiveFrom();
        LocalDate syncTo   = req.getEffectiveTo();
        syncSlotPrices(fieldIds, syncFrom, syncTo);
 
        return results;
    }
 
    /**
     * Bulk apply giá ngày thường + cuối tuần cho nhiều sân.
     */
    @Transactional
    public int bulkApply(FieldPricingRequest req) {
        if (req.getWeekdayPrice() == null)
            throw AppException.badRequest("Vui lòng nhập giá ngày thường");
 
        List<Field> targets = resolveTargetFields(req);
        if (targets.isEmpty()) throw AppException.badRequest("Không tìm thấy sân nào");
 
        BigDecimal wd    = req.getWeekdayPrice();
        BigDecimal we    = calcWeekend(wd);
        LocalTime  open  = req.getParsedStartTime() != null ? req.getParsedStartTime() : DEFAULT_OPEN;
        LocalTime  close = req.getParsedEndTime()   != null ? req.getParsedEndTime()   : DEFAULT_CLOSE;
        LocalDate  from  = req.getEffectiveFrom()   != null ? req.getEffectiveFrom()   : LocalDate.now();
        LocalDate  to    = req.getEffectiveTo();

        LocalDate dayBeforeFrom = from.minusDays(1);
        for (Field field : targets) {
            expireByType(field.getId(), "WEEKDAY", from, dayBeforeFrom);
            expireByType(field.getId(), "WEEKEND", from, dayBeforeFrom);
        }
        em.flush();
 
        List<FieldPricing> toSave = new ArrayList<>();
        for (Field field : targets) {
            toSave.add(FieldPricing.builder()
                    .field(field).price(wd).dayOfWeek("WEEKDAY")
                    .startTime(open).endTime(close)
                    .effectiveFrom(from).effectiveTo(to).isActive(true).build());
            toSave.add(FieldPricing.builder()
                    .field(field).price(we).dayOfWeek("WEEKEND")
                    .startTime(open).endTime(close)
                    .effectiveFrom(from).effectiveTo(to).isActive(true).build());
            log.info("[BulkPricing] Sân {} → WD:{} WE:{} {}→{}", field.getName(), wd, we, open, close);
        }
        pricingRepository.saveAll(toSave);
        em.flush();
 
        // Sync từ effectiveFrom để bắt đúng slot đã generate sẵn trong tương lai.
        List<UUID> fieldIds = targets.stream().map(Field::getId).toList();
        LocalDate syncFrom = from.isBefore(LocalDate.now()) ? LocalDate.now() : from;
        syncSlotPrices(fieldIds, syncFrom, LocalDate.now().plusDays(SYNC_DAYS));
 
        return targets.size();
    }
 
    @Transactional
    public int updateHolidayDates(FieldPricingRequest req) {
        if (req.getHolidayName() == null || req.getHolidayName().isBlank())
            throw AppException.badRequest("Vui lòng nhập tên dịp lễ");
        if (req.getEffectiveFrom() == null || req.getEffectiveTo() == null)
            throw AppException.badRequest("Vui lòng nhập ngày bắt đầu và kết thúc");
        if (req.getEffectiveTo().isBefore(req.getEffectiveFrom()))
            throw AppException.badRequest("Ngày kết thúc phải sau ngày bắt đầu");
 
        List<FieldPricing> records = pricingRepository.findAllWithField().stream()
            .filter(p -> "HOLIDAY".equals(p.getDayOfWeek())
                      && req.getHolidayName().equals(p.getHolidayName()))
            .toList();

        records.forEach(p -> {
            p.setEffectiveFrom(req.getEffectiveFrom());
            p.setEffectiveTo(req.getEffectiveTo());
            p.setIsActive(true);
        });
        pricingRepository.saveAll(records);
        em.flush();

        // Sync slot khoảng ngày mới
        List<UUID> fieldIds = records.stream().map(p -> p.getField().getId()).toList();
        LocalDate syncFrom = req.getEffectiveFrom().isBefore(LocalDate.now())
                ? LocalDate.now() : req.getEffectiveFrom();
        syncSlotPrices(fieldIds, syncFrom, req.getEffectiveTo());
 
        return records.size();
    }
 
    // ════════════════════════════════════════════════════════════
    // SYNC SLOT — core logic
    // ════════════════════════════════════════════════════════════
 
    /**
     * Tính lại giá từng slot dựa trên pricing hiện tại (ưu tiên HOLIDAY > WEEKEND > WEEKDAY).
     * Chỉ sync slot AVAILABLE — không động vào slot đã đặt.
     */
    private void syncSlotPrices(List<UUID> fieldIds, LocalDate from, LocalDate to) {
        if (fieldIds == null || fieldIds.isEmpty()) return;
 
        // Load tất cả pricing active của các sân liên quan
        java.util.Map<UUID, List<FieldPricing>> pricingCache = new java.util.HashMap<>();
        for (UUID fid : fieldIds) {
            pricingCache.put(fid, pricingRepository.findByFieldIdAndIsActive(fid, true));
        }
 
        List<FieldSlot> slots = slotRepository.findByFieldIdsAndDateRange(fieldIds, from, to);
        List<FieldSlot> toUpdate = new ArrayList<>();
 
        for (FieldSlot slot : slots) {
            // Không đụng vào slot đã được đặt
            if (slot.getStatus() != com.ffzone.ffzone_backend.enums.SlotStatus.AVAILABLE) continue;
 
            UUID fid = slot.getField().getId();
            List<FieldPricing> pricings = pricingCache.getOrDefault(fid, List.of());
 
            BigDecimal newPrice = calcPriceForSlot(slot, pricings);
            if (newPrice.compareTo(slot.getPrice()) != 0) {
                slot.setPrice(newPrice);
                toUpdate.add(slot);
            }
        }
 
        if (!toUpdate.isEmpty()) {
            slotRepository.saveAll(toUpdate);
            log.info("[SyncSlot] Đã cập nhật {} slot ({} → {})", toUpdate.size(), from, to);
        }
    }
 
    /**
     * Tính giá đúng cho 1 slot dựa trên pricing list.
     * Ưu tiên: HOLIDAY (trong khoảng ngày) > WEEKEND/WEEKDAY (theo ngày trong tuần).
     */
    private BigDecimal calcPriceForSlot(FieldSlot slot, List<FieldPricing> pricings) {
        LocalDate date      = slot.getSlotDate();
        LocalTime startTime = slot.getStartTime();
        boolean   isWeekend = isWeekend(date);
 
        // Filter: còn hiệu lực + chứa giờ này
        List<FieldPricing> active = pricings.stream()
                .filter(p -> isInPeriod(p, date))
                .filter(p -> containsTime(p, startTime))
                .toList();
 
        // Ưu tiên 1: HOLIDAY
        FieldPricing holiday = findByDay(active, "HOLIDAY");
        if (holiday != null) return holiday.getPrice();
 
        // Ưu tiên 2: WEEKEND hoặc WEEKDAY đúng loại ngày
        FieldPricing direct = findByDay(active, isWeekend ? "WEEKEND" : "WEEKDAY");
        if (direct != null) return direct.getPrice();
 
        // Ưu tiên 3: nếu là cuối tuần mà chỉ có WEEKDAY → tự nhân 1.25
        FieldPricing weekday = findByDay(active, "WEEKDAY");
        if (isWeekend && weekday != null) return calcWeekend(weekday.getPrice());
 
        // Fallback: giá mặc định theo loại sân
        return defaultPrice(slot.getField());
    }
 
    // ════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════
 
    public static BigDecimal calcWeekend(BigDecimal weekday) {
        return weekday
                .multiply(new BigDecimal("1.25"))
                .divide(new BigDecimal("1000"), 0, RoundingMode.CEILING)
                .multiply(new BigDecimal("1000"));
    }
 
    private void deleteByType(UUID fieldId, String dayOfWeek) {
        List<FieldPricing> toDelete = pricingRepository.findByFieldIdAndIsActive(fieldId, true)
                .stream().filter(p -> dayOfWeek.equals(p.getDayOfWeek())).toList();
        if (!toDelete.isEmpty()) pricingRepository.deleteAll(toDelete);
    }

    /**
     * Đóng bản ghi giá cũ bằng cách set effectiveTo = closingDate thay vì xóa.
     * Dùng findByFieldIdAndIsActive để tránh lazy load p.getField().
     */
    private void expireByType(UUID fieldId, String dayOfWeek, LocalDate newFrom, LocalDate closingDate) {
        List<FieldPricing> toExpire = pricingRepository.findByFieldIdAndIsActive(fieldId, true)
                .stream()
                .filter(p -> dayOfWeek.equals(p.getDayOfWeek())
                          && p.getEffectiveFrom().isBefore(newFrom)
                          && (p.getEffectiveTo() == null || !p.getEffectiveTo().isBefore(newFrom)))
                .toList();
        toExpire.forEach(p -> p.setEffectiveTo(closingDate));
        if (!toExpire.isEmpty()) pricingRepository.saveAll(toExpire);
    }
 
    private BigDecimal getCurrentWeekdayPrice(Field field) {
        return pricingRepository.findByFieldIdAndIsActive(field.getId(), true).stream()
                .filter(p -> "WEEKDAY".equals(p.getDayOfWeek()))
                .map(FieldPricing::getPrice)
                .findFirst()
                .orElse(defaultPrice(field));
    }
 
    private BigDecimal defaultPrice(Field field) {
        if (field.getType() == null) return new BigDecimal("200000");
        return switch (field.getType()) {
            case SEVEN_VS_SEVEN -> new BigDecimal("240000");
            case NINE_VS_NINE   -> new BigDecimal("300000");
            default             -> new BigDecimal("200000");
        };
    }
 
    private boolean isWeekend(LocalDate date) {
        java.time.DayOfWeek d = date.getDayOfWeek();
        return d == java.time.DayOfWeek.SATURDAY || d == java.time.DayOfWeek.SUNDAY;
    }
 
    private boolean isInPeriod(FieldPricing p, LocalDate date) {
        if (p.getEffectiveFrom() != null && date.isBefore(p.getEffectiveFrom())) return false;
        if (p.getEffectiveTo()   != null && date.isAfter(p.getEffectiveTo()))    return false;
        return true;
    }
 
    private boolean containsTime(FieldPricing p, LocalTime t) {
        return !p.getStartTime().isAfter(t) && p.getEndTime().isAfter(t);
    }
 
    private FieldPricing findByDay(List<FieldPricing> list, String type) {
        return list.stream().filter(p -> type.equalsIgnoreCase(p.getDayOfWeek())).findFirst().orElse(null);
    }
 
    private List<Field> resolveTargetFields(FieldPricingRequest req) {
        if (req.getFieldIds() != null && !req.getFieldIds().isEmpty()) {
            return req.getFieldIds().stream().map(this::getFieldOrThrow).toList();
        }
        if (req.getFieldType() != null) {
            return fieldRepository.findAll().stream()
                    .filter(f -> f.getType() == req.getFieldType()).toList();
        }
        return fieldRepository.findAll();
    }
 
    private FieldPricing getOrThrow(UUID id) {
        return pricingRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Bảng giá không tồn tại: " + id));
    }
 
    private Field getFieldOrThrow(UUID fieldId) {
        return fieldRepository.findById(fieldId)
                .orElseThrow(() -> AppException.notFound("Sân không tồn tại: " + fieldId));
    }
}