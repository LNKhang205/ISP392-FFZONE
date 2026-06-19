-- ============================================================
--  FFZone Venue Booking System — Database Schema v5
--  Database : PostgreSQL 16
--  Encoding : UTF-8
--
--  THAY ĐỔI SO VỚI v4:
--    - KHÔNG dùng PostgreSQL native ENUM type nữa.
--      Tất cả cột trạng thái/loại dùng VARCHAR + CHECK constraint,
--      khớp với @Enumerated(EnumType.STRING) trong entity Java.
--      (native enum gây lỗi "operator does not exist: varchar = enum"
--       khi Hibernate chạy ddl-auto=update)
--    - FieldType lưu nguyên tên Java enum: FIVE_VS_FIVE / SEVEN_VS_SEVEN /
--      NINE_VS_NINE (không lưu "5V5"/"7V7"/"9V9").
--    - Khớp chính xác từng cột NOT NULL với entity hiện tại
--      (Account.provider, Account.providerId, v.v.)
--
--  Cách dùng:
--    1. Tạo database:  CREATE DATABASE ffzone OWNER ffzone;
--    2. Kết nối:       \c ffzone
--    3. Chạy file:     \i ffzone_schema_v5.sql
--
--  Sau khi chạy file này, để Spring Boot ddl-auto=update sẽ không cần
--  tạo lại bảng — chỉ validate/alter nếu entity thay đổi thêm cột.
-- ============================================================
 
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- cho gen_random_uuid()
 
 
-- ============================================================
--  MASTER DATA
-- ============================================================
 
CREATE TABLE IF NOT EXISTS account (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(255),
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER'
                  CHECK (role IN ('USER','STAFF','OWNER','IT_ADMIN')),
    avatar_url    VARCHAR(500),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    provider      VARCHAR(20)  NOT NULL DEFAULT 'LOCAL'
                  CHECK (provider IN ('LOCAL','GOOGLE')),
    provider_id   VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_email UNIQUE (email),
    CONSTRAINT uq_account_phone UNIQUE (phone)
);
 
CREATE TABLE IF NOT EXISTS token_blacklist (
    id          BIGSERIAL    PRIMARY KEY,
    token_jti   VARCHAR(100) NOT NULL,
    account_id  UUID         NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    expired_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_token_jti UNIQUE (token_jti)
);
 
CREATE TABLE IF NOT EXISTS fields (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(20)  NOT NULL DEFAULT 'FIVE_VS_FIVE'
                CHECK (type IN ('FIVE_VS_FIVE','SEVEN_VS_SEVEN','NINE_VS_NINE')),
    description TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE')),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fields_code UNIQUE (code)
);
 
CREATE TABLE IF NOT EXISTS field_images (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id     UUID         NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    image_url    VARCHAR(500) NOT NULL,
    is_thumbnail BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);
 
-- day_of_week: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' (lưu String tự do, không enum)
CREATE TABLE IF NOT EXISTS field_pricing (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id       UUID          NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    price          NUMERIC(12,0) NOT NULL,
    day_of_week    VARCHAR(10)   NOT NULL CHECK (day_of_week IN ('WEEKDAY','WEEKEND','HOLIDAY')),
    start_time     TIME          NOT NULL,
    end_time       TIME          NOT NULL,
    effective_from DATE          NOT NULL,
    effective_to   DATE,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    holiday_name   VARCHAR(100),
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pricing_times CHECK (start_time < end_time),
    CONSTRAINT chk_pricing_dates CHECK (effective_to IS NULL OR effective_from <= effective_to)
);
 
CREATE TABLE IF NOT EXISTS services (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100)  NOT NULL,
    service_type VARCHAR(20)   NOT NULL CHECK (service_type IN ('BALL_RENTAL','BIB_RENTAL')),
    description  TEXT,
    price        NUMERIC(12,0) NOT NULL DEFAULT 0,
    image_url    VARCHAR(500),
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_type UNIQUE (service_type),
    CONSTRAINT chk_service_price CHECK (price >= 0)
);
 
CREATE TABLE IF NOT EXISTS vouchers (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(50)   NOT NULL,
    voucher_type   VARCHAR(10)   NOT NULL DEFAULT 'PERCENT'
                   CHECK (voucher_type IN ('PERCENT','FIXED')),
    discount_value NUMERIC(12,0) NOT NULL,
    quantity       INT           NOT NULL,
    used_quantity  INT           NOT NULL DEFAULT 0,
    start_date     TIMESTAMP     NOT NULL,
    end_date       TIMESTAMP     NOT NULL,
    status         VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE','INACTIVE','EXPIRED')),
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_voucher_code      UNIQUE (code),
    CONSTRAINT chk_voucher_qty      CHECK (used_quantity <= quantity),
    CONSTRAINT chk_voucher_qty_pos  CHECK (quantity > 0),
    CONSTRAINT chk_voucher_dates    CHECK (start_date < end_date),
    CONSTRAINT chk_discount_value   CHECK (discount_value > 0)
);
 
 
-- ============================================================
--  TRANSACTION DATA
-- ============================================================
 
