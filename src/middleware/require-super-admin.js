/**
 * requireSuperAdmin middleware
 *
 * Must be used AFTER the authenticate middleware (which sets request.session).
 * Checks the user's roles via the DB. Returns 403 if not super_admin.
 *
 * Usage:
 *   app.get('/api/v1/audit-logs',
 *     { preHandler: [authenticate, requireSuperAdmin] },
 *     handler
 *   );
 */
function requireSuperAdmin(store) {
  return async function (request, reply) {
    const userId = request.session?.userId;

    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      const roles = await store.getUserRoles(userId);
      const isSuperAdmin = roles.some(r => r.name === 'super_admin');

      if (!isSuperAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Super admin access required',
          hint: 'This endpoint is restricted to users with the super_admin role.',
        });
      }

      // Attach roles to request for downstream use
      request.userRoles = roles;
    } catch (err) {
      request.log.error('requireSuperAdmin check failed:', err);
      return reply.code(500).send({
        success: false,
        error: 'Role verification failed',
      });
    }
  };
}

module.exports = { requireSuperAdmin };
