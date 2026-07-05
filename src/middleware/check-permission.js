const { cache } = require('../cache/permission-cache');

// Get user permissions with caching
async function getUserPermissions(store, userId) {
  // Check cache first
  const cacheKey = `perms:${userId}`;
  let permissions = cache.get(cacheKey);
  
  if (permissions) {
    return permissions;
  }
  
  // Fetch from database
  permissions = await store.getUserPermissions(userId);
  
  // Cache for 60 seconds
  cache.set(cacheKey, permissions, { ttl: 60 });
  
  return permissions;
}

// Middleware factory for permission checking
function checkPermission(requiredPermission) {
  return async (request, reply) => {
    try {
      // Get userId from session (set by authenticate middleware)
      const userId = request.session?.userId;
      
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // Get user permissions (with cache)
      const permissions = await getUserPermissions(request.server.store, userId);
      
      // Check if user has required permission
      if (!permissions.includes(requiredPermission)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions',
          required: requiredPermission
        });
      }
      
      // Attach permissions to request for later use
      request.permissions = permissions;
      
    } catch (error) {
      request.log.error('Permission check error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

// Check if user has ANY of the required permissions
function checkAnyPermission(requiredPermissions) {
  return async (request, reply) => {
    try {
      const userId = request.session?.userId;
      
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const permissions = await getUserPermissions(request.server.store, userId);
      
      const hasAny = requiredPermissions.some(perm => permissions.includes(perm));
      
      if (!hasAny) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions',
          required: `One of: ${requiredPermissions.join(', ')}`
        });
      }
      
      request.permissions = permissions;
      
    } catch (error) {
      request.log.error('Permission check error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

// Check if user has ALL of the required permissions
function checkAllPermissions(requiredPermissions) {
  return async (request, reply) => {
    try {
      const userId = request.session?.userId;
      
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const permissions = await getUserPermissions(request.server.store, userId);
      
      const hasAll = requiredPermissions.every(perm => permissions.includes(perm));
      
      if (!hasAll) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions',
          required: `All of: ${requiredPermissions.join(', ')}`
        });
      }
      
      request.permissions = permissions;
      
    } catch (error) {
      request.log.error('Permission check error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

// Invalidate permission cache for a user
function invalidateUserPermissions(userId) {
  cache.delete(`perms:${userId}`);
}

// Invalidate permission cache for all users with a specific role
async function invalidateRolePermissions(store, roleId) {
  // For simplicity, clear all permission caches
  // In production, you'd want to track which users have which roles
  cache.deleteByPattern('perms:*');
}

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserPermissions,
  invalidateUserPermissions,
  invalidateRolePermissions
};