-- 15 slot/sân/ngày: 05:00 → 22:30 (start), bước 75 phút (60 chơi + 15 nghỉ)
CREATE TABLE IF NOT EXISTS field_slots (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id   UUID          NOT NULL REFERENCES fields(id),
    slot_date  DATE          NOT NULL,
    start_time TIME          NOT NULL,
    end_time   TIME          NOT NULL,
    price      NUMERIC(12,0) NOT NULL DEFAULT 0,
    status     VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE'
               CHECK (status IN ('AVAILABLE','PENDING','OCCUPIED')),
    version    INT           NOT NULL DEFAULT 0,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_field_slot  UNIQUE (field_id, slot_date, start_time),
    CONSTRAINT chk_slot_times CHECK (start_time < end_time)
);
 
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code        VARCHAR(30)    NOT NULL,
    account_id          UUID           NOT NULL REFERENCES account(id),
    field_id            UUID           NOT NULL REFERENCES fields(id),
    voucher_id          UUID           REFERENCES vouchers(id),
    status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING_PAYMENT'
                        CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS',
                                           'COMPLETED','CANCELLED','REFUND_PENDING','REFUNDED')),
    field_amount        NUMERIC(12,0)  NOT NULL DEFAULT 0,
    service_amount      NUMERIC(12,0)  NOT NULL DEFAULT 0,
    compensation_amount NUMERIC(12,0)  NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,0)  NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,0)  NOT NULL DEFAULT 0,
    payment_deadline    TIMESTAMP,
    checkin_at          TIMESTAMP,
    checkout_at         TIMESTAMP,
    note                TEXT,
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_booking_code UNIQUE (booking_code),
    CONSTRAINT chk_booking_amounts CHECK (
        field_amount        >= 0 AND
        service_amount      >= 0 AND
        compensation_amount >= 0 AND
        discount_amount     >= 0 AND
        total_amount        >= 0
    ),
    CONSTRAINT chk_discount_cap CHECK (discount_amount <= field_amount)
);
 
CREATE TABLE IF NOT EXISTS booking_slots (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id    UUID          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    field_slot_id UUID          NOT NULL REFERENCES field_slots(id),
    booked_price  NUMERIC(12,0) NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_booking_slot  UNIQUE (field_slot_id),
    CONSTRAINT chk_booked_price CHECK (booked_price >= 0)
);
 
CREATE TABLE IF NOT EXISTS payments (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id         UUID          NOT NULL REFERENCES bookings(id),
    amount             NUMERIC(12,0) NOT NULL,
    payment_method     VARCHAR(10)   NOT NULL DEFAULT 'VNPAY',
    status             VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
    vnp_txn_ref        VARCHAR(100),
    vnp_response_code  VARCHAR(10),
    vnp_transaction_no VARCHAR(100),
    paid_at            TIMESTAMP,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_booking  UNIQUE (booking_id),
    CONSTRAINT uq_payment_txn_ref  UNIQUE (vnp_txn_ref),
    CONSTRAINT chk_payment_amount  CHECK (amount > 0)
);
 
CREATE TABLE IF NOT EXISTS booking_services (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id    UUID          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id    UUID          NOT NULL REFERENCES services(id),
    quantity      INT           NOT NULL DEFAULT 1,
    unit_price    NUMERIC(12,0) NOT NULL,
    total_price   NUMERIC(12,0) NOT NULL,
    cancel_reason TEXT,
    cancelled_at  TIMESTAMP,
    added_by      UUID          REFERENCES account(id),
    note          TEXT,
    CONSTRAINT chk_bs_quantity    CHECK (quantity > 0),
    CONSTRAINT chk_bs_unit_price  CHECK (unit_price >= 0),
    CONSTRAINT chk_bs_total_price CHECK (total_price = unit_price * quantity)
);
 
CREATE TABLE IF NOT EXISTS refunds (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID          NOT NULL REFERENCES bookings(id),
    cancel_type    VARCHAR(20)   NOT NULL
                   CHECK (cancel_type IN ('USER_CANCEL','STAFF_CANCEL','MAINTENANCE','SYSTEM_EXPIRE')),
    refund_percent INT           NOT NULL DEFAULT 0,
    refund_amount  NUMERIC(12,0) NOT NULL DEFAULT 0,
    status         VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
    requested_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    processed_by   UUID          REFERENCES account(id),
    processed_at   TIMESTAMP,
    note           TEXT,
    CONSTRAINT uq_refund_booking  UNIQUE (booking_id),
    CONSTRAINT chk_refund_percent CHECK (refund_percent IN (0, 100)),
    CONSTRAINT chk_refund_amount  CHECK (refund_amount >= 0)
);
 
