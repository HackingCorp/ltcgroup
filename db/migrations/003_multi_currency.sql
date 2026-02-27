-- Migration 003: Multi-currency support
-- Add country_code to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'CM';
UPDATE users SET country_code = 'CM' WHERE country_code IS NULL;
ALTER TABLE users ALTER COLUMN country_code SET NOT NULL;
