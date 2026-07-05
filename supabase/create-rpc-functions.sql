-- ============================================
-- RPC FUNCTION: Get User Permissions
-- ============================================
-- This function efficiently retrieves all permissions for a user
-- by joining user_roles -> roles -> role_permissions -> permissions

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name::TEXT
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id AND r.is_active = true
  INNER JOIN role_permissions rp ON r.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.revoked_at IS NULL;
END;
$$;

-- ============================================
-- RPC FUNCTION: Check User Permission
-- ============================================
-- Quick check if user has a specific permission

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON ur.role_id = r.id AND r.is_active = true
    INNER JOIN role_permissions rp ON r.id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.name = p_permission_name
      AND ur.revoked_at IS NULL
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Test the function (replace with your admin user ID)
-- SELECT * FROM get_user_permissions('your-admin-user-id-here');
