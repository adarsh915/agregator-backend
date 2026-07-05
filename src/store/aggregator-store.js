const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

class AggregatorStore {
  constructor() {
    if (!env.supabaseUrl || !env.supabaseSecretKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
    }

    this.client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' }
    });
  }

  // ============================================
  // BILLING PACKAGES
  // ============================================

  async listPackages(includeInactive = false) {
    let query = this.client.from('billing_packages').select('*');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    query = query.order('price_monthly', { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      priceMonthly: pkg.price_monthly,
      priceYearly: pkg.price_yearly,
      features: pkg.features,
      isActive: pkg.is_active,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at
    }));
  }

  async getPackageById(packageId) {
    const { data, error } = await this.client
      .from('billing_packages')
      .select('*')
      .eq('id', packageId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      priceMonthly: data.price_monthly,
      priceYearly: data.price_yearly,
      features: data.features,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async createPackage(pkgData) {
    const { data, error } = await this.client
      .from('billing_packages')
      .insert([{
        name: pkgData.name,
        description: pkgData.description,
        price_monthly: pkgData.priceMonthly || 0,
        price_yearly: pkgData.priceYearly || 0,
        features: pkgData.features || [],
        is_active: pkgData.isActive !== false
      }])
      .select()
      .single();

    if (error) throw error;
    return { id: data.id, name: data.name };
  }

  async updatePackage(packageId, updates) {
    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.priceMonthly !== undefined) row.price_monthly = updates.priceMonthly;
    if (updates.priceYearly !== undefined) row.price_yearly = updates.priceYearly;
    if (updates.features !== undefined) row.features = updates.features;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;

    const { data, error } = await this.client
      .from('billing_packages')
      .update(row)
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw error;
    return { id: data.id, name: data.name };
  }

  async softDeletePackage(packageId) {
    const { data, error } = await this.client
      .from('billing_packages')
      .update({ is_active: false })
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw error;
    return { id: data.id, isActive: data.is_active };
  }

  // ============================================
  // AGGREGATOR USERS
  // ============================================

  async getAggregatorUserByEmail(email) {
    const { data, error } = await this.client
      .from('aggregator_users')
      .select('*')
      .eq('email', String(email || '').toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      isActive: data.is_active,
      passwordHash: data.password_hash,
      createdAt: data.created_at
    };
  }

  async getAggregatorUserById(userId) {
    const { data, error } = await this.client
      .from('aggregator_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Check if user has super_admin role from RBAC system
    const { data: userRoles } = await this.client
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(name)
      `)
      .eq('user_id', userId);

    const hasSuperAdminRole = userRoles?.some(ur => ur.roles?.name === 'super_admin');

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: hasSuperAdminRole ? 'super_admin' : data.role, // Use RBAC role if available
      isActive: data.is_active,
      passwordHash: data.password_hash,
      createdAt: data.created_at
    };
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  async getUserProfile(userId) {
    const { data, error} = await this.client
      .from('aggregator_users')
      .select('id, email, display_name, role, is_active, created_at, updated_at, last_login_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastLoginAt: data.last_login_at
    };
  }

  async updateUserProfile(userId, updates) {
    const row = {};
    
    if (updates.displayName !== undefined) {
      row.display_name = updates.displayName;
    }
    
    if (updates.email !== undefined) {
      row.email = String(updates.email).toLowerCase();
    }

    // Always update the timestamp
    row.updated_at = new Date().toISOString();

    const { data, error } = await this.client
      .from('aggregator_users')
      .update(row)
      .eq('id', userId)
      .select('id, email, display_name, role, is_active, created_at, updated_at, last_login_at')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastLoginAt: data.last_login_at
    };
  }

  async updateUserPassword(userId, newPasswordHash) {
    const { error } = await this.client
      .from('aggregator_users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async verifyUserPassword(userId, passwordToVerify) {
    const { data, error } = await this.client
      .from('aggregator_users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data.password_hash;
  }

  // ============================================
  // SESSIONS
  // ============================================

  async createSession(token, session) {
    const payload = {
      token,
      user_id: session.userId,
      email: session.email,
      issued_at: new Date(session.issuedAt).toISOString(),
      expires_at: new Date(session.expiresAt).toISOString()
    };

    const { error } = await this.client
      .from('aggregator_sessions')
      .upsert(payload, { onConflict: 'token' });

    if (error) throw error;
  }

  async getSession(token) {
    const { data, error } = await this.client
      .from('aggregator_sessions')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Check if expired
    if (Date.now() >= new Date(data.expires_at).getTime()) {
      await this.deleteSession(token);
      return null;
    }

    // Fetch user to get their current role
    const user = await this.getAggregatorUserById(data.user_id);
    
    return {
      isAuthenticated: true,
      email: data.email,
      userId: data.user_id,
      authToken: data.token,
      role: user?.role || null, // ✅ Add role from user table
      issuedAt: new Date(data.issued_at).getTime(),
      expiresAt: new Date(data.expires_at).getTime()
    };
  }

  async deleteSession(token) {
    const { error } = await this.client
      .from('aggregator_sessions')
      .delete()
      .eq('token', token);

    if (error) throw error;
  }

  // ============================================
  // ENTERPRISES CRUD
  // ============================================

  async getEnterprises() {
    const { data, error } = await this.client
      .from('enterprises')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapEnterpriseRow);
  }

  async getEnterpriseById(id) {
    const { data, error } = await this.client
      .from('enterprises')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapEnterpriseRow(data);
  }

  async createEnterprise(enterprise, createdBy) {
    const row = {
      // UUID generated automatically by database
      enterprise_name: enterprise.name,
      logo_url: enterprise.logoUrl || null,
      logo_storage_path: enterprise.logoStoragePath || null,
      general_phone: enterprise.generalPhone || null,
      general_email: enterprise.generalEmail,
      api_url: enterprise.apiUrl || null,
      
      // Tax/Legal
      gstin_number: enterprise.gstinNumber,
      pan_card_number: enterprise.panNumber,
      
      // HQ Address
      hq_street_details: enterprise.hqStreet || null,
      hq_city: enterprise.hqCity || null,
      hq_state: enterprise.hqState || null,
      hq_pincode: enterprise.hqPincode || null,
      
      // Status
      status: enterprise.status || 'active',
      
      // Billing
      package_id: enterprise.packageId || null,
      billing_plan: enterprise.billingPlan || 'starter',
      billing_cycle: enterprise.billingCycle || 'monthly',
      billing_amount: enterprise.billingAmount || 0,
      next_billing_date: enterprise.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // Contact Person
      contact_name: enterprise.contactName,
      contact_designation: enterprise.contactDesignation || null,
      contact_email: enterprise.contactEmail,
      contact_phone: enterprise.contactPhone || null,
      
      // Audit
      created_by: createdBy || null
    };

    const { data, error } = await this.client
      .from('enterprises')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    return this.mapEnterpriseRow(data);
  }

  async updateEnterprise(id, updates, updatedBy) {
    const row = {};

    // Basic Info
    if (updates.name !== undefined) row.enterprise_name = updates.name;
    if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl;
    if (updates.logoStoragePath !== undefined) row.logo_storage_path = updates.logoStoragePath;
    if (updates.generalPhone !== undefined) row.general_phone = updates.generalPhone;
    if (updates.generalEmail !== undefined) row.general_email = updates.generalEmail;
    if (updates.apiUrl !== undefined) row.api_url = updates.apiUrl;
    
    // Tax/Legal
    if (updates.gstinNumber !== undefined) row.gstin_number = updates.gstinNumber;
    if (updates.panNumber !== undefined) row.pan_card_number = updates.panNumber;
    
    // HQ Address
    if (updates.hqStreet !== undefined) row.hq_street_details = updates.hqStreet;
    if (updates.hqCity !== undefined) row.hq_city = updates.hqCity;
    if (updates.hqState !== undefined) row.hq_state = updates.hqState;
    if (updates.hqPincode !== undefined) row.hq_pincode = updates.hqPincode;
    
    // Status
    if (updates.status !== undefined) row.status = updates.status;
    
    // Billing
    if (updates.packageId !== undefined) row.package_id = updates.packageId;
    if (updates.billingPlan !== undefined) row.billing_plan = updates.billingPlan;
    if (updates.billingCycle !== undefined) row.billing_cycle = updates.billingCycle;
    if (updates.billingAmount !== undefined) row.billing_amount = updates.billingAmount;
    if (updates.nextBillingDate !== undefined) row.next_billing_date = updates.nextBillingDate;
    
    // Contact Person
    if (updates.contactName !== undefined) row.contact_name = updates.contactName;
    if (updates.contactDesignation !== undefined) row.contact_designation = updates.contactDesignation;
    if (updates.contactEmail !== undefined) row.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) row.contact_phone = updates.contactPhone;
    
    // Audit
    if (updatedBy) row.updated_by = updatedBy;

    const { data, error } = await this.client
      .from('enterprises')
      .update(row)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    return this.mapEnterpriseRow(data);
  }

  async deleteEnterprise(id, deletedBy) {
    // Soft delete
    const { error } = await this.client
      .from('enterprises')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy || null
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async restoreEnterprise(id, updatedBy) {
    // Restore soft-deleted enterprise
    const { error } = await this.client
      .from('enterprises')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        updated_by: updatedBy || null
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async getEnterpriseStats() {
    const { data, error } = await this.client
      .from('enterprises')
      .select('status, billing_plan, billing_cycle, billing_amount, created_at')
      .eq('is_deleted', false);

    if (error) throw error;

    const rows = data || [];

    // Status counts
    const total = rows.length;
    const active = rows.filter(r => r.status === 'active').length;
    const inactive = rows.filter(r => r.status === 'inactive').length;
    const suspended = rows.filter(r => r.status === 'suspended').length;

    // Plan counts
    const planCounts = { starter: 0, professional: 0, enterprise: 0 };
    const revenueByPlan = { starter: 0, professional: 0, enterprise: 0 };

    // MRR: convert each active enterprise billing to monthly equivalent
    let mrr = 0;
    rows.forEach(r => {
      const plan = r.billing_plan || 'starter';
      if (plan in planCounts) planCounts[plan]++;

      if (r.status === 'active') {
        let monthly = Number(r.billing_amount) || 0;
        if (r.billing_cycle === 'yearly')      monthly = monthly / 12;
        else if (r.billing_cycle === 'quarterly') monthly = monthly / 3;
        mrr += monthly;
        if (plan in revenueByPlan) revenueByPlan[plan] += monthly;
      }
    });

    // Revenue growth trend: bucket enterprise onboarding by month (last 6 months)
    const now = new Date();
    const monthLabels = [];
    const monthlyOnboarded = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const count = rows.filter(r => {
        const created = new Date(r.created_at);
        return created.getFullYear() === yr && created.getMonth() === mo;
      }).length;
      monthLabels.push(label);
      monthlyOnboarded.push(count);
    }

    return {
      total,
      active,
      inactive,
      suspended,
      mrr: Math.round(mrr),
      planCounts,
      revenueByPlan: {
        starter: Math.round(revenueByPlan.starter),
        professional: Math.round(revenueByPlan.professional),
        enterprise: Math.round(revenueByPlan.enterprise),
      },
      trend: { labels: monthLabels, onboarded: monthlyOnboarded },
    };
  }

  // ============================================
  // RBAC - PERMISSIONS
  // ============================================

  async getAllPermissions() {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      resource: row.resource,
      action: row.action,
      createdAt: row.created_at
    }));
  }

  async getPermissionsByResource(resource) {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .eq('resource', resource)
      .order('action', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      resource: row.resource,
      action: row.action,
      createdAt: row.created_at
    }));
  }

  // ============================================
  // RBAC - ROLES
  // ============================================

  async getAllRoles() {
    const { data, error } = await this.client
      .from('roles')
      .select(`
        *,
        role_permissions (
          permission_id
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      isSystem: row.is_system,
      isActive: row.is_active,
      permissionCount: row.role_permissions?.length || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    }));
  }

  async getRoleById(roleId) {
    const { data, error } = await this.client
      .from('roles')
      .select(`
        *,
        role_permissions (
          permission:permissions (
            id,
            name,
            display_name,
            description,
            resource,
            action
          )
        )
      `)
      .eq('id', roleId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      isSystem: data.is_system,
      isActive: data.is_active,
      permissions: (data.role_permissions || []).map(rp => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.display_name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    };
  }

  async createRole(role, createdBy) {
    const row = {
      name: role.name,
      display_name: role.displayName,
      description: role.description || null,
      is_system: false,
      is_active: true,
      created_by: createdBy || null
    };

    const { data, error } = await this.client
      .from('roles')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      isSystem: data.is_system,
      isActive: data.is_active
    };
  }

  async updateRole(roleId, updates, updatedBy) {
    const row = {};
    
    // Only allow updating certain fields
    if (updates.displayName !== undefined) row.display_name = updates.displayName;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;
    if (updatedBy) row.updated_by = updatedBy;

    const { data, error } = await this.client
      .from('roles')
      .update(row)
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      isSystem: data.is_system,
      isActive: data.is_active
    };
  }

  async deleteRole(roleId) {
    const { error } = await this.client
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
    return true;
  }

  // ============================================
  // RBAC - ROLE PERMISSIONS
  // ============================================

  async getRolePermissions(roleId) {
    const { data, error } = await this.client
      .from('role_permissions')
      .select(`
        permission:permissions (
          id,
          name,
          display_name,
          resource,
          action
        )
      `)
      .eq('role_id', roleId);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.permission.id,
      name: row.permission.name,
      displayName: row.permission.display_name,
      resource: row.permission.resource,
      action: row.permission.action
    }));
  }

  async setRolePermissions(roleId, permissionIds, grantedBy) {
    // Delete existing permissions
    await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Insert new permissions
    if (permissionIds && permissionIds.length > 0) {
      const rows = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId,
        granted_by: grantedBy || null
      }));

      const { error } = await this.client
        .from('role_permissions')
        .insert(rows);

      if (error) throw error;
    }

    return true;
  }

  async addRolePermissions(roleId, permissionIds, grantedBy) {
    const rows = permissionIds.map(permId => ({
      role_id: roleId,
      permission_id: permId,
      granted_by: grantedBy || null
    }));

    const { error } = await this.client
      .from('role_permissions')
      .upsert(rows, { onConflict: 'role_id,permission_id' });

    if (error) throw error;
    return true;
  }

  async removeRolePermissions(roleId, permissionIds) {
    const { error } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .in('permission_id', permissionIds);

    if (error) throw error;
    return true;
  }

  // ============================================
  // RBAC - USER ROLES
  // ============================================

  async getUserRoles(userId) {
    const { data, error } = await this.client
      .from('user_roles')
      .select(`
        role:roles (
          id,
          name,
          display_name,
          is_system,
          is_active
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.role.id,
      name: row.role.name,
      displayName: row.role.display_name,
      isSystem: row.role.is_system,
      isActive: row.role.is_active
    }));
  }

  async getUserPermissions(userId) {
    try {
      // Use manual query (more reliable than RPC)
      const { data: manualData, error: manualError } = await this.client
        .from('user_roles')
        .select(`
          role:roles!inner (
            role_permissions!inner (
              permission:permissions (
                name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .is('revoked_at', null); // Only active role assignments

      if (manualError) {
        console.error('Error fetching user permissions:', manualError);
        throw manualError;
      }

      // Extract unique permission names
      const permissions = new Set();
      (manualData || []).forEach(ur => {
        if (ur.role && ur.role.role_permissions) {
          ur.role.role_permissions.forEach(rp => {
            if (rp.permission && rp.permission.name) {
              permissions.add(rp.permission.name);
            }
          });
        }
      });

      const permArray = Array.from(permissions);
      console.log(`User ${userId} has permissions:`, permArray);
      return permArray;

    } catch (error) {
      console.error('getUserPermissions error:', error);
      throw error;
    }
  }

  async setUserRoles(userId, roleIds, assignedBy) {
    // Delete existing roles
    await this.client
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Insert new roles
    if (roleIds && roleIds.length > 0) {
      const rows = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy || null
      }));

      const { error } = await this.client
        .from('user_roles')
        .insert(rows);

      if (error) throw error;
    }

    return true;
  }

  async addUserRole(userId, roleId, assignedBy) {
    const { error } = await this.client
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy || null
      }, { onConflict: 'user_id,role_id' });

    if (error) throw error;
    return true;
  }

  async removeUserRole(userId, roleId) {
    const { error } = await this.client
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) throw error;
    return true;
  }

  // ============================================
  // RBAC - USER MANAGEMENT
  // ============================================

  async getAllUsers() {
    const { data, error } = await this.client
      .from('aggregator_users')
      .select(`
        *,
        user_roles!user_roles_user_id_fkey (
          role:roles (
            id,
            name,
            display_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      isActive: row.is_active,
      roles: (row.user_roles || []).map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.display_name
      })),
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    }));
  }

  async createUser(user, createdBy) {
    const row = {
      email: user.email.toLowerCase(),
      display_name: user.displayName,
      password_hash: user.passwordHash,
      is_active: true
    };

    const { data, error } = await this.client
      .from('aggregator_users')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    // Assign roles if provided
    if (user.roleIds && user.roleIds.length > 0) {
      await this.setUserRoles(data.id, user.roleIds, createdBy);
    }

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      isActive: data.is_active
    };
  }

  async updateUser(userId, updates) {
    const row = {};
    
    if (updates.displayName !== undefined) row.display_name = updates.displayName;
    if (updates.isActive !== undefined) row.is_active = updates.isActive;
    if (updates.passwordHash !== undefined) row.password_hash = updates.passwordHash;

    const { data, error } = await this.client
      .from('aggregator_users')
      .update(row)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      isActive: data.is_active
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  mapEnterpriseRow(row) {
    return {
      id: row.id,
      name: row.enterprise_name,
      logoUrl: row.logo_url,
      logoStoragePath: row.logo_storage_path,
      generalPhone: row.general_phone,
      generalEmail: row.general_email,
      apiUrl: row.api_url,
      
      // Tax/Legal
      gstinNumber: row.gstin_number,
      panNumber: row.pan_card_number,
      
      // HQ Address
      hqStreet: row.hq_street_details,
      hqCity: row.hq_city,
      hqState: row.hq_state,
      hqPincode: row.hq_pincode,
      
      // Status
      status: row.status,
      
      // Billing
      packageId: row.package_id,
      billingPlan: row.billing_plan,
      billingCycle: row.billing_cycle,
      billingAmount: parseFloat(row.billing_amount || 0),
      nextBillingDate: row.next_billing_date,
      
      // Contact Person
      contactName: row.contact_name,
      contactDesignation: row.contact_designation,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      
      // Audit
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      
      // Soft Delete
      isDeleted: row.is_deleted,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by
    };
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  // Helper: Calculate next billing date
  calculateNextBillingDate(currentDate, billingCycle) {
    const date = new Date(currentDate);
    switch(billingCycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  }

  // Helper: Calculate period end date
  calculatePeriodEnd(startDate, billingCycle) {
    const date = new Date(startDate);
    switch(billingCycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    date.setDate(date.getDate() - 1); // End is one day before next period starts
    return date.toISOString().split('T')[0];
  }

  // Create subscription for enterprise
  async createSubscription(enterpriseId, packageId, packageName, billingCycle, amount, createdBy) {
    const startDate = new Date().toISOString().split('T')[0];
    const currentPeriodStart = startDate;
    const currentPeriodEnd = this.calculatePeriodEnd(startDate, billingCycle);
    const nextBillingDate = this.calculateNextBillingDate(startDate, billingCycle);

    const { data, error } = await this.client
      .from('subscriptions')
      .insert({
        enterprise_id: enterpriseId,
        package_id: packageId,
        package_name: packageName,
        billing_cycle: billingCycle,
        amount_per_cycle: amount,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        status: 'active',
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscriptionRow(data);
  }

  // Get subscription by enterprise ID
  async getSubscriptionByEnterprise(enterpriseId) {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapSubscriptionRow(data);
  }

  // Update subscription
  async updateSubscription(subscriptionId, updates, updatedBy) {
    const row = {};
    
    if (updates.packageId !== undefined) row.package_id = updates.packageId;
    if (updates.packageName !== undefined) row.package_name = updates.packageName;
    if (updates.billingCycle !== undefined) row.billing_cycle = updates.billingCycle;
    if (updates.amountPerCycle !== undefined) row.amount_per_cycle = updates.amountPerCycle;
    if (updates.nextBillingDate !== undefined) row.next_billing_date = updates.nextBillingDate;
    if (updates.currentPeriodStart !== undefined) row.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) row.current_period_end = updates.currentPeriodEnd;
    if (updates.status !== undefined) row.status = updates.status;
    
    row.updated_at = new Date().toISOString();
    if (updatedBy) row.updated_by = updatedBy;

    const { data, error } = await this.client
      .from('subscriptions')
      .update(row)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscriptionRow(data);
  }

  // Get subscriptions due for renewal (next_billing_date <= today)
  async getDueSubscriptions() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_billing_date', today);

    if (error) throw error;
    return (data || []).map(row => this.mapSubscriptionRow(row));
  }

  // Map subscription row
  mapSubscriptionRow(row) {
    return {
      id: row.id,
      enterpriseId: row.enterprise_id,
      packageId: row.package_id,
      packageName: row.package_name,
      billingCycle: row.billing_cycle,
      amountPerCycle: parseFloat(row.amount_per_cycle),
      startDate: row.start_date,
      nextBillingDate: row.next_billing_date,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  // ============================================
  // BILLING RECORDS
  // ============================================

  // Create billing record
  async createBillingRecord(subscriptionId, enterpriseId, periodStart, periodEnd, billingCycle, packageName, amount) {
    const taxRate = 0.18; // 18% GST
    const subtotal = parseFloat(amount);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    // Due date is 15 days after period start
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const { data, error } = await this.client
      .from('billing_records')
      .insert({
        subscription_id: subscriptionId,
        enterprise_id: enterpriseId,
        period_start: periodStart,
        period_end: periodEnd,
        billing_cycle: billingCycle,
        package_name: packageName,
        amount: subtotal,
        tax_percentage: 18.00,
        tax_amount: taxAmount,
        total_amount: total,
        due_date: dueDateStr,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapBillingRecordRow(data);
  }

  // Get all billing records with filters
  async getAllBillingRecords(filters = {}) {
    let query = this.client
      .from('billing_records')
      .select(`
        *,
        enterprise:enterprises(id, enterprise_name)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.enterpriseId) {
      query = query.eq('enterprise_id', filters.enterpriseId);
    }
    if (filters.startDate) {
      query = query.gte('period_start', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('period_end', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => this.mapBillingRecordRow(row));
  }

  // Get billing records for enterprise
  async getEnterpriseBillingRecords(enterpriseId) {
    const { data, error } = await this.client
      .from('billing_records')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('period_start', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => this.mapBillingRecordRow(row));
  }

  // Get billing record by ID
  async getBillingRecordById(billingRecordId) {
    const { data, error } = await this.client
      .from('billing_records')
      .select(`
        *,
        subscription:subscriptions(*),
        enterprise:enterprises(*)
      `)
      .eq('id', billingRecordId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapBillingRecordRow(data);
  }

  // Mark billing record as paid
  async markBillingRecordPaid(billingRecordId, paymentMethod, paymentReference) {
    const { data, error } = await this.client
      .from('billing_records')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', billingRecordId)
      .select()
      .single();

    if (error) throw error;
    return this.mapBillingRecordRow(data);
  }

  // Update billing record status
  async updateBillingRecordStatus(billingRecordId, status) {
    const { data, error } = await this.client
      .from('billing_records')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', billingRecordId)
      .select()
      .single();

    if (error) throw error;
    return this.mapBillingRecordRow(data);
  }

  // Get billing statistics
  async getBillingStats() {
    const { data, error } = await this.client
      .from('billing_records')
      .select('status, total_amount');

    if (error) throw error;

    const records = data || [];
    
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    records.forEach(record => {
      const amount = parseFloat(record.total_amount || 0);
      totalRevenue += amount;

      switch(record.status) {
        case 'paid':
          totalPaid += amount;
          paidCount++;
          break;
        case 'pending':
          totalPending += amount;
          pendingCount++;
          break;
        case 'overdue':
          totalOverdue += amount;
          overdueCount++;
          break;
      }
    });

    return {
      totalRevenue: Math.round(totalRevenue),
      totalPaid: Math.round(totalPaid),
      totalPending: Math.round(totalPending),
      totalOverdue: Math.round(totalOverdue),
      recordCount: records.length,
      paidCount,
      pendingCount,
      overdueCount
    };
  }

  // Get subscription MRR/ARR
  async getSubscriptionMetrics() {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('billing_cycle, amount_per_cycle, status');

    if (error) throw error;

    const subscriptions = data || [];
    
    let mrr = 0; // Monthly Recurring Revenue
    let activeCount = 0;
    let pausedCount = 0;
    let cancelledCount = 0;

    subscriptions.forEach(sub => {
      const amount = parseFloat(sub.amount_per_cycle || 0);
      
      switch(sub.status) {
        case 'active':
          activeCount++;
          // Convert to monthly
          let monthly = amount;
          if (sub.billing_cycle === 'yearly') monthly = amount / 12;
          else if (sub.billing_cycle === 'quarterly') monthly = amount / 3;
          mrr += monthly;
          break;
        case 'paused':
          pausedCount++;
          break;
        case 'cancelled':
          cancelledCount++;
          break;
      }
    });

    const arr = mrr * 12; // Annual Recurring Revenue

    return {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      activeSubscriptions: activeCount,
      pausedSubscriptions: pausedCount,
      cancelledSubscriptions: cancelledCount,
      totalSubscriptions: subscriptions.length
    };
  }

  // Map billing record row
  mapBillingRecordRow(row) {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      enterpriseId: row.enterprise_id,
      enterpriseName: row.enterprise?.enterprise_name || null,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      billingCycle: row.billing_cycle,
      packageName: row.package_name,
      amount: parseFloat(row.amount),
      taxPercentage: parseFloat(row.tax_percentage),
      taxAmount: parseFloat(row.tax_amount),
      totalAmount: parseFloat(row.total_amount),
      dueDate: row.due_date,
      status: row.status,
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  async insertAuditLog(entry) {
    const row = {
      actor_id: entry.actorId || null,
      actor_email: entry.actorEmail || '',
      actor_name: entry.actorName || entry.actorEmail || '',
      action: entry.action || '',
      resource_type: entry.resourceType || '',
      resource_id: entry.resourceId || '',
      resource_name: entry.resourceName || '',
      http_method: entry.httpMethod || '',
      http_path: entry.httpPath || '',
      ip_address: entry.ipAddress || '',
      user_agent: entry.userAgent || '',
      old_values: entry.oldValues || null,
      new_values: entry.newValues || null,
      status: entry.status || 'success',
      error_message: entry.errorMessage || null
    };

    const { error } = await this.client
      .from('aggregator_audit_logs')
      .insert(row);

    if (error) throw error;
    return true;
  }

  async queryAuditLogs(filters = {}) {
    let query = this.client
      .from('aggregator_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.from) {
      query = query.gte('created_at', filters.from);
    }
    if (filters.to) {
      query = query.lte('created_at', filters.to);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Get total count
    const { count: totalCount } = await this.client
      .from('aggregator_audit_logs')
      .select('*', { count: 'exact', head: true });

    return {
      logs: (data || []).map(row => ({
        id: row.id,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        actorName: row.actor_name,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        resourceName: row.resource_name,
        httpMethod: row.http_method,
        httpPath: row.http_path,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        oldValues: row.old_values,
        newValues: row.new_values,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at
      })),
      page,
      limit,
      total: totalCount || 0
    };
  }

  async getDistinctAuditActors() {
    const { data, error } = await this.client
      .from('aggregator_audit_logs')
      .select('actor_id, actor_email, actor_name')
      .not('actor_id', 'is', null)
      .order('actor_email', { ascending: true });

    if (error) throw error;

    // Get unique actors
    const actorsMap = new Map();
    (data || []).forEach(row => {
      if (row.actor_id && !actorsMap.has(row.actor_id)) {
        actorsMap.set(row.actor_id, {
          id: row.actor_id,
          email: row.actor_email,
          name: row.actor_name
        });
      }
    });

    return Array.from(actorsMap.values());
  }

}

module.exports = { AggregatorStore };
