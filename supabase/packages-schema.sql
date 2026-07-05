-- ========================================
-- PACKAGE MANAGEMENT SYSTEM SCHEMA
-- ========================================

-- 1. Create the billing_packages table
CREATE TABLE IF NOT EXISTS public.billing_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE public.billing_packages IS 'Stores available subscription tiers/packages';
COMMENT ON COLUMN public.billing_packages.features IS 'JSON array of string features for the package';

-- Trigger for updated_at
CREATE TRIGGER set_billing_packages_updated_at
  BEFORE UPDATE ON public.billing_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SEED INITIAL PACKAGES
-- ========================================
-- Insert the 3 default packages to match current UI exactly, capturing their IDs
DO $$
DECLARE
  starter_id UUID;
  pro_id UUID;
  enterprise_id UUID;
BEGIN
  -- Starter
  INSERT INTO public.billing_packages (name, description, price_monthly, price_yearly, features, is_active)
  VALUES (
    'Starter',
    'Basic plan for small businesses',
    499.00,
    4990.00,
    '["Up to 5 Users", "Basic Analytics", "Standard Support"]'::jsonb,
    true
  ) RETURNING id INTO starter_id;

  -- Professional
  INSERT INTO public.billing_packages (name, description, price_monthly, price_yearly, features, is_active)
  VALUES (
    'Professional',
    'Advanced tools for growing teams',
    999.00,
    9990.00,
    '["Up to 20 Users", "Advanced Analytics", "Priority Support", "Custom Reports"]'::jsonb,
    true
  ) RETURNING id INTO pro_id;

  -- Enterprise
  INSERT INTO public.billing_packages (name, description, price_monthly, price_yearly, features, is_active)
  VALUES (
    'Enterprise',
    'Full capability for large organizations',
    2999.00,
    29990.00,
    '["Unlimited Users", "Full API Access", "24/7 Dedicated Support", "White Labeling"]'::jsonb,
    true
  ) RETURNING id INTO enterprise_id;

  -- ========================================
  -- MIGRATE ENTERPRISES TABLE
  -- ========================================
  
  -- Add package_id column
  ALTER TABLE public.enterprises ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.billing_packages(id);
  
  -- Map existing string billing_plan to the new UUIDs
  UPDATE public.enterprises SET package_id = starter_id WHERE LOWER(billing_plan) = 'starter';
  UPDATE public.enterprises SET package_id = pro_id WHERE LOWER(billing_plan) = 'professional';
  UPDATE public.enterprises SET package_id = enterprise_id WHERE LOWER(billing_plan) = 'enterprise';
  
  -- If we don't want to drop billing_plan yet (to avoid immediately breaking frontend APIs), we can just keep it and sync it.
  -- Alternatively, since we update the API, we can just leave billing_plan as a legacy string column for now, but use package_id going forward.
END $$;
