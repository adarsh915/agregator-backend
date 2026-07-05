const { checkPermission } = require('../middleware/check-permission');

function registerPermissionRoutes(app, { permissionService, authService }) {
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

  // GET /api/v1/permissions - List all permissions
  app.get('/api/v1/permissions', 
    { 
      preHandler: [authenticate, checkPermission('permissions.read')] 
    }, 
    async (request, reply) => {
      try {
        const { resource } = request.query;
        
        const result = await permissionService.listPermissions({ resource });
        
        if (!result.ok) {
          return reply.code(400).send({
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
          error: 'Failed to fetch permissions'
        });
      }
    }
  );

  // GET /api/v1/permissions/grouped - Get permissions grouped by resource
  app.get('/api/v1/permissions/grouped', 
    { 
      preHandler: [authenticate, checkPermission('permissions.read')] 
    }, 
    async (request, reply) => {
      try {
        const result = await permissionService.getPermissionsGroupedByResource();
        
        if (!result.ok) {
          return reply.code(400).send({
            success: false,
            error: result.error
          });
        }

        return {
          success: true,
          data: result.grouped
        };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch grouped permissions'
        });
      }
    }
  );
}

module.exports = { registerPermissionRoutes };
