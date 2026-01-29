-- Schema for LTC Group Orders Database
-- Run this SQL in your Supabase SQL Editor

-- Create orders table
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- View for order statistics (optional)
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
