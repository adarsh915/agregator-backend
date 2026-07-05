/**
 * Billing Records API Routes
 */

function registerBillingRecordRoutes(app, { billingService, authService, auditLogService }) {
  
  // ── Authenticate middleware ────────────────────────────────────────────
  async function authenticate(request, reply) {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return reply.code(401).send({ error: 'Authorization token required' });
    }

    const session = await authService.getSession(token);
    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    request.session = session;
  }

  // ── GET /api/v1/billing-records ────────────────────────────────────────
  // List all billing records with optional filters
  app.get('/api/v1/billing-records', { preHandler: authenticate }, async (request, reply) => {
    try {
      const filters = {};

      // Parse query parameters
      if (request.query.status) {
        filters.status = request.query.status;
      }
      if (request.query.enterpriseId) {
        filters.enterpriseId = request.query.enterpriseId;
      }
      if (request.query.startDate) {
        filters.startDate = request.query.startDate;
      }
      if (request.query.endDate) {
        filters.endDate = request.query.endDate;
      }

      const result = await billingService.getAllBillingRecords(filters);
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch billing records' });
    }
  });

  // ── GET /api/v1/billing-records/stats ──────────────────────────────────
  // Get billing statistics
  app.get('/api/v1/billing-records/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await billingService.getStats();
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch statistics' });
    }
  });

  // ── GET /api/v1/billing-records/:id ────────────────────────────────────
  // Get billing record details
  app.get('/api/v1/billing-records/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await billingService.getBillingRecordDetails(request.params.id);
      
      if (!result.ok) {
        return reply.code(404).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch billing record' });
    }
  });

  // ── PUT /api/v1/billing-records/:id/pay ────────────────────────────────
  // Mark billing record as paid
  app.put('/api/v1/billing-records/:id/pay', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const { paymentMethod, paymentReference } = request.body;

      const result = await billingService.markAsPaid(
        request.params.id,
        paymentMethod,
        paymentReference
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'billing_record_paid',
        resourceType: 'billing_record',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: { paymentMethod, paymentReference },
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to mark as paid' });
    }
  });

  // ── PUT /api/v1/billing-records/:id/status ─────────────────────────────
  // Update billing record status
  app.put('/api/v1/billing-records/:id/status', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const { status } = request.body;

      if (!status) {
        return reply.code(400).send({ error: 'Status is required' });
      }

      const result = await billingService.updateStatus(request.params.id, status);
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'billing_record_status_updated',
        resourceType: 'billing_record',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: { status },
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to update status' });
    }
  });

  // ── GET /api/v1/enterprises/:enterpriseId/billing-records ──────────────
  // Get billing records for a specific enterprise
  app.get('/api/v1/enterprises/:enterpriseId/billing-records', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await billingService.getEnterpriseBillingRecords(request.params.enterpriseId);
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch enterprise billing records' });
    }
  });

  // ── POST /api/v1/billing-records/check-overdue ─────────────────────────
  // Manual trigger for checking overdue records (for testing/admin use)
  app.post('/api/v1/billing-records/check-overdue', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await billingService.checkOverdueRecords();
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'overdue_records_checked',
        resourceType: 'billing_record',
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: { updatedCount: result.updatedCount },
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to check overdue records' });
    }
  });
}

module.exports = { registerBillingRecordRoutes };
