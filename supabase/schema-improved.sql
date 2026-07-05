-- ============================================
-- KAEL AGGREGATOR DATABASE - IMPROVED SCHEMA
-- Combines: UUID + Validations + Audit Trail
-- ============================================

-- ============================================
-- 1. AGGREGATOR_USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.aggregator_users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Info
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' 
    CHECK (role IN ('super_admin', 'admin', 'viewer')),
  password_hash TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Email validation
  CONSTRAINT chk_aggregator_email_format 
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Index for login lookups
CREATE INDEX idx_aggregator_users_email 
  ON public.aggregator_users(email);

CREATE INDEX idx_aggregator_users_active 
  ON public.aggregator_users(is_active) 
  WHERE is_active = TRUE;

-- Comments for documentation
COMMENT ON TABLE public.aggregator_users IS 'Super admin users who manage enterprises';
COMMENT ON COLUMN public.aggregator_users.role IS 'super_admin: full access, admin: manage enterprises, viewer: read-only';

-- ============================================
-- 2. AGGREGATOR_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.aggregator_sessions (
  -- Primary Key (JWT token)
  token TEXT PRIMARY KEY,
  
  -- User Reference
  user_id UUID NOT NULL REFERENCES public.aggregator_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Session Info
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation
  CONSTRAINT chk_session_expiry CHECK (expires_at > issued_at)
);

-- Index for cleanup
CREATE INDEX idx_aggregator_sessions_user_id 
  ON public.aggregator_sessions(user_id);

CREATE INDEX idx_aggregator_sessions_expires_at 
  ON public.aggregator_sessions(expires_at);

COMMENT ON TABLE public.aggregator_sessions IS 'JWT session tokens for aggregator admins';

