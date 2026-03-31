-- Tables pour le site web (orders et transactions de paiement)

CREATE TABLE IF NOT EXISTS web_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref VARCHAR(100) UNIQUE NOT NULL,
    card_type VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    birth_city VARCHAR(100) NOT NULL,
    city_neighborhood VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profession VARCHAR(100) NOT NULL,
    id_number VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50),
    father_name VARCHAR(200) NOT NULL,
    mother_name VARCHAR(200) NOT NULL,
    delivery_option VARCHAR(50) NOT NULL,
    delivery_address TEXT,
    shipping_city VARCHAR(100),
    no_niu BOOLEAN DEFAULT FALSE,
    card_price DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    niu_fee DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('SUCCESS', 'PENDING', 'FAILED', 'NOT_PAID')),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS web_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ptn VARCHAR(100),
    trid VARCHAR(100),
    order_ref VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    phone VARCHAR(20),
    customer_name VARCHAR(200),
    customer_email VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'ERRORED')),
    error_code VARCHAR(50),
    error_message TEXT,
    initiated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_web_orders_order_ref ON web_orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_web_orders_phone ON web_orders(phone);
CREATE INDEX IF NOT EXISTS idx_web_orders_email ON web_orders(email);
CREATE INDEX IF NOT EXISTS idx_web_orders_payment_status ON web_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_web_orders_created_at ON web_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_web_transactions_ptn ON web_transactions(ptn);
CREATE INDEX IF NOT EXISTS idx_web_transactions_trid ON web_transactions(trid);
CREATE INDEX IF NOT EXISTS idx_web_transactions_order_ref ON web_transactions(order_ref);
CREATE INDEX IF NOT EXISTS idx_web_transactions_status ON web_transactions(status);
CREATE INDEX IF NOT EXISTS idx_web_transactions_created_at ON web_transactions(created_at DESC);

-- Foreign key relationship (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_web_transactions_order_ref_fk ON web_transactions(order_ref);

COMMENT ON TABLE web_orders IS 'Commandes de cartes bancaires depuis le site web ltcgroup.site';
COMMENT ON TABLE web_transactions IS 'Transactions de paiement (Payin/Enkap) pour les commandes web';
