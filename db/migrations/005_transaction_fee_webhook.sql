-- Add fee column and webhook_reference for idempotent webhook processing
-- fee: stores the platform fee charged on top of the base amount
-- webhook_reference: unique key to prevent double-processing of webhook callbacks

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS webhook_reference VARCHAR(255);

-- Unique constraint on webhook_reference (NULLs are excluded by PostgreSQL unique constraints)
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_reference ON transactions (webhook_reference) WHERE webhook_reference IS NOT NULL;
