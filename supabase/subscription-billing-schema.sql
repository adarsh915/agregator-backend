-- ============================================
-- SUBSCRIPTION BILLING SYSTEM SCHEMA
-- ============================================

-- Table 1: Subscriptions
-- Stores the active subscription for each enterprise
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE UNIQUE,
  
  -- Package & Plan
  package_id UUID REFERENCES billing_packages(id),
  package_name VARCHAR(100) NOT NULL,
  
  -- Billing Details
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  amount_per_cycle DECIMAL(10,2) NOT NULL,
  
  -- Subscription Period
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES aggregator_users(id),
  updated_by UUID REFERENCES aggregator_users(id)
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_enterprise ON subscriptions(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- Table 2: Billing Records
-- Stores each billing period (history of all charges)
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
  
  -- Billing Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  
  -- Amount
  package_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Due Date
  due_date DATE NOT NULL,
  
  -- Payment Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for billing_records
CREATE INDEX IF NOT EXISTS idx_billing_records_subscription ON billing_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_enterprise ON billing_records(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_due_date ON billing_records(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_records_period ON billing_records(period_start, period_end);

-- Add comments
COMMENT ON TABLE subscriptions IS 'Stores active subscription for each enterprise';
COMMENT ON TABLE billing_records IS 'Stores billing history - one record per billing period';

COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, paused, cancelled';
COMMENT ON COLUMN billing_records.status IS 'Payment status: pending, paid, overdue, cancelled';
