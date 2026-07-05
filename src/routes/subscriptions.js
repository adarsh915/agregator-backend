/**
 * Subscription API Routes
 */

function registerSubscriptionRoutes(app, { subscriptionService, authService, auditLogService }) {
  
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

  // ── GET /api/v1/subscriptions/:enterpriseId ────────────────────────────
  // Get subscription for a specific enterprise
  app.get('/api/v1/subscriptions/:enterpriseId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await subscriptionService.getEnterpriseSubscription(request.params.enterpriseId);
      
      if (!result.ok) {
        return reply.code(404).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch subscription' });
    }
  });

  // ── GET /api/v1/subscriptions/metrics/all ──────────────────────────────
  // Get subscription metrics (MRR, ARR, etc.)
  app.get('/api/v1/subscriptions/metrics/all', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await subscriptionService.getMetrics();
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch metrics' });
    }
  });

  // ── PUT /api/v1/subscriptions/:id ──────────────────────────────────────
  // Update subscription (change package, billing cycle, etc.)
  app.put('/api/v1/subscriptions/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await subscriptionService.updateSubscription(
        request.params.id,
        request.body,
        request.session.userId
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'subscription_updated',
        resourceType: 'subscription',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: request.body,
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to update subscription' });
    }
  });

  // ── POST /api/v1/subscriptions/:id/pause ───────────────────────────────
  // Pause subscription
  app.post('/api/v1/subscriptions/:id/pause', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await subscriptionService.pauseSubscription(
        request.params.id,
        request.session.userId
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'subscription_paused',
        resourceType: 'subscription',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to pause subscription' });
    }
  });

  // ── POST /api/v1/subscriptions/:id/resume ──────────────────────────────
  // Resume subscription
  app.post('/api/v1/subscriptions/:id/resume', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await subscriptionService.resumeSubscription(
        request.params.id,
        request.session.userId
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'subscription_resumed',
        resourceType: 'subscription',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to resume subscription' });
    }
  });

  // ── POST /api/v1/subscriptions/:id/cancel ──────────────────────────────
  // Cancel subscription
  app.post('/api/v1/subscriptions/:id/cancel', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await subscriptionService.cancelSubscription(
        request.params.id,
        request.session.userId
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'subscription_cancelled',
        resourceType: 'subscription',
        resourceId: request.params.id,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to cancel subscription' });
    }
  });

  // ── POST /api/v1/subscriptions/renew ───────────────────────────────────
  // Manual trigger for subscription renewal (for testing/admin use)
  app.post('/api/v1/subscriptions/renew', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await subscriptionService.renewSubscriptions();
      
      if (!result.ok) {
        return reply.code(500).send({ error: result.error });
      }

      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'subscriptions_renewed',
        resourceType: 'subscription',
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: { renewedCount: result.renewedCount },
        status: 'success'
      });

      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to renew subscriptions' });
    }
  });
}

module.exports = { registerSubscriptionRoutes };
