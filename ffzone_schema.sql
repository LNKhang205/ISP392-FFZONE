-- ============================================================
--  FFZone Venue Booking System — Database Schema v4
--  Database : PostgreSQL 16
--  Encoding : UTF-8
--
--  Cách dùng:
--    1. Tạo database:  CREATE DATABASE ffzone OWNER ffzone;
--    2. Kết nối:       \c ffzone
--    3. Chạy file:     \i ffzone_schema.sql
--
--  Lưu ý: chạy toàn bộ file trong một lần (không chạy từng phần)
-- ============================================================

-- ============================================================
--  EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
--  ENUMS
--  Xoá trước nếu chạy lại để tránh lỗi "type already exists"
-- ============================================================

DO $$ BEGIN
    CREATE TYPE account_role AS ENUM ('USER', 'STAFF', 'OWNER', 'IT_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE field_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    -- AVAILABLE : chưa đặt
    -- PENDING   : đang giữ chỗ (5 phút chờ thanh toán)
    -- OCCUPIED  : đang thi đấu (sau check-in)
    CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'PENDING', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    -- PENDING_PAYMENT : vừa tạo, chờ thanh toán (deadline 5 phút)
    -- CONFIRMED       : đã thanh toán
    -- IN_PROGRESS     : đang diễn ra (sau check-in)
    -- COMPLETED       : kết thúc (sau checkout)
    -- CANCELLED       : đã hủy
    -- REFUND_PENDING  : yêu cầu hoàn tiền đang chờ staff duyệt
    -- REFUNDED        : đã hoàn tiền
    CREATE TYPE booking_status AS ENUM (
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE cancel_reason_type AS ENUM (
        'USER_CANCEL',
        'STAFF_CANCEL',
        'MAINTENANCE',
        'SYSTEM_EXPIRE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('VNPAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('BALL_RENTAL', 'BIB_RENTAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE voucher_type AS ENUM ('PERCENT', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE voucher_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
--  MASTER DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS account (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role          account_role NOT NULL DEFAULT 'USER',
    avatar_url    VARCHAR(500),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_email UNIQUE (email),
    CONSTRAINT uq_account_phone UNIQUE (phone)
);

-- JWT logout blacklist
CREATE TABLE IF NOT EXISTS token_blacklist (
    id          BIGSERIAL    PRIMARY KEY,
    token_jti   VARCHAR(100) NOT NULL,
    account_id  UUID         NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    expired_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_token_jti UNIQUE (token_jti)
);

CREATE TABLE IF NOT EXISTS fields (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(10)  NOT NULL DEFAULT '5V5' CHECK (type IN ('5V5', '7V7', '9V9')),
    description TEXT,
    status      field_status NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fields_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS field_images (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id     UUID         NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    image_url    VARCHAR(500) NOT NULL,
    is_thumbnail BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Bảng giá: có thể nhiều mức giá theo khung giờ / loại ngày / thời kỳ
-- day_of_week: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'
CREATE TABLE IF NOT EXISTS field_pricing (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id       UUID          NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    price          NUMERIC(12,0) NOT NULL,
    day_of_week    VARCHAR(10)   NOT NULL,
    start_time     TIME          NOT NULL,
    end_time       TIME          NOT NULL,
    effective_from DATE          NOT NULL,
    effective_to   DATE,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pricing_times CHECK (start_time < end_time),
    CONSTRAINT chk_pricing_dates CHECK (effective_to IS NULL OR effective_from <= effective_to),
    CONSTRAINT chk_pricing_dow   CHECK (day_of_week IN ('WEEKDAY', 'WEEKEND', 'HOLIDAY'))
);

-- Chỉ 2 loại dịch vụ, không quản lý inventory
CREATE TABLE IF NOT EXISTS services (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(100)  NOT NULL,
    service_type service_type  NOT NULL,
    description  TEXT,
    price        NUMERIC(12,0) NOT NULL DEFAULT 0,
    image_url    VARCHAR(500),
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_type UNIQUE (service_type),
    CONSTRAINT chk_service_price CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS vouchers (
    id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(50)    NOT NULL,
    voucher_type   voucher_type   NOT NULL DEFAULT 'PERCENT',
    discount_value NUMERIC(12,0)  NOT NULL,
    quantity       INT            NOT NULL,
    used_quantity  INT            NOT NULL DEFAULT 0,
    start_date     TIMESTAMP      NOT NULL,
    end_date       TIMESTAMP      NOT NULL,
    status         voucher_status NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_voucher_code      UNIQUE (code),
    CONSTRAINT chk_voucher_qty      CHECK (used_quantity <= quantity),
    CONSTRAINT chk_voucher_qty_pos  CHECK (quantity > 0),
    CONSTRAINT chk_voucher_dates    CHECK (start_date < end_date),
    CONSTRAINT chk_discount_value   CHECK (discount_value > 0)
);


-- ============================================================
--  TRANSACTION DATA
-- ============================================================

-- Slot thực tế theo ngày — sinh bởi scheduler
-- Giờ hoạt động 05:00–23:45, slot 60 phút, nghỉ 15 phút (~13 slot/sân/ngày)
-- version dùng cho Optimistic Locking ở tầng JPA (@Version)
CREATE TABLE IF NOT EXISTS field_slots (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id   UUID        NOT NULL REFERENCES fields(id),
    slot_date  DATE        NOT NULL,
    start_time TIME        NOT NULL,
    end_time   TIME        NOT NULL,
    status     slot_status NOT NULL DEFAULT 'AVAILABLE',
    version    INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_field_slot      UNIQUE (field_id, slot_date, start_time),
    CONSTRAINT chk_slot_times     CHECK  (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code        VARCHAR(30)    NOT NULL,
    account_id          UUID           NOT NULL REFERENCES account(id),
    field_id            UUID           NOT NULL REFERENCES fields(id),
    voucher_id          UUID           REFERENCES vouchers(id),
    status              booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
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

-- Mỗi field_slot_id chỉ xuất hiện 1 lần (UNIQUE) — tránh đặt trùng ở tầng DB
CREATE TABLE IF NOT EXISTS booking_slots (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id    UUID          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    field_slot_id UUID          NOT NULL REFERENCES field_slots(id),
    booked_price  NUMERIC(12,0) NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_booking_slot  UNIQUE (field_slot_id),
    CONSTRAINT chk_booked_price CHECK  (booked_price >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
    id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id         UUID           NOT NULL REFERENCES bookings(id),
    amount             NUMERIC(12,0)  NOT NULL,
    payment_method     payment_method NOT NULL DEFAULT 'VNPAY',
    status             payment_status NOT NULL DEFAULT 'PENDING',
    vnp_txn_ref        VARCHAR(100),
    vnp_response_code  VARCHAR(10),
    vnp_transaction_no VARCHAR(100),
    paid_at            TIMESTAMP,
    created_at         TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_booking  UNIQUE (booking_id),
    CONSTRAINT uq_payment_txn_ref  UNIQUE (vnp_txn_ref),
    CONSTRAINT chk_payment_amount  CHECK  (amount > 0)
);

-- Staff thêm/bớt dịch vụ khi booking = IN_PROGRESS
CREATE TABLE IF NOT EXISTS booking_services (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   UUID          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id   UUID          NOT NULL REFERENCES services(id),
    quantity     INT           NOT NULL DEFAULT 1,
    unit_price   NUMERIC(12,0) NOT NULL,
    total_price  NUMERIC(12,0) NOT NULL,
    cancel_reason TEXT,
    cancelled_at  TIMESTAMP,
    added_by     UUID          REFERENCES account(id),
    note         TEXT,
    CONSTRAINT chk_bs_quantity    CHECK (quantity > 0),
    CONSTRAINT chk_bs_unit_price  CHECK (unit_price >= 0),
    CONSTRAINT chk_bs_total_price CHECK (total_price = unit_price * quantity)
);

-- Hoàn tiền: refund_percent chỉ nhận 0 hoặc 100 (theo policy)
CREATE TABLE IF NOT EXISTS refunds (
    id             UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id     UUID               NOT NULL REFERENCES bookings(id),
    cancel_type    cancel_reason_type NOT NULL,
    refund_percent INT                NOT NULL DEFAULT 0,
    refund_amount  NUMERIC(12,0)      NOT NULL DEFAULT 0,
    status         refund_status      NOT NULL DEFAULT 'PENDING',
    requested_at   TIMESTAMP          NOT NULL DEFAULT NOW(),
    processed_by   UUID               REFERENCES account(id),
    processed_at   TIMESTAMP,
    note           TEXT,
    CONSTRAINT uq_refund_booking    UNIQUE (booking_id),
    CONSTRAINT chk_refund_percent   CHECK  (refund_percent IN (0, 100)),
    CONSTRAINT chk_refund_amount    CHECK  (refund_amount >= 0)
);

-- User nhận voucher: first come first served
CREATE TABLE IF NOT EXISTS user_vouchers (
    id         UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- account
CREATE INDEX IF NOT EXISTS idx_account_email        ON account(email);
CREATE INDEX IF NOT EXISTS idx_account_role         ON account(role);

-- token_blacklist
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti  ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_exp  ON token_blacklist(expired_at);

-- fields
CREATE INDEX IF NOT EXISTS idx_fields_code          ON fields(code);
CREATE INDEX IF NOT EXISTS idx_fields_status        ON fields(status);

-- field_pricing
CREATE INDEX IF NOT EXISTS idx_pricing_field_active ON field_pricing(field_id, is_active);

-- field_slots  (hot path: tìm lịch trống theo sân + ngày)
CREATE INDEX IF NOT EXISTS idx_slots_field_date     ON field_slots(field_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_field_date_st  ON field_slots(field_id, slot_date, status);
CREATE INDEX IF NOT EXISTS idx_slots_date           ON field_slots(slot_date);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_account     ON bookings(account_id);
CREATE INDEX IF NOT EXISTS idx_bookings_field       ON bookings(field_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_code        ON bookings(booking_code);
-- Partial index: scheduler quét PENDING_PAYMENT quá hạn
-- Dùng cast ::booking_status để tránh lỗi "operator does not exist" với enum
CREATE INDEX IF NOT EXISTS idx_bookings_deadline    ON bookings(payment_deadline)
    WHERE status = 'PENDING_PAYMENT'::booking_status;

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_txn_ref     ON payments(vnp_txn_ref);

-- vouchers
CREATE INDEX IF NOT EXISTS idx_vouchers_code        ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status      ON vouchers(status);

-- user_vouchers
CREATE INDEX IF NOT EXISTS idx_uv_account           ON user_vouchers(account_id);
CREATE INDEX IF NOT EXISTS idx_uv_voucher           ON user_vouchers(voucher_id);

-- refunds
CREATE INDEX IF NOT EXISTS idx_refunds_status       ON refunds(status);

-- booking_services
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

-- Tạo trigger cho tất cả bảng có cột updated_at
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

-- Tài khoản mặc định
-- Password cho tất cả tài khoản: Admin@123
-- Hash BCrypt $2a$12$ (12 rounds) — có thể dùng luôn để test với Spring Boot BCryptPasswordEncoder
INSERT INTO account (full_name, email, phone, password_hash, role) VALUES
    ('IT Admin',  'admin@ffzone.vn',  '0900000000',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
     'IT_ADMIN'),
    ('Owner',     'owner@ffzone.vn',  '0900000001',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
     'OWNER'),
    ('Staff 1',   'staff@ffzone.vn',  '0900000002',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
     'STAFF'),
    ('User Demo', 'user@ffzone.vn',   '0900000003',
     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
     'USER')
ON CONFLICT (email) DO NOTHING;

-- Sân bóng mẫu
INSERT INTO fields (code, name, type, description, status) VALUES
    ('FIELD-A', 'Sân A', '5V5',   'Sân cỏ nhân tạo 5v5, có mái che, đèn LED', 'ACTIVE'),
    ('FIELD-B', 'Sân B', '7V7',   'Sân cỏ nhân tạo 7v7, ngoài trời',           'ACTIVE'),
    ('FIELD-C', 'Sân C', '9V9', 'Sân cỏ tự nhiên 9v9',                         'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- Giá cho Sân A — ngày thường
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 120000, 'WEEKDAY', '05:00'::TIME, '17:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-A'
ON CONFLICT DO NOTHING;

INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 180000, 'WEEKDAY', '17:00'::TIME, '23:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-A'
ON CONFLICT DO NOTHING;

-- Giá cho Sân A — cuối tuần
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 200000, 'WEEKEND', '05:00'::TIME, '23:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-A'
ON CONFLICT DO NOTHING;

-- Giá cho Sân B — ngày thường
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 150000, 'WEEKDAY', '05:00'::TIME, '17:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-B'
ON CONFLICT DO NOTHING;

INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 220000, 'WEEKDAY', '17:00'::TIME, '23:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-B'
ON CONFLICT DO NOTHING;

-- Giá cho Sân C — ngày thường
INSERT INTO field_pricing (field_id, price, day_of_week, start_time, end_time, effective_from)
SELECT id, 300000, 'WEEKDAY', '05:00'::TIME, '23:00'::TIME, CURRENT_DATE
FROM fields WHERE code = 'FIELD-C'
ON CONFLICT DO NOTHING;

-- Dịch vụ (chỉ 2 loại, mỗi loại 1 bản ghi — ràng buộc UNIQUE)
INSERT INTO services (name, service_type, description, price) VALUES
    ('Thuê bóng',   'BALL_RENTAL', 'Bóng đá tiêu chuẩn FIFA size 5', 50000),
    ('Thuê áo bib', 'BIB_RENTAL',  'Áo bib phân biệt 2 đội',         20000)
ON CONFLICT (service_type) DO NOTHING;

-- Voucher mẫu
INSERT INTO vouchers (code, voucher_type, discount_value, quantity, start_date, end_date) VALUES
    ('WELCOME10', 'PERCENT', 10,    100, NOW(), NOW() + INTERVAL '30 days'),
    ('FLAT50K',   'FIXED',   50000,  50, NOW(), NOW() + INTERVAL '15 days')
ON CONFLICT (code) DO NOTHING;

-- Sinh slot mẫu cho ngày hôm nay và ngày mai (3 sân)
-- Slot: 05:00–06:00, 06:15–07:15, ..., 22:45–23:45 (13 slots)
DO $$
DECLARE
    f        RECORD;
    d        DATE;
    h        INTEGER;
    slot_start TIME;
    slot_end   TIME;
    -- 13 slots: bắt đầu tại phút 0, 75, 150, 225, ... của ngày (offset * 75 phút)
    offsets INTEGER[] := ARRAY[0,75,150,225,300,375,450,525,600,675,750,825,900];
    off     INTEGER;
BEGIN
    FOR f IN SELECT id FROM fields WHERE status = 'ACTIVE' LOOP
        FOR d IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day')::DATE LOOP
            FOREACH off IN ARRAY offsets LOOP
                slot_start := ('05:00'::TIME + (off * INTERVAL '1 minute'));
                slot_end   := slot_start + INTERVAL '60 minutes';
                INSERT INTO field_slots (field_id, slot_date, start_time, end_time, status)
                VALUES (f.id, d, slot_start, slot_end, 'AVAILABLE')
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
    cnt_accounts  INT;
    cnt_fields    INT;
    cnt_slots     INT;
    cnt_services  INT;
    cnt_vouchers  INT;
BEGIN
    SELECT COUNT(*) INTO cnt_accounts  FROM account;
    SELECT COUNT(*) INTO cnt_fields    FROM fields;
    SELECT COUNT(*) INTO cnt_slots     FROM field_slots;
    SELECT COUNT(*) INTO cnt_services  FROM services;
    SELECT COUNT(*) INTO cnt_vouchers  FROM vouchers;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'FFZone Schema v4 — Setup hoàn tất!';
    RAISE NOTICE '  Tài khoản  : % (password: Admin@123)', cnt_accounts;
    RAISE NOTICE '  Sân bóng   : %', cnt_fields;
    RAISE NOTICE '  Slots      : % (7 ngày tới)', cnt_slots;
    RAISE NOTICE '  Dịch vụ    : %', cnt_services;
    RAISE NOTICE '  Vouchers   : %', cnt_vouchers;
    RAISE NOTICE '========================================';
END $$;
