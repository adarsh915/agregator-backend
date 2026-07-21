const { requireSuperAdmin } = require('../middleware/require-super-admin');
// H-1 fix: use the single shared authenticate factory — no more local duplicates
const { makeAuthenticate } = require('../middleware/authenticate');

function registerAuditLogRoutes(app, { auditLogService, authService }) {
  const authenticate = makeAuthenticate(authService);

  // ── Super-admin guard bound to this app's store ────────────────────────
  const superAdminGuard = requireSuperAdmin(auditLogService.store);

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/v1/audit-logs
  // Query params: action, actorId, resourceType, from, to, page, limit
  // Accessible ONLY to super_admin users.
  // ──────────────────────────────────────────────────────────────────────
  app.get('/api/v1/audit-logs',
    { preHandler: [authenticate, superAdminGuard] },
    async (request, reply) => {
      try {
        const { action, actorId, resourceType, from, to, page, limit, search } = request.query;

        const result = await auditLogService.queryLogs({
          action,
          actorId,
          resourceType,
          from,
          to,
          search,
          page:  page  ? parseInt(page,  10) : 1,
          limit: limit ? parseInt(limit, 10) : 50,
        });

        return reply.code(200).send({
          success: true,
          data: result.logs,
          pagination: {
            page:       result.page,
            limit:      result.limit,
            total:      result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, error: 'Failed to fetch audit logs' });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/v1/audit-logs/actors
  // Returns distinct actors who have log entries (for filter dropdown).
  // Accessible ONLY to super_admin users.
  // ──────────────────────────────────────────────────────────────────────
  app.get('/api/v1/audit-logs/actors',
    { preHandler: [authenticate, superAdminGuard] },
    async (request, reply) => {
      try {
        const actors = await auditLogService.getActors();
        return reply.code(200).send({ success: true, data: actors });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, error: 'Failed to fetch actors' });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/v1/audit-logs/actions
  // Returns the list of known action codes for the filter dropdown.
  // Accessible ONLY to super_admin users.
  // ──────────────────────────────────────────────────────────────────────
  app.get('/api/v1/audit-logs/actions',
    { preHandler: [authenticate, superAdminGuard] },
    async (_request, reply) => {
      return reply.code(200).send({
        success: true,
        data: [
          // Auth
          'auth.login', 'auth.login_failed', 'auth.logout',
          // Enterprises
          'enterprise.create', 'enterprise.update', 'enterprise.delete', 'enterprise.restore',
          // Users
          'user.create', 'user.update', 'user.activate', 'user.deactivate',
          // Roles
          'role.create', 'role.update', 'role.delete',
          // Profile
          'profile.update', 'profile.password_change',
        ],
      });
    }
  );
}

module.exports = { registerAuditLogRoutes };
