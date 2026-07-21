const bcrypt = require('bcryptjs');
const { invalidateUserPermissions } = require('../middleware/check-permission');

class UserService {
  constructor({ store }) {
    this.store = store;
  }

  async listUsers(options = {}) {
    try {
      const result = await this.store.getAllUsers(options);
      
      const limit = options.limit || 10;
      const page = options.page || 1;
      const totalPages = Math.ceil(result.total / limit);

      return { 
        ok: true, 
        users: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error listing users:', error);
      return { ok: false, error: 'Failed to list users' };
    }
  }

  async getStats() {
    try {
      const stats = await this.store.getUserStats();
      return { ok: true, stats };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { ok: false, error: 'Failed to get user stats' };
    }
  }

  async getUserById(userId) {
    try {
      const user = await this.store.getAggregatorUserById(userId);
      
      if (!user) {
        return { ok: false, error: 'User not found' };
      }

      // Get user roles
      const roles = await this.store.getUserRoles(userId);

      return { 
        ok: true, 
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          roles,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return { ok: false, error: 'Failed to get user' };
    }
  }

  async createUser(data, createdBy) {
    // Validate required fields
    if (!data.email || !data.displayName || !data.password) {
      return { 
        ok: false, 
        error: 'Required fields: email, displayName, password' 
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { ok: false, error: 'Invalid email format' };
    }

    // Validate password strength (minimum 8 characters — NIST SP 800-63B)
    if (data.password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters' };
    }

    try {
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await this.store.createUser({
        email: data.email,
        displayName: data.displayName,
        passwordHash,
        roleIds: data.roleIds || []
      }, createdBy);

      // Get user with roles
      const fullUser = await this.getUserById(user.id);

      return { 
        ok: true, 
        user: fullUser.user,
        message: 'User created successfully'
      };
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle unique constraint violations
      if (error.message && error.message.includes('duplicate')) {
        return { ok: false, error: 'Email already exists' };
      }
      
      return { ok: false, error: 'Failed to create user' };
    }
  }

  async updateUser(userId, data, updatedBy) {
    try {
      // Check if user exists
      const existing = await this.store.getAggregatorUserById(userId);
      if (!existing) {
        return { ok: false, error: 'User not found' };
      }

      const updates = {};

      // Update display name
      if (data.displayName) {
        updates.displayName = data.displayName;
      }

      // Update active status
      if (data.isActive !== undefined) {
        updates.isActive = data.isActive;
      }

      // Update password if provided
      if (data.password) {
        if (data.password.length < 8) {
          return { ok: false, error: 'Password must be at least 8 characters' };
        }
        updates.passwordHash = await bcrypt.hash(data.password, 10);
      }

      // Update user
      const user = await this.store.updateUser(userId, updates);

      return { ok: true, user, message: 'User updated successfully' };
    } catch (error) {
      console.error('Error updating user:', error);
      return { ok: false, error: 'Failed to update user' };
    }
  }

  // ============================================
  // USER ROLES MANAGEMENT
  // ============================================

  async getUserRoles(userId) {
    try {
      const roles = await this.store.getUserRoles(userId);
      return { ok: true, roles };
    } catch (error) {
      console.error('Error getting user roles:', error);
      return { ok: false, error: 'Failed to get user roles' };
    }
  }

  async getUserPermissions(userId) {
    try {
      const permissions = await this.store.getUserPermissions(userId);
      const roles = await this.store.getUserRoles(userId);

      return { 
        ok: true, 
        data: {
          userId,
          roles: roles.map(r => r.name),
          permissions
        }
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return { ok: false, error: 'Failed to get user permissions' };
    }
  }

  async setUserRoles(userId, roleIds, assignedBy) {
    try {
      // Check if user exists
      const existing = await this.store.getAggregatorUserById(userId);
      if (!existing) {
        return { ok: false, error: 'User not found' };
      }

      // Validate roleIds
      if (!Array.isArray(roleIds)) {
        return { ok: false, error: 'roleIds must be an array' };
      }

      // Replace all roles
      await this.store.setUserRoles(userId, roleIds, assignedBy);

      // Invalidate permission cache
      invalidateUserPermissions(userId);

      // Get updated roles
      const roles = await this.store.getUserRoles(userId);

      return { 
        ok: true, 
        message: 'User roles updated successfully',
        roles 
      };
    } catch (error) {
      console.error('Error setting user roles:', error);
      
      // Check if it's the last super admin error
      if (error.message && error.message.includes('last active super_admin')) {
        return { ok: false, error: 'Cannot remove the last active super admin' };
      }
      
      return { ok: false, error: 'Failed to set user roles' };
    }
  }

  async addUserRole(userId, roleId, assignedBy) {
    try {
      // Check if user exists
      const existing = await this.store.getAggregatorUserById(userId);
      if (!existing) {
        return { ok: false, error: 'User not found' };
      }

      // Add role
      await this.store.addUserRole(userId, roleId, assignedBy);

      // Invalidate permission cache
      invalidateUserPermissions(userId);

      // Get updated roles
      const roles = await this.store.getUserRoles(userId);

      return { 
        ok: true, 
        message: 'Role added successfully',
        roles 
      };
    } catch (error) {
      console.error('Error adding user role:', error);
      return { ok: false, error: 'Failed to add user role' };
    }
  }

  async removeUserRole(userId, roleId) {
    try {
      // Check if user exists
      const existing = await this.store.getAggregatorUserById(userId);
      if (!existing) {
        return { ok: false, error: 'User not found' };
      }

      // Remove role
      await this.store.removeUserRole(userId, roleId);

      // Invalidate permission cache
      invalidateUserPermissions(userId);

      // Get updated roles
      const roles = await this.store.getUserRoles(userId);

      return { 
        ok: true, 
        message: 'Role removed successfully',
        roles 
      };
    } catch (error) {
      console.error('Error removing user role:', error);
      
      // Check if it's the last super admin error
      if (error.message && error.message.includes('last active super_admin')) {
        return { ok: false, error: 'Cannot remove the last active super admin' };
      }
      
      return { ok: false, error: 'Failed to remove user role' };
    }
  }
}

module.exports = { UserService };
