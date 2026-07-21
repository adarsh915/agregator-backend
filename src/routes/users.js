const { checkPermission, invalidateUserPermissions } = require('../middleware/check-permission');
const { makeAuthenticate } = require('../middleware/authenticate');

function registerUserRoutes(app, { userService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // GET /api/v1/users - List all users with roles
  app.get('/api/v1/users', 
    { 
      preHandler: [authenticate, checkPermission('users.read')] 
    }, 
    async (request, reply) => {
      try {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const search = request.query.search || '';

        const result = await userService.listUsers({ page, limit, search });
        
        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.users,
          pagination: result.pagination
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

  // GET /api/v1/users/stats - Get user statistics
  app.get('/api/v1/users/stats',
    {
      preHandler: [authenticate, checkPermission('users.read')]
    },
    async (request, reply) => {
      try {
        const result = await userService.getStats();
        
        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.stats
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch user stats'
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

        const result = await userService.updateUser(id, {
          displayName,
          password,
          isActive
        }, request.session.userId);

        if (!result.ok) {
          return reply.code(400).send({ success: false, error: result.error });
        }

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
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        return reply.code(200).send({
          success: true,
          message: result.message,
          data: result.user
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to update user'
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

        if (!result.ok) {
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
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        // H-2 fix: invalidate permission cache for the user whose roles changed
        // so the next request reflects the new permissions immediately.
        invalidateUserPermissions(id);

        return reply.code(200).send({
          success: true,
          message: result.message,
          data: result.roles
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          // H-3 fix: never expose error.message to the client
          error: 'Failed to update user roles'
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
