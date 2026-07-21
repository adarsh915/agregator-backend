/**
 * Billing Records API Routes
 * H-1 fix: privileged routes use checkPermission('billing.manage')
 *          instead of JWT role string check.
 */
const { makeAuthenticate } = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/check-permission');

function registerBillingRecordRoutes(app, { billingService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // ── GET /api/v1/billing-records ────────────────────────────────────────
  app.get('/api/v1/billing-records',
    { preHandler: [authenticate, checkPermission('billing.read')] },
    async (request, reply) => {
      try {
        const filters = {};
        if (request.query.status)       filters.status       = request.query.status;
        if (request.query.enterpriseId) filters.enterpriseId = request.query.enterpriseId;
        if (request.query.startDate)    filters.startDate    = request.query.startDate;
        if (request.query.endDate)      filters.endDate      = request.query.endDate;
        if (request.query.search)       filters.search       = request.query.search;
        filters.page = request.query.page ? parseInt(request.query.page, 10) : 1;
        filters.limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;

        const result = await billingService.getAllBillingRecords(filters);
        if (!result.ok) return reply.code(500).send({ error: result.error });
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch billing records' });
      }
    }
  );

  // ── GET /api/v1/billing-records/stats ──────────────────────────────────
  app.get('/api/v1/billing-records/stats',
    { preHandler: [authenticate, checkPermission('billing.read')] },
    async (request, reply) => {
      try {
        const result = await billingService.getStats();
        if (!result.ok) return reply.code(500).send({ error: result.error });
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch statistics' });
      }
    }
  );

  // ── GET /api/v1/billing-records/:id ────────────────────────────────────
  app.get('/api/v1/billing-records/:id',
    { preHandler: [authenticate, checkPermission('billing.read')] },
    async (request, reply) => {
      try {
        const result = await billingService.getBillingRecordDetails(request.params.id);
        if (!result.ok) return reply.code(404).send({ error: result.error });
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch billing record' });
      }
    }
  );

  // ── PUT /api/v1/billing-records/:id/pay ────────────────────────────────
  app.put('/api/v1/billing-records/:id/pay',
    { preHandler: [authenticate, checkPermission('billing.manage')] },
    async (request, reply) => {
      try {
        const { paymentMethod, paymentReference } = request.body;
        const result = await billingService.markAsPaid(
          request.params.id, paymentMethod, paymentReference
        );
        if (!result.ok) return reply.code(400).send({ error: result.error });

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'billing_record_paid', resourceType: 'billing_record',
          resourceId: request.params.id, httpMethod: request.method,
          httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          newValues: { paymentMethod, paymentReference }, status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to mark as paid' });
      }
    }
  );

  // ── PUT /api/v1/billing-records/:id/status ─────────────────────────────
  app.put('/api/v1/billing-records/:id/status',
    { preHandler: [authenticate, checkPermission('billing.manage')] },
    async (request, reply) => {
      try {
        const { status } = request.body;
        if (!status) return reply.code(400).send({ error: 'Status is required' });

        const result = await billingService.updateStatus(request.params.id, status);
        if (!result.ok) return reply.code(400).send({ error: result.error });

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'billing_record_status_updated', resourceType: 'billing_record',
          resourceId: request.params.id, httpMethod: request.method,
          httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          newValues: { status }, status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to update status' });
      }
    }
  );

  // ── GET /api/v1/enterprises/:enterpriseId/billing-records ──────────────
  app.get('/api/v1/enterprises/:enterpriseId/billing-records',
    { preHandler: [authenticate, checkPermission('billing.read')] },
    async (request, reply) => {
      try {
        const result = await billingService.getEnterpriseBillingRecords(request.params.enterpriseId);
        if (!result.ok) return reply.code(500).send({ error: result.error });
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch enterprise billing records' });
      }
    }
  );

  // ── POST /api/v1/billing-records/check-overdue ─────────────────────────
  app.post('/api/v1/billing-records/check-overdue',
    { preHandler: [authenticate, checkPermission('billing.manage')] },
    async (request, reply) => {
      try {
        const result = await billingService.checkOverdueRecords();
        if (!result.ok) return reply.code(500).send({ error: result.error });

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'overdue_records_checked', resourceType: 'billing_record',
          httpMethod: request.method, httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          newValues: { updatedCount: result.updatedCount }, status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to check overdue records' });
      }
    }
  );
}

module.exports = { registerBillingRecordRoutes };