CREATE TABLE IF NOT EXISTS user_vouchers (
    id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID      NOT NULL REFERENCES account(id),
    voucher_id UUID      NOT NULL REFERENCES vouchers(id),
    is_used    BOOLEAN   NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    used_at    TIMESTAMP,
    CONSTRAINT uq_user_voucher UNIQUE (account_id, voucher_id)
);
 
 
-- ============================================================
--  INDEXES
-- ============================================================
 
CREATE INDEX IF NOT EXISTS idx_account_email        ON account(email);
CREATE INDEX IF NOT EXISTS idx_account_role         ON account(role);
 
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti  ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_exp  ON token_blacklist(expired_at);
 
CREATE INDEX IF NOT EXISTS idx_fields_code          ON fields(code);
CREATE INDEX IF NOT EXISTS idx_fields_status        ON fields(status);
 
CREATE INDEX IF NOT EXISTS idx_pricing_field_active ON field_pricing(field_id, is_active);
 
-- hot path: tìm lịch trống theo sân + ngày
CREATE INDEX IF NOT EXISTS idx_fieldslot_field_date ON field_slots(field_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_field_date_st  ON field_slots(field_id, slot_date, status);
CREATE INDEX IF NOT EXISTS idx_slots_date           ON field_slots(slot_date);
 
CREATE INDEX IF NOT EXISTS idx_bookings_account     ON bookings(account_id);
CREATE INDEX IF NOT EXISTS idx_bookings_field       ON bookings(field_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_code        ON bookings(booking_code);
-- partial index dùng varchar literal, không cast enum -> không lỗi 42883
CREATE INDEX IF NOT EXISTS idx_bookings_deadline    ON bookings(payment_deadline)
    WHERE status = 'PENDING_PAYMENT';
 
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_txn_ref     ON payments(vnp_txn_ref);
 
CREATE INDEX IF NOT EXISTS idx_vouchers_code        ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status      ON vouchers(status);
 
CREATE INDEX IF NOT EXISTS idx_uv_account           ON user_vouchers(account_id);
CREATE INDEX IF NOT EXISTS idx_uv_voucher           ON user_vouchers(voucher_id);
 
CREATE INDEX IF NOT EXISTS idx_refunds_status       ON refunds(status);
 
CREATE INDEX IF NOT EXISTS idx_bsvc_booking         ON booking_services(booking_id);
 
 
-- ============================================================
--  TRIGGER: tự động cập nhật updated_at
-- ============================================================
 
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['account','fields','field_slots','bookings']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
             CREATE TRIGGER trg_%1$s_updated_at
             BEFORE UPDATE ON %1$s
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
            tbl
        );
    END LOOP;
END $$;
 
 
-- ============================================================
--  SEED DATA
-- ============================================================
 
-- Tài khoản mẫu — password cho tất cả: Admin@123 (BCrypt 12 rounds)
INSERT INTO account (id, full_name, email, phone, password_hash, role, is_active, provider) VALUES
    (gen_random_uuid(), 'IT Admin',  'admin@ffzone.vn',  '0900000000',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'IT_ADMIN', true, 'LOCAL'),
    (gen_random_uuid(), 'Owner',     'owner@ffzone.vn',  '0900000001',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'OWNER',    true, 'LOCAL'),
    (gen_random_uuid(), 'Staff 1',   'staff@ffzone.vn',  '0900000002',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'STAFF',    true, 'LOCAL'),
    (gen_random_uuid(), 'User Demo', 'user@ffzone.vn',   '0900000003',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'USER',     true, 'LOCAL')
ON CONFLICT (email) DO NOTHING;
 
-- Sân bóng mẫu — type lưu nguyên tên Java enum
INSERT INTO fields (id, code, name, type, description, status) VALUES
    (gen_random_uuid(), 'FIELD-A', 'Sân A', 'FIVE_VS_FIVE',   'Sân cỏ nhân tạo 5v5, có mái che, đèn LED', 'ACTIVE'),
    (gen_random_uuid(), 'FIELD-B', 'Sân B', 'SEVEN_VS_SEVEN', 'Sân cỏ nhân tạo 7v7, ngoài trời',           'ACTIVE'),
    (gen_random_uuid(), 'FIELD-C', 'Sân C', 'NINE_VS_NINE',   'Sân cỏ tự nhiên 9v9',                       'ACTIVE')
ON CONFLICT (code) DO NOTHING;
 
-- Giá Sân A — ngày thường / cuối tuần
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 120000, 'WEEKDAY', '05:00'::TIME, '17:00'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-A';
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 180000, 'WEEKDAY', '17:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-A';
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 200000, 'WEEKEND', '05:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-A';
 
-- Giá Sân B
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 150000, 'WEEKDAY', '05:00'::TIME, '17:00'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-B';
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 220000, 'WEEKDAY', '17:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-B';
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 250000, 'WEEKEND', '05:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-B';
 
-- Giá Sân C
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 300000, 'WEEKDAY', '05:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-C';
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 375000, 'WEEKEND', '05:00'::TIME, '23:30'::TIME, CURRENT_DATE FROM fields WHERE code = 'FIELD-C';
 
-- Dịch vụ (chỉ 2 loại — ràng buộc UNIQUE trên service_type)
INSERT INTO services (id, name, service_type, description, price, is_active) VALUES
    (gen_random_uuid(), 'Thuê bóng',   'BALL_RENTAL', 'Bóng đá tiêu chuẩn FIFA size 5', 50000, true),
    (gen_random_uuid(), 'Thuê áo bib', 'BIB_RENTAL',  'Áo bib phân biệt 2 đội',         20000, true)
ON CONFLICT (service_type) DO NOTHING;
 
-- Voucher mẫu
INSERT INTO vouchers (id, code, voucher_type, discount_value, quantity, used_quantity, start_date, end_date, status) VALUES
    (gen_random_uuid(), 'WELCOME10', 'PERCENT', 10,    100, 0, NOW(), NOW() + INTERVAL '30 days', 'ACTIVE'),
    (gen_random_uuid(), 'FLAT50K',   'FIXED',   50000,  50, 0, NOW(), NOW() + INTERVAL '15 days', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;
 
-- Sinh slot mẫu cho 7 ngày tới (3 sân) — 15 slot/ngày, 05:00 → 22:30, bước 75 phút
-- Khớp chính xác với SlotGeneratorService (LAST_START = 22:30)
DO $$
DECLARE
    f          RECORD;
    d          DATE;
    slot_start TIME;
    slot_end   TIME;
    off        INTEGER;
    -- 15 offset (phút) tính từ 05:00: 0,75,150,...,1050 (= 22:30)
    offsets    INTEGER[] := ARRAY[0,75,150,225,300,375,450,525,600,675,750,825,900,975,1050];
    base_price NUMERIC;
BEGIN
    FOR f IN SELECT id, type FROM fields WHERE status = 'ACTIVE' LOOP
        FOR d IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day')::DATE LOOP
            FOREACH off IN ARRAY offsets LOOP
                slot_start := ('05:00'::TIME + (off * INTERVAL '1 minute'));
                slot_end   := slot_start + INTERVAL '60 minutes';
 
                base_price := CASE f.type
                    WHEN 'SEVEN_VS_SEVEN' THEN 240000
                    WHEN 'NINE_VS_NINE'   THEN 300000
                    ELSE 200000
                END;
 
                IF EXTRACT(ISODOW FROM d) IN (6, 7) THEN
                    base_price := CEIL(base_price * 1.25);
                END IF;
 
                INSERT INTO field_slots (field_id, slot_date, start_time, end_time, price, status)
                VALUES (f.id, d, slot_start, slot_end, base_price, 'AVAILABLE')
                ON CONFLICT (field_id, slot_date, start_time) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
 
 
-- ============================================================
--  KIỂM TRA SAU KHI CHẠY
-- ============================================================
DO $$
DECLARE
    cnt_accounts INT;
    cnt_fields   INT;
    cnt_slots    INT;
    cnt_services INT;
    cnt_vouchers INT;
BEGIN
    SELECT COUNT(*) INTO cnt_accounts FROM account;
    SELECT COUNT(*) INTO cnt_fields   FROM fields;
    SELECT COUNT(*) INTO cnt_slots    FROM field_slots;
    SELECT COUNT(*) INTO cnt_services FROM services;
    SELECT COUNT(*) INTO cnt_vouchers FROM vouchers;
 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FFZone Schema v5 — Setup hoàn tất!';
    RAISE NOTICE '  Tài khoản : % (password: Admin@123)', cnt_accounts;
    RAISE NOTICE '  Sân bóng  : %', cnt_fields;
    RAISE NOTICE '  Slots     : % (7 ngày tới, 15 slot/sân/ngày)', cnt_slots;
    RAISE NOTICE '  Dịch vụ   : %', cnt_services;
    RAISE NOTICE '  Vouchers  : %', cnt_vouchers;
    RAISE NOTICE '========================================';
END $$;