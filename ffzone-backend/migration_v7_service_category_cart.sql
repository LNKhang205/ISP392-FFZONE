-- ============================================================
--  FFZone — Migration v7: Service Category + Cart
--
--  Hibernate ddl-auto=update sẽ tự apply hầu hết thay đổi.
--  Chạy script này chỉ khi cần setup thủ công hoặc CI/CD.
--
--  Thay đổi:
--    1. services: đổi service_type (VARCHAR unique) → category (VARCHAR, không unique)
--    2. Xóa seed data cũ (BALL_RENTAL/BIB_RENTAL) và thêm seed mới 3 nhóm
--    3. Tạo bảng carts + cart_items
-- ============================================================

-- 1. Đổi cột service_type → category (bỏ unique constraint)
ALTER TABLE services DROP CONSTRAINT IF EXISTS uq_service_type;
ALTER TABLE services RENAME COLUMN service_type TO category;
ALTER TABLE services
    DROP CONSTRAINT IF EXISTS services_service_type_check,
    ADD CONSTRAINT chk_service_category
        CHECK (category IN ('DRINK','EQUIPMENT','FACILITY'));

-- 2. Xóa seed cũ (BALL_RENTAL, BIB_RENTAL) — không còn hợp lệ
DELETE FROM services WHERE category IN ('BALL_RENTAL','BIB_RENTAL');

-- 3. Seed dịch vụ mới theo 3 nhóm
INSERT INTO services (id, name, category, description, price, is_active) VALUES
  -- DRINK
  (gen_random_uuid(), 'Nước suối',     'DRINK', 'Nước suối Aquafina 500ml',           10000, true),
  (gen_random_uuid(), 'Coca Cola',     'DRINK', 'Coca Cola lon 330ml ướp lạnh',       15000, true),
  (gen_random_uuid(), 'Pepsi',         'DRINK', 'Pepsi lon 330ml ướp lạnh',           15000, true),
  (gen_random_uuid(), 'Sting đỏ',      'DRINK', 'Nước tăng lực Sting đỏ 330ml',      15000, true),
  (gen_random_uuid(), 'Revive',        'DRINK', 'Nước điện giải Revive 390ml',        15000, true),
  (gen_random_uuid(), 'Trà xanh 0 độ','DRINK', 'Trà xanh không đường 455ml',         15000, true),
  -- EQUIPMENT
  (gen_random_uuid(), 'Áo bib',        'EQUIPMENT', 'Áo bib phân biệt đội, 1 bộ 14 chiếc', 50000, true),
  (gen_random_uuid(), 'Găng tay thủ môn','EQUIPMENT','Găng tay thủ môn tiêu chuẩn',   30000, true),
  (gen_random_uuid(), 'Băng đội trưởng','EQUIPMENT','Băng đội trưởng vải co giãn',     10000, true),
  (gen_random_uuid(), 'Băng keo thể thao','EQUIPMENT','Băng keo thể thao chuyên dụng', 20000, true),
  (gen_random_uuid(), 'Bơm bóng',      'EQUIPMENT', 'Bơm tay kèm kim bơm bóng',      10000, true),
  -- FACILITY
  (gen_random_uuid(), 'Thuê bóng thi đấu','FACILITY','Bóng đá size 5 tiêu chuẩn FIFA', 50000, true),
  (gen_random_uuid(), 'Thuê loa bluetooth','FACILITY','Loa JBL không dây, pin 6 giờ', 50000, true),
  (gen_random_uuid(), 'Khăn lạnh',     'FACILITY', 'Khăn lạnh đóng gói tiệt trùng',  10000, true),
  (gen_random_uuid(), 'Đá lạnh',       'FACILITY', 'Túi đá lạnh 2kg',                15000, true),
  (gen_random_uuid(), 'Bảng chiến thuật','FACILITY','Bảng chiến thuật từ nam châm',   20000, true)
ON CONFLICT DO NOTHING;

-- 4. Tạo bảng Cart
CREATE TABLE IF NOT EXISTS carts (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID      NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_account UNIQUE (account_id)
);

-- 5. Tạo bảng CartItem
CREATE TABLE IF NOT EXISTS cart_items (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID          NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    service_id  UUID          NOT NULL REFERENCES services(id),
    quantity    INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_item   UNIQUE (cart_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_account   ON carts(account_id);
CREATE INDEX IF NOT EXISTS idx_cartitem_cart  ON cart_items(cart_id);
