-- Security fix migration: Add subscription and billing permissions
-- Run this in Supabase SQL editor (or via psql) after applying the security fixes.
-- Required by: H-1 fix (subscriptions.js and billing-records.js now use checkPermission)

-- Insert new permissions (ignore if already exists)
INSERT INTO permissions (name, display_name, resource, action, description)
VALUES
  ('subscriptions.read',   'View Subscriptions',    'subscriptions', 'read',   'View subscription details and metrics'),
  ('subscriptions.manage', 'Manage Subscriptions',  'subscriptions', 'manage', 'Update, pause, resume, cancel subscriptions'),
  ('billing.read',         'View Billing Records',  'billing',       'read',   'View billing records and statistics'),
  ('billing.manage',       'Manage Billing Records','billing',       'manage', 'Mark billing records as paid, update status')
ON CONFLICT (name) DO NOTHING;

-- Grant all new permissions to super_admin role
-- This ensures super_admin can still do everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name IN ('subscriptions.read','subscriptions.manage','billing.read','billing.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant read permissions to admin role (if it exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN ('subscriptions.read','billing.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verify
SELECT r.name AS role, p.name AS permission
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name IN ('subscriptions.read','subscriptions.manage','billing.read','billing.manage')
ORDER BY r.name, p.name;
