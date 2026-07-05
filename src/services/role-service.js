const { invalidateRolePermissions } = require('../middleware/check-permission');

class RoleService {
  constructor({ store }) {
    this.store = store;
  }

  async listRoles() {
    try {
      const roles = await this.store.getAllRoles();
      return { ok: true, roles };
    } catch (error) {
      console.error('Error listing roles:', error);
      return { ok: false, error: 'Failed to list roles' };
    }
  }

  async getRoleById(roleId) {
    try {
      const role = await this.store.getRoleById(roleId);
      
      if (!role) {
        return { ok: false, error: 'Role not found' };
      }

      return { ok: true, role };
    } catch (error) {
      console.error('Error getting role:', error);
      return { ok: false, error: 'Failed to get role' };
    }
  }

  async createRole(data, createdBy) {
    // Validate required fields
    if (!data.name || !data.displayName) {
      return { 
        ok: false, 
        error: 'Required fields: name, displayName' 
      };
    }

    // Validate role name format (lowercase_snake_case)
    const nameRegex = /^[a-z][a-z0-9_]*$/;
    if (!nameRegex.test(data.name)) {
      return { 
        ok: false, 
        error: 'Role name must be lowercase_snake_case (e.g., billing_manager)' 
      };
    }

    try {
      // Create role
      const role = await this.store.createRole({
        name: data.name,
        displayName: data.displayName,
        description: data.description
      }, createdBy);

      // Assign permissions if provided
      if (data.permissionIds && data.permissionIds.length > 0) {
        await this.store.setRolePermissions(role.id, data.permissionIds, createdBy);
      }

      // Get full role with permissions
      const fullRole = await this.store.getRoleById(role.id);

      return { ok: true, role: fullRole };
    } catch (error) {
      console.error('Error creating role:', error);
      
      // Handle unique constraint violations
      if (error.message && error.message.includes('duplicate')) {
        return { ok: false, error: 'Role name already exists' };
      }
      
      return { ok: false, error: 'Failed to create role' };
    }
  }

  async updateRole(roleId, data, updatedBy) {
    try {
      // Check if role exists
      const existing = await this.store.getRoleById(roleId);
      if (!existing) {
        return { ok: false, error: 'Role not found' };
      }

      // Cannot modify system roles' name
      if (existing.isSystem && data.name && data.name !== existing.name) {
        return { ok: false, error: 'Cannot modify system role name' };
      }

      // Update role
      const role = await this.store.updateRole(roleId, {
        displayName: data.displayName,
        description: data.description,
        isActive: data.isActive
      }, updatedBy);

      // Invalidate permission cache for all users with this role
      await invalidateRolePermissions(this.store, roleId);

      return { ok: true, role };
    } catch (error) {
      console.error('Error updating role:', error);
      return { ok: false, error: 'Failed to update role' };
    }
  }

  async deleteRole(roleId) {
    try {
      // Check if role exists
      const existing = await this.store.getRoleById(roleId);
      if (!existing) {
        return { ok: false, error: 'Role not found' };
      }

      // Cannot delete system roles
      if (existing.isSystem) {
        return { ok: false, error: 'Cannot delete system roles' };
      }

      // Delete role
      await this.store.deleteRole(roleId);

      // Invalidate permission cache
      await invalidateRolePermissions(this.store, roleId);

      return { ok: true, message: 'Role deleted successfully' };
    } catch (error) {
      console.error('Error deleting role:', error);
      return { ok: false, error: 'Failed to delete role' };
    }
  }

  // ============================================
  // ROLE PERMISSIONS MANAGEMENT
  // ============================================

  async getRolePermissions(roleId) {
    try {
      const permissions = await this.store.getRolePermissions(roleId);
      return { ok: true, permissions };
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return { ok: false, error: 'Failed to get role permissions' };
    }
  }

  async setRolePermissions(roleId, permissionIds, grantedBy) {
    try {
      // Check if role exists
      const existing = await this.store.getRoleById(roleId);
      if (!existing) {
        return { ok: false, error: 'Role not found' };
      }

      // Validate permissionIds
      if (!Array.isArray(permissionIds)) {
        return { ok: false, error: 'permissionIds must be an array' };
      }

      // Replace all permissions
      await this.store.setRolePermissions(roleId, permissionIds, grantedBy);

      // Invalidate permission cache
      await invalidateRolePermissions(this.store, roleId);

      // Get updated permissions
      const permissions = await this.store.getRolePermissions(roleId);

      return { 
        ok: true, 
        message: 'Role permissions updated successfully',
        permissions 
      };
    } catch (error) {
      console.error('Error setting role permissions:', error);
      return { ok: false, error: 'Failed to set role permissions' };
    }
  }

  async addRolePermissions(roleId, permissionIds, grantedBy) {
    try {
      // Check if role exists
      const existing = await this.store.getRoleById(roleId);
      if (!existing) {
        return { ok: false, error: 'Role not found' };
      }

      // Validate permissionIds
      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        return { ok: false, error: 'permissionIds must be a non-empty array' };
      }

      // Add permissions
      await this.store.addRolePermissions(roleId, permissionIds, grantedBy);

      // Invalidate permission cache
      await invalidateRolePermissions(this.store, roleId);

      // Get updated permissions
      const permissions = await this.store.getRolePermissions(roleId);

      return { 
        ok: true, 
        message: `${permissionIds.length} permission(s) added successfully`,
        permissions 
      };
    } catch (error) {
      console.error('Error adding role permissions:', error);
      return { ok: false, error: 'Failed to add role permissions' };
    }
  }

  async removeRolePermissions(roleId, permissionIds) {
    try {
      // Check if role exists
      const existing = await this.store.getRoleById(roleId);
      if (!existing) {
        return { ok: false, error: 'Role not found' };
      }

      // Validate permissionIds
      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        return { ok: false, error: 'permissionIds must be a non-empty array' };
      }

      // Remove permissions
      await this.store.removeRolePermissions(roleId, permissionIds);

      // Invalidate permission cache
      await invalidateRolePermissions(this.store, roleId);

      // Get updated permissions
      const permissions = await this.store.getRolePermissions(roleId);

      return { 
        ok: true, 
        message: `${permissionIds.length} permission(s) removed successfully`,
        permissions 
      };
    } catch (error) {
      console.error('Error removing role permissions:', error);
      return { ok: false, error: 'Failed to remove role permissions' };
    }
  }
}

module.exports = { RoleService };
