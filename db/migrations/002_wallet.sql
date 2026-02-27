-- Migration 002: Add wallet support
-- Adds wallet_balance to users, makes card_id nullable in transactions,
-- and adds new transaction types for wallet operations.

BEGIN;

-- 1. Add wallet_balance column to users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 2. Add CHECK constraint on wallet_balance
ALTER TABLE users
    ADD CONSTRAINT ck_users_wallet_balance_positive CHECK (wallet_balance >= 0);

-- 3. Make card_id nullable in transactions (wallet transactions have no card)
ALTER TABLE transactions
    ALTER COLUMN card_id DROP NOT NULL;

-- 4. Add new transaction type enum values
ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'WALLET_TOPUP';
ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'WALLET_TO_CARD';
ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'WALLET_WITHDRAWAL';

COMMIT;
