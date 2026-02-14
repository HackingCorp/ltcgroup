-- =============================================
-- LTC Group - Initial Database Schema
-- PostgreSQL 16+ (Docker)
-- =============================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref VARCHAR(50) UNIQUE NOT NULL,

  -- Card info
  card_type VARCHAR(100) NOT NULL,

  -- Personal info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birth_city VARCHAR(100) NOT NULL,
  city_neighborhood VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  profession VARCHAR(100) NOT NULL,

  -- Documents
  id_number VARCHAR(50) NOT NULL,
  registration_number VARCHAR(50),
  father_name VARCHAR(200) NOT NULL,
  mother_name VARCHAR(200) NOT NULL,
  no_niu BOOLEAN DEFAULT FALSE,

  -- Delivery
  delivery_option VARCHAR(50) NOT NULL,
  delivery_address TEXT,
  shipping_city VARCHAR(100),

  -- Pricing
  card_price INTEGER NOT NULL,
  delivery_fee INTEGER DEFAULT 0,
  niu_fee INTEGER DEFAULT 0,
  total INTEGER NOT NULL,

  -- Payment
  payment_status VARCHAR(20) DEFAULT 'NOT_PAID',
  payment_method VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for order statistics
CREATE OR REPLACE VIEW order_stats AS
SELECT
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE payment_status = 'SUCCESS') as paid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'NOT_PAID') as unpaid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'PENDING') as pending_orders,
  COUNT(*) FILTER (WHERE payment_status = 'FAILED') as failed_orders,
  SUM(total) FILTER (WHERE payment_status = 'SUCCESS') as total_revenue,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as orders_today
FROM orders;

-- =============================================
-- TRANSACTIONS TABLE - Records all payment events
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Transaction identifiers
  ptn VARCHAR(100),                    -- S3P Payment Transaction Number
  trid VARCHAR(100),                   -- Transaction Reference ID
  order_ref VARCHAR(50),               -- Link to order (if exists)

  -- Payment details
  amount INTEGER NOT NULL,
  phone VARCHAR(20),
  customer_name VARCHAR(200),
  customer_email VARCHAR(255),

  -- Payment method & provider
  payment_method VARCHAR(50) NOT NULL, -- 'mobile_money', 'enkap'
  provider VARCHAR(50),                -- 'MTN', 'ORANGE', 'VISA', etc.

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, ERRORED
  error_code VARCHAR(20),
  error_message TEXT,

  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_ptn ON transactions(ptn);
CREATE INDEX IF NOT EXISTS idx_transactions_trid ON transactions(trid);
CREATE INDEX IF NOT EXISTS idx_transactions_order_ref ON transactions(order_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_phone ON transactions(phone);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- View for transaction statistics
CREATE OR REPLACE VIEW transaction_stats AS
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
  COUNT(*) FILTER (WHERE status = 'FAILED' OR status = 'ERRORED') as failed,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
  SUM(amount) FILTER (WHERE status = 'SUCCESS') as total_collected,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today_count,
  SUM(amount) FILTER (WHERE status = 'SUCCESS' AND created_at > NOW() - INTERVAL '24 hours') as today_collected
FROM transactions;
