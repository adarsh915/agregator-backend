-- ============================================
-- KAEL AGGREGATOR RBAC SCHEMA - PRODUCTION
-- Run this AFTER schema-improved.sql
-- ============================================

-- ============================================
-- 1. PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- e.g., 'enterprises.create'
  display_name TEXT NOT NULL,          -- e.g., 'Create Enterprise'
  description TEXT,
  resource TEXT NOT NULL,              -- e.g., 'enterprises', 'users', 'roles'
  action TEXT NOT NULL,                -- e.g., 'create', 'read', 'update', 'delete', 'manage'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_permission_action 
    CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
  CONSTRAINT chk_permission_name_format 
    CHECK (name ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

CREATE INDEX idx_permissions_resource ON public.permissions(resource);

COMMENT ON TABLE public.permissions IS 'Granular permissions for RBAC system';
COMMENT ON COLUMN public.permissions.name IS 'Unique permission identifier (resource.action format)';
COMMENT ON COLUMN public.permissions.action IS 'Action type: create, read, update, delete, manage';

-- ============================================
-- 2. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- e.g., 'admin', 'viewer', 'billing_manager'
  display_name TEXT NOT NULL,          -- e.g., 'Administrator'
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,   -- system roles can't be deleted
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.aggregator_users(id),
  updated_by UUID REFERENCES public.aggregator_users(id),
  
  CONSTRAINT chk_role_name_format 
    CHECK (name ~ '^[a-z][a-z0-9_]*$')
);

CREATE INDEX idx_roles_is_active 
  ON public.roles(is_active) 
  WHERE is_active = TRUE;

COMMENT ON TABLE public.roles IS 'User roles for RBAC system';
COMMENT ON COLUMN public.roles.is_system IS 'System roles cannot be deleted';
COMMENT ON COLUMN public.roles.name IS 'Unique role identifier (lowercase_snake_case)';


-- ============================================
-- 3. ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES public.aggregator_users(id),
  
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id 
  ON public.role_permissions(permission_id);

COMMENT ON TABLE public.role_permissions IS 'Many-to-many mapping between roles and permissions';

-- ============================================
-- 4. USER_ROLES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES public.aggregator_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.aggregator_users(id),
  
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id 
  ON public.user_roles(role_id);

COMMENT ON TABLE public.user_roles IS 'Many-to-many mapping between users and roles (supports multiple roles per user)';


-- ============================================
-- 5. PREVENT DELETING LAST SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION prevent_last_super_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  remaining_super_admins INT;
BEGIN
  -- Count active super admins EXCLUDING the one being removed
  SELECT COUNT(*) INTO remaining_super_admins
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.aggregator_users u ON u.id = ur.user_id
  WHERE r.name = 'super_admin'
    AND u.is_active = TRUE
    AND ur.user_id != COALESCE(OLD.user_id, '00000000-0000-0000-0000-000000000000');
  
  IF remaining_super_admins < 1 THEN
    RAISE EXCEPTION 'Cannot remove the last active super_admin role assignment';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_last_super_admin_removal
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_super_admin_removal();

COMMENT ON FUNCTION prevent_last_super_admin_removal IS 'Prevents deleting the last active super admin role assignment';

-- ============================================
-- 6. PREVENT DEACTIVATING LAST SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION prevent_last_super_admin_deactivation()
RETURNS TRIGGER AS $$
DECLARE
  remaining_super_admins INT;
BEGIN
  -- Only check if user is being deactivated
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    -- Count active super admins EXCLUDING the one being deactivated
    SELECT COUNT(*) INTO remaining_super_admins
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.aggregator_users u ON u.id = ur.user_id
    WHERE r.name = 'super_admin'
      AND u.is_active = TRUE
      AND u.id != OLD.id;
    
    IF remaining_super_admins < 1 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active super_admin user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_last_super_admin_deactivation
  BEFORE UPDATE ON public.aggregator_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_super_admin_deactivation();

COMMENT ON FUNCTION prevent_last_super_admin_deactivation IS 'Prevents deactivating the last active super admin user';


-- ============================================
-- 7. AUTO-UPDATE updated_at ON ROLES
-- ============================================
-- Reuses update_updated_at_column() already created for enterprises/aggregator_users
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;

-- Deny all access from anon/authenticated users
-- Only backend (service role) can access these tables
CREATE POLICY deny_all_permissions 
  ON public.permissions 
  FOR ALL TO anon, authenticated 
  USING (false) WITH CHECK (false);

CREATE POLICY deny_all_roles 
  ON public.roles 
  FOR ALL TO anon, authenticated 
  USING (false) WITH CHECK (false);

CREATE POLICY deny_all_role_permissions 
  ON public.role_permissions 
  FOR ALL TO anon, authenticated 
  USING (false) WITH CHECK (false);

CREATE POLICY deny_all_user_roles 
  ON public.user_roles 
  FOR ALL TO anon, authenticated 
  USING (false) WITH CHECK (false);

COMMENT ON POLICY deny_all_permissions ON public.permissions IS 'Server-side only access via service role';
COMMENT ON POLICY deny_all_roles ON public.roles IS 'Server-side only access via service role';
COMMENT ON POLICY deny_all_role_permissions ON public.role_permissions IS 'Server-side only access via service role';
COMMENT ON POLICY deny_all_user_roles ON public.user_roles IS 'Server-side only access via service role';

-- ============================================
-- RBAC SCHEMA CREATED SUCCESSFULLY
-- ============================================
-- Next steps:
-- 1. Run: npm run seed:rbac (to seed permissions and roles)
-- 2. Assign super_admin role to first user
-- 3. Test RBAC APIs
