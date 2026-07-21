const { checkPermission } = require('../middleware/check-permission');
// H-1 fix: use the single shared authenticate factory — no more local duplicates
const { makeAuthenticate } = require('../middleware/authenticate');

function registerRoleRoutes(app, { roleService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);


  // GET /api/v1/roles - List all roles
  app.get('/api/v1/roles', 
    { 
      preHandler: [authenticate, checkPermission('roles.read')] 
    }, 
    async (request, reply) => {
      try {
        const result = await roleService.listRoles();
        
        if (!result.ok) {
          return reply.code(400).send({
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
          error: 'Failed to fetch roles'
        });
      }
    }
  );

  // GET /api/v1/roles/:id - Get single role with permissions
  app.get('/api/v1/roles/:id', 
    { 
      preHandler: [authenticate, checkPermission('roles.read')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await roleService.getRoleById(id);

        if (!result.ok) {
          return reply.code(404).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.role
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch role'
        });
      }
    }
  );

  // POST /api/v1/roles - Create new role
  app.post('/api/v1/roles', 
    { 
      preHandler: [authenticate, checkPermission('roles.create')] 
    }, 
    async (request, reply) => {
      try {
        const { name, displayName, description, permissionIds } = request.body;

        const result = await roleService.createRole({
          name,
          displayName,
          description,
          permissionIds
        }, request.session.userId);

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        const newRole = result.role;
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'role.create',
          resourceType: 'role',
          resourceId:   newRole?.id   || '',
          resourceName: newRole?.name || name || '',
          newValues:    { name: newRole?.name, displayName: newRole?.displayName, permissionIds },
        });

        return reply.code(201).send({
          success: true,
          message: 'Role created successfully',
          data: result.role
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create role'
        });
      }
    }
  );

  // PUT /api/v1/roles/:id - Update role
  app.put('/api/v1/roles/:id', 
    { 
      preHandler: [authenticate, checkPermission('roles.update')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { displayName, description, isActive } = request.body;

        console.log('📝 PUT /api/v1/roles/:id - Request received:', {
          roleId: id,
          payload: { displayName, description, isActive },
          userId: request.session?.userId
        });

        const result = await roleService.updateRole(id, {
          displayName,
          description,
          isActive
        }, request.session.userId);

        console.log('📝 Role service result:', result);

        if (!result.ok) {
          console.error('❌ Role update failed:', result.error);
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'role.update',
            resourceType: 'role',
            resourceId:   id,
            resourceName: result.role?.name || id,
            newValues:    { displayName, description, isActive },
          });
        } catch (auditError) {
          console.error('⚠️  Audit log failed (non-critical):', auditError.message);
        }

        console.log('✅ Role updated successfully:', result.role);

        return reply.code(200).send({
          success: true,
          message: 'Role updated successfully',
          data: result.role
        });
      } catch (error) {
        console.error('💥 Exception in PUT /api/v1/roles/:id:', error);
        console.error('Error stack:', error.stack);
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update role',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  );

  // DELETE /api/v1/roles/:id - Delete role
  app.delete('/api/v1/roles/:id', 
    { 
      preHandler: [authenticate, checkPermission('roles.delete')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await roleService.deleteRole(id);

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        // ── Audit log ──────────────────────────────────────────────────
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'role.delete',
          resourceType: 'role',
          resourceId:   id,
          resourceName: `role:${id}`,
        });

        return {
          success: true,
          message: result.message
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete role'
        });
      }
    }
  );

  // ============================================
  // ROLE PERMISSIONS MANAGEMENT
  // ============================================

  // GET /api/v1/roles/:id/permissions - Get role permissions
  app.get('/api/v1/roles/:id/permissions', 
    { 
      preHandler: [authenticate, checkPermission('roles.read')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await roleService.getRolePermissions(id);

        if (!result.ok) {
          return reply.code(404).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.permissions
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch role permissions'
        });
      }
    }
  );

  // PUT /api/v1/roles/:id/permissions - Replace all role permissions
  app.put('/api/v1/roles/:id/permissions', 
    { 
      preHandler: [authenticate, checkPermission('permissions.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { permissionIds } = request.body;

        const result = await roleService.setRolePermissions(
          id, 
          permissionIds, 
          request.session.userId
        );

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return reply.code(200).send({
          success: true,
          message: result.message,
          data: result.permissions
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to update role permissions'
        });
      }
    }
  );

  // POST /api/v1/roles/:id/permissions - Add permissions to role
  app.post('/api/v1/roles/:id/permissions', 
    { 
      preHandler: [authenticate, checkPermission('permissions.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { permissionIds } = request.body;

        const result = await roleService.addRolePermissions(
          id, 
          permissionIds, 
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
          data: result.permissions
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to add role permissions'
        });
      }
    }
  );

  // DELETE /api/v1/roles/:id/permissions - Remove permissions from role
  app.delete('/api/v1/roles/:id/permissions', 
    { 
      preHandler: [authenticate, checkPermission('permissions.manage')] 
    }, 
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { permissionIds } = request.body;

        const result = await roleService.removeRolePermissions(id, permissionIds);

        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          message: result.message,
          data: result.permissions
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to remove role permissions'
        });
      }
    }
  );
}

module.exports = { registerRoleRoutes };
