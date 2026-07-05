const { checkPermission } = require('../middleware/check-permission');

function registerUserRoutes(app, { userService, authService, auditLogService }) {
  // Middleware to verify authentication
  async function authenticate(request, reply) {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return reply.code(401).send({ success: false, error: 'Authorization token required' });
    }

    const session = await authService.getSession(token);
    if (!session) {
      return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
    }

    request.session = session;
  }

  // GET /api/v1/users - List all users with roles
  app.get('/api/v1/users', 
    { 
      preHandler: [authenticate, checkPermission('users.read')] 
    }, 
    async (request, reply) => {
      try {
        const result = await userService.listUsers();
        
        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.users
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch users'
        });
      }
    }
  );

  // GET /api/v1/users/:id - Get single user
  app.get('/api/v1/users/:id', 
    { 
      preHandler: [authenticate, checkPermission('users.read')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await userService.getUserById(id);

        if (!result.ok) {
          return reply.code(404).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.user
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch user'
        });
      }
    }
  );

  // POST /api/v1/users - Create new user
  app.post('/api/v1/users', 
    { 
      preHandler: [authenticate, checkPermission('users.create')] 
    }, 
    async (request, reply) => {
      try {
        const { email, displayName, password, roleIds } = request.body;

        const result = await userService.createUser({
          email,
          displayName,
          password,
          roleIds
        }, request.session.userId);

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        const newUser = result.user;
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'user.create',
          resourceType: 'user',
          resourceId:   newUser?.id    || '',
          resourceName: newUser?.email || email || '',
          newValues:    { email: newUser?.email, displayName: newUser?.displayName, roleIds },
        });

        return reply.code(201).send({
          success: true,
          message: result.message,
          data: result.user
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create user'
        });
      }
    }
  );

  // PUT /api/v1/users/:id - Update user
  app.put('/api/v1/users/:id', 
    { 
      preHandler: [authenticate, checkPermission('users.update')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { displayName, password, isActive } = request.body;

        console.log('📝 PUT /api/v1/users/:id - Request received:', {
          userId: id,
          payload: { displayName, hasPassword: !!password, isActive },
          updatedBy: request.session?.userId
        });

        const result = await userService.updateUser(id, {
          displayName,
          password,
          isActive
        }, request.session.userId);

        console.log('📝 User service result:', result);

        if (!result.ok) {
          console.error('❌ User update failed:', result.error);
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        // Determine specific action for activate/deactivate
        const updAction = isActive === true  ? 'user.activate'
                        : isActive === false ? 'user.deactivate'
                        : 'user.update';
        
        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       updAction,
            resourceType: 'user',
            resourceId:   id,
            resourceName: result.user?.email || id,
            newValues:    { displayName, isActive },
          });
        } catch (auditError) {
          console.error('⚠️  Audit log failed (non-critical):', auditError.message);
        }

        console.log('✅ User updated successfully:', result.user);

        return reply.code(200).send({
          success: true,
          message: result.message,
          data: result.user
        });
      } catch (error) {
        console.error('💥 Exception in PUT /api/v1/users/:id:', error);
        console.error('Error stack:', error.stack);
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update user'
        });
      }
    }
  );

  // ============================================
  // USER ROLES MANAGEMENT
  // ============================================

  // GET /api/v1/users/:id/roles - Get user roles
  app.get('/api/v1/users/:id/roles', 
    { 
      preHandler: [authenticate, checkPermission('users.read')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await userService.getUserRoles(id);

        if (!result.ok) {
          return reply.code(404).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.roles
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch user roles'
        });
      }
    }
  );

  // GET /api/v1/users/:id/permissions - Get user effective permissions
  app.get('/api/v1/users/:id/permissions', 
    { 
      preHandler: [authenticate, checkPermission('users.read')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await userService.getUserPermissions(id);

        if (!result.ok) {
          return reply.code(404).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.data
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch user permissions'
        });
      }
    }
  );

  // PUT /api/v1/users/:id/roles - Replace all user roles
  app.put('/api/v1/users/:id/roles', 
    { 
      preHandler: [authenticate, checkPermission('users.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { roleIds } = request.body;

        console.log('📝 PUT /api/v1/users/:id/roles - Request received:', {
          userId: id,
          roleIds: roleIds,
          roleCount: roleIds?.length,
          updatedBy: request.session?.userId
        });

        const result = await userService.setUserRoles(
          id, 
          roleIds, 
          request.session.userId
        );

        console.log('📝 Set user roles result:', result);

        if (!result.ok) {
          console.error('❌ Set user roles failed:', result.error);
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'user.update',
            resourceType: 'user',
            resourceId:   id,
            resourceName: `user:${id}`,
            newValues:    { roleIds },
          });
        } catch (auditError) {
          console.error('⚠️  Audit log failed (non-critical):', auditError.message);
        }

        console.log('✅ User roles updated successfully');

        return reply.code(200).send({
          success: true,
          message: result.message,
          data: result.roles
        });
      } catch (error) {
        console.error('💥 Exception in PUT /api/v1/users/:id/roles:', error);
        console.error('Error stack:', error.stack);
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update user roles'
        });
      }
    }
  );

  // POST /api/v1/users/:id/roles - Add role to user
  app.post('/api/v1/users/:id/roles', 
    { 
      preHandler: [authenticate, checkPermission('users.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { roleId } = request.body;

        if (!roleId) {
          return reply.code(400).send({
            success: false,
            error: 'roleId is required'
          });
        }

        const result = await userService.addUserRole(
          id, 
          roleId, 
          request.session.userId
        );

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          message: result.message,
          data: result.roles
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to add user role'
        });
      }
    }
  );

  // DELETE /api/v1/users/:id/roles/:roleId - Remove role from user
  app.delete('/api/v1/users/:id/roles/:roleId', 
    { 
      preHandler: [authenticate, checkPermission('users.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id, roleId } = request.params;

        const result = await userService.removeUserRole(id, roleId);

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          message: result.message,
          data: result.roles
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to remove user role'
        });
      }
    }
  );
}

module.exports = { registerUserRoutes };
