-- ============================================================
--  FFZone — Migration: add profile fields to account
--  (Gender + Date of birth, for "My Profile" feature — CUSTOMER only)
--
--  NOTE: with spring.jpa.hibernate.ddl-auto=update, Hibernate will
--  add these columns automatically on next backend startup.
--  This script is provided only for manual/offline DB setup.
-- ============================================================

ALTER TABLE account
    ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('MALE','FEMALE','OTHER')),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;
