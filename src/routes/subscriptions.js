/**
 * Subscription API Routes
 * H-1 fix: all privileged routes use checkPermission('subscriptions.manage')
 *          instead of reading request.session.role (which came from JWT payload,
 *          not live DB — revocation would not take effect until token expiry).
 */
const { makeAuthenticate } = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/check-permission');

function registerSubscriptionRoutes(app, { subscriptionService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // ── GET /api/v1/subscriptions/:enterpriseId ────────────────────────────
  app.get('/api/v1/subscriptions/:enterpriseId',
    { preHandler: [authenticate, checkPermission('subscriptions.read')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.getEnterpriseSubscription(request.params.enterpriseId);
        if (!result.ok) {
          return reply.code(404).send({ error: result.error });
        }
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch subscription' });
      }
    }
  );

  // ── GET /api/v1/subscriptions/metrics/all ──────────────────────────────
  app.get('/api/v1/subscriptions/metrics/all',
    { preHandler: [authenticate, checkPermission('subscriptions.read')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.getMetrics();
        if (!result.ok) {
          return reply.code(500).send({ error: result.error });
        }
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to fetch metrics' });
      }
    }
  );

  // ── PUT /api/v1/subscriptions/:id ──────────────────────────────────────
  app.put('/api/v1/subscriptions/:id',
    { preHandler: [authenticate, checkPermission('subscriptions.manage')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.updateSubscription(
          request.params.id,
          request.body,
          request.session.userId
        );
        if (!result.ok) {
          return reply.code(400).send({ error: result.error });
        }

        auditLogService.log({
          actorId:      request.session.userId,
          actorEmail:   request.session.email,
          actorName:    request.session.email,
          action:       'subscription_updated',
          resourceType: 'subscription',
          resourceId:   request.params.id,
          httpMethod:   request.method,
          httpPath:     request.url,
          ipAddress:    request.ip,
          userAgent:    request.headers['user-agent'],
          newValues:    request.body,
          status:       'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to update subscription' });
      }
    }
  );

  // ── POST /api/v1/subscriptions/:id/pause ──────────────────────────────
  app.post('/api/v1/subscriptions/:id/pause',
    { preHandler: [authenticate, checkPermission('subscriptions.manage')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.pauseSubscription(
          request.params.id, request.session.userId
        );
        if (!result.ok) {
          return reply.code(400).send({ error: result.error });
        }

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'subscription_paused', resourceType: 'subscription',
          resourceId: request.params.id, httpMethod: request.method,
          httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'], status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to pause subscription' });
      }
    }
  );

  // ── POST /api/v1/subscriptions/:id/resume ──────────────────────────────
  app.post('/api/v1/subscriptions/:id/resume',
    { preHandler: [authenticate, checkPermission('subscriptions.manage')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.resumeSubscription(
          request.params.id, request.session.userId
        );
        if (!result.ok) {
          return reply.code(400).send({ error: result.error });
        }

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'subscription_resumed', resourceType: 'subscription',
          resourceId: request.params.id, httpMethod: request.method,
          httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'], status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to resume subscription' });
      }
    }
  );

  // ── POST /api/v1/subscriptions/:id/cancel ──────────────────────────────
  app.post('/api/v1/subscriptions/:id/cancel',
    { preHandler: [authenticate, checkPermission('subscriptions.manage')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.cancelSubscription(
          request.params.id, request.session.userId
        );
        if (!result.ok) {
          return reply.code(400).send({ error: result.error });
        }

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'subscription_cancelled', resourceType: 'subscription',
          resourceId: request.params.id, httpMethod: request.method,
          httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'], status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to cancel subscription' });
      }
    }
  );

  // ── POST /api/v1/subscriptions/renew ───────────────────────────────────
  app.post('/api/v1/subscriptions/renew',
    { preHandler: [authenticate, checkPermission('subscriptions.manage')] },
    async (request, reply) => {
      try {
        const result = await subscriptionService.renewSubscriptions();
        if (!result.ok) {
          return reply.code(500).send({ error: result.error });
        }

        auditLogService.log({
          actorId: request.session.userId, actorEmail: request.session.email,
          action: 'subscriptions_renewed', resourceType: 'subscription',
          httpMethod: request.method, httpPath: request.url, ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          newValues: { renewedCount: result.renewedCount }, status: 'success',
        });

        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Failed to renew subscriptions' });
      }
    }
  );
}

module.exports = { registerSubscriptionRoutes };
