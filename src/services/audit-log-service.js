/**
 * AuditLogService
 *
 * Provides fire-and-forget audit logging for all admin actions.
 * Writes NEVER block the request path — all failures are swallowed
 * and only printed as warnings. The user's request always succeeds
 * regardless of log write outcome.
 *
 * Also provides queryLogs() for the /api/v1/audit-logs endpoint.
 */
class AuditLogService {
  constructor({ store }) {
    this.store = store;
  }

  /**
   * Log an admin action.
   * Call this AFTER a successful mutation, never awaited in the hot path.
   *
   * @param {Object} entry
   * @param {string}  entry.actorId       - User ID performing the action
   * @param {string}  entry.actorEmail    - User email
   * @param {string}  entry.actorName     - User display name
   * @param {string}  entry.action        - e.g. 'enterprise.create'
   * @param {string}  entry.resourceType  - e.g. 'enterprise'
   * @param {string}  [entry.resourceId]  - ID of the affected record
   * @param {string}  [entry.resourceName]- Human-readable name of the record
   * @param {string}  [entry.httpMethod]  - HTTP verb
   * @param {string}  [entry.httpPath]    - Request path
   * @param {string}  [entry.ipAddress]   - Client IP
   * @param {string}  [entry.userAgent]   - Client User-Agent header
   * @param {Object}  [entry.oldValues]   - State before mutation
   * @param {Object}  [entry.newValues]   - State after mutation
   * @param {string}  [entry.status]      - 'success' | 'failed'
   * @param {string}  [entry.errorMessage]
   */
  log(entry) {
    // Fire-and-forget — deliberately NOT awaited
    this.store.insertAuditLog(entry).catch(err => {
      console.warn('[AuditLog] Write failed (non-critical):', err?.message || err);
    });
  }

  /**
   * Convenience: build a base entry from a Fastify request object.
   * Usage: const base = auditLogService.fromRequest(request);
   *        auditLogService.log({ ...base, action: 'enterprise.create', ... });
   */
  fromRequest(request) {
    const session = request.session || {};
    return {
      actorId:    session.userId || null,
      actorEmail: session.email  || '',
      actorName:  session.displayName || session.email || '',
      httpMethod: request.method || '',
      httpPath:   request.url    || '',
      ipAddress:  request.ip || request.headers?.['x-forwarded-for'] || '',
      userAgent:  request.headers?.['user-agent'] || '',
    };
  }

  /**
   * Query logs with filters + pagination.
   * Used by GET /api/v1/audit-logs (super_admin only).
   */
  async queryLogs(filters = {}) {
    return this.store.queryAuditLogs(filters);
  }

  /**
   * Get distinct actors who have audit log entries.
   * Used to populate the actor filter dropdown on the viewer page.
   */
  async getActors() {
    return this.store.getDistinctAuditActors();
  }
}

module.exports = { AuditLogService };
