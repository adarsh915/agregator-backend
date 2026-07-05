-- ========================================
-- KAEL AGGREGATOR DATABASE SCHEMA
-- Run this in your NEW Supabase project
-- ========================================

-- ========================================
-- 1. AGGREGATOR USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.aggregator_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_aggregator_users_email ON public.aggregator_users(email);
CREATE INDEX IF NOT EXISTS idx_aggregator_users_active ON public.aggregator_users(is_active);

-- ========================================
-- 2. AGGREGATOR SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.aggregator_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.aggregator_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_aggregator_sessions_user_id ON public.aggregator_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_aggregator_sessions_expires_at ON public.aggregator_sessions(expires_at);

-- ========================================
-- 3. ENTERPRISES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.enterprises (
  -- Primary Key
  id TEXT PRIMARY KEY,
  
  -- Organization Information
  name TEXT NOT NULL,
  logo_url TEXT,
  
  -- Address Information
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  
  -- Business Registration (India)
  gst TEXT,
  pan TEXT,
  
  -- Contact Person Details
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  
  -- Billing Information
  billing_package TEXT DEFAULT 'starter' CHECK (billing_package IN ('starter', 'professional', 'enterprise')),
  billing_status TEXT DEFAULT 'active' CHECK (billing_status IN ('trial', 'active', 'suspended', 'cancelled')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_enterprises_name ON public.enterprises(name);
CREATE INDEX IF NOT EXISTS idx_enterprises_active ON public.enterprises(is_active);
CREATE INDEX IF NOT EXISTS idx_enterprises_billing_status ON public.enterprises(billing_status);
CREATE INDEX IF NOT EXISTS idx_enterprises_created_at ON public.enterprises(created_at DESC);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.aggregator_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. RLS POLICIES (Deny all for anon/authenticated)
-- Backend uses service role key which bypasses RLS
-- ========================================
DROP POLICY IF EXISTS deny_all_aggregator_users ON public.aggregator_users;
CREATE POLICY deny_all_aggregator_users ON public.aggregator_users
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_aggregator_sessions ON public.aggregator_sessions;
CREATE POLICY deny_all_aggregator_sessions ON public.aggregator_sessions
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_enterprises ON public.enterprises;
CREATE POLICY deny_all_enterprises ON public.enterprises
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ========================================
-- 6. SEED DEFAULT ADMIN USER
-- Email: admin@kael.com
-- Password: Admin@123
-- ========================================
-- You need to run the seed-admin.js script to create this user
-- The password will be hashed using bcrypt

-- ========================================
-- SCHEMA CREATED SUCCESSFULLY
-- ========================================