-- ============================================
-- 3. ENTERPRISES TABLE (Main CRUD Table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.enterprises (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ========================================
  -- BASIC INFORMATION
  -- ========================================
  enterprise_name TEXT NOT NULL,
  logo_url TEXT,
  logo_storage_path TEXT,
  general_phone TEXT,
  general_email TEXT NOT NULL,
  api_url TEXT,
  
  -- ========================================
  -- TAX/LEGAL DETAILS (India)
  -- ========================================
  gstin_number TEXT NOT NULL,
  pan_card_number TEXT NOT NULL,
  
  -- ========================================
  -- HEADQUARTERS ADDRESS
  -- ========================================
  hq_street_details TEXT,
  hq_city TEXT,
  hq_state TEXT,
  hq_pincode TEXT,
  
  -- ========================================
  -- STATUS
  -- ========================================
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- ========================================
  -- BILLING & TIER PLANS
  -- ========================================
  billing_plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (billing_plan IN ('starter', 'professional', 'enterprise')),
  
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  
  billing_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 
    CHECK (billing_amount >= 0),
  
  next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  
  -- ========================================
  -- AUTHORIZED CONTACT DETAILS
  -- ========================================
  contact_name TEXT NOT NULL,
  contact_designation TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- ========================================
  -- METADATA / AUDIT
  -- ========================================
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.aggregator_users(id),
  updated_by UUID REFERENCES public.aggregator_users(id),
  
  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.aggregator_users(id),
  
  -- ========================================
  -- FORMAT VALIDATION CHECKS
  -- ========================================
  
  -- GSTIN Format: 22AAAAA0000A1Z5 (India GST Number)
  CONSTRAINT chk_gstin_format 
    CHECK (gstin_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  
  -- PAN Format: AAAAA0000A (India PAN Card)
  CONSTRAINT chk_pan_format 
    CHECK (pan_card_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
  
  -- Email Validation
  CONSTRAINT chk_general_email_format 
    CHECK (general_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  
  CONSTRAINT chk_contact_email_format 
    CHECK (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  
  -- API URL Validation
  CONSTRAINT chk_api_url_format 
    CHECK (api_url IS NULL OR api_url ~ '^https?://'),
  
  -- Pincode Validation (6 digits for India)
  CONSTRAINT chk_pincode_format
    CHECK (hq_pincode IS NULL OR hq_pincode ~ '^[0-9]{6}$'),
  
  -- Soft delete consistency
  CONSTRAINT chk_deleted_consistency
    CHECK ((is_deleted = FALSE AND deleted_at IS NULL) OR 
           (is_deleted = TRUE AND deleted_at IS NOT NULL))
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Unique GSTIN (only for active/non-deleted records)
CREATE UNIQUE INDEX idx_enterprises_gstin
  ON public.enterprises(gstin_number)
  WHERE is_deleted = FALSE;

-- Unique PAN (only for active/non-deleted records)
CREATE UNIQUE INDEX idx_enterprises_pan
  ON public.enterprises(pan_card_number)
  WHERE is_deleted = FALSE;

-- Status index
CREATE INDEX idx_enterprises_status
  ON public.enterprises(status)
  WHERE is_deleted = FALSE;

-- Billing plan index
CREATE INDEX idx_enterprises_billing_plan
  ON public.enterprises(billing_plan)
  WHERE is_deleted = FALSE;

-- Next billing date (for billing reminders)
CREATE INDEX idx_enterprises_next_billing_date
  ON public.enterprises(next_billing_date)
  WHERE is_deleted = FALSE AND status = 'active';

-- Created date (for sorting)
CREATE INDEX idx_enterprises_created_at
  ON public.enterprises(created_at DESC);

-- Name search (case-insensitive)
CREATE INDEX idx_enterprises_name_lower
  ON public.enterprises(LOWER(enterprise_name))
  WHERE is_deleted = FALSE;

-- Full-text search index (optional, for advanced search)
CREATE INDEX idx_enterprises_name_fts
  ON public.enterprises USING GIN(to_tsvector('english', enterprise_name));

-- ========================================
-- COMMENTS (Documentation)
-- ========================================
COMMENT ON TABLE public.enterprises IS 'Enterprise metadata for multi-tenant SaaS system';
COMMENT ON COLUMN public.enterprises.gstin_number IS 'Goods and Services Tax Identification Number (India)';
COMMENT ON COLUMN public.enterprises.pan_card_number IS 'Permanent Account Number (India Tax ID)';
COMMENT ON COLUMN public.enterprises.billing_plan IS 'Subscription tier: starter, professional, enterprise';
COMMENT ON COLUMN public.enterprises.billing_cycle IS 'Billing frequency: monthly, quarterly, yearly';
COMMENT ON COLUMN public.enterprises.is_deleted IS 'Soft delete flag - deleted enterprises are hidden but data retained';

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for aggregator_users
CREATE TRIGGER set_aggregator_users_updated_at
  BEFORE UPDATE ON public.aggregator_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for enterprises
CREATE TRIGGER set_enterprises_updated_at
  BEFORE UPDATE ON public.enterprises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE public.aggregator_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

-- Deny all for anon/authenticated (backend uses service role)
CREATE POLICY deny_all_aggregator_users 
  ON public.aggregator_users
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY deny_all_aggregator_sessions 
  ON public.aggregator_sessions
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY deny_all_enterprises 
  ON public.enterprises
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to soft delete enterprise
CREATE OR REPLACE FUNCTION soft_delete_enterprise(
  p_enterprise_id UUID,
  p_deleted_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.enterprises
  SET 
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_by = p_deleted_by,
    updated_at = NOW()
  WHERE id = p_enterprise_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore deleted enterprise
CREATE OR REPLACE FUNCTION restore_enterprise(
  p_enterprise_id UUID,
  p_updated_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.enterprises
  SET 
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE id = p_enterprise_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active enterprises count
CREATE OR REPLACE FUNCTION get_active_enterprises_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.enterprises WHERE is_deleted = FALSE AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SEED DEFAULT ADMIN USER
-- ========================================
-- Note: Run seed-admin.js script to create admin user with hashed password

-- ========================================
-- SCHEMA CREATED SUCCESSFULLY
-- ========================================
