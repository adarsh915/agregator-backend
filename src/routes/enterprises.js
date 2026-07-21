const { makeAuthenticate } = require('../middleware/authenticate');
const { checkPermission } = require('../middleware/check-permission');

function registerEnterpriseRoutes(app, { enterpriseService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // ── GET /api/v1/enterprises ────────────────────────────────────────────
  app.get('/api/v1/enterprises',
    { preHandler: [authenticate, checkPermission('enterprises.read')] },
    async (request, reply) => {
      try {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const search = request.query.search || '';
        const status = request.query.status || '';
        const billingPlan = request.query.billingPlan || '';
        
        const result = await enterpriseService.listEnterprises({ page, limit, search, status, billingPlan });
        return result;
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch enterprises' });
      }
    }
  );

  // ── GET /api/v1/enterprises/stats ─────────────────────────────────────
  app.get('/api/v1/enterprises/stats',
    { preHandler: [authenticate, checkPermission('enterprises.read')] },
    async (request, reply) => {
      try {
        const result = await enterpriseService.getStats();
        return result;
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch enterprise stats' });
      }
    }
  );

  // ── GET /api/v1/enterprises/:id ───────────────────────────────────────
  app.get('/api/v1/enterprises/:id',
    { preHandler: [authenticate, checkPermission('enterprises.read')] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await enterpriseService.getEnterpriseById(id);
        if (!result.ok) {
          return reply.code(404).send({ error: result.error });
        }
        return result;
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch enterprise' });
      }
    }
  );

  // ── POST /api/v1/enterprises ──────────────────────────────────────────
  // H-2 fix: requires enterprises.create permission
  app.post('/api/v1/enterprises',
    { preHandler: [authenticate, checkPermission('enterprises.create')] },
    async (request, reply) => {
      try {
        const {
          name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
          gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
          status, billingPlan, billingCycle, billingAmount, nextBillingDate,
          contactName, contactDesignation, contactEmail, contactPhone
        } = request.body;

        const result = await enterpriseService.createEnterprise({
          name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
          gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
          status, billingPlan, billingCycle, billingAmount, nextBillingDate,
          contactName, contactDesignation, contactEmail, contactPhone
        }, request.session.userId);

        if (!result.ok) {
          return reply.code(400).send({ error: result.error });
        }

        const ent = result.enterprise;
        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'enterprise.create',
            resourceType: 'enterprise',
            resourceId:   ent?.id   || '',
            resourceName: ent?.name || name || '',
            newValues:    { name: ent?.name, status: ent?.status, billingPlan: ent?.billingPlan, billingAmount: ent?.billingAmount },
          });
        } catch (auditError) {
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        return reply.code(201).send({ ok: true, enterprise: result.enterprise });
      } catch (error) {
        request.log.error(error);
        // H-7: never expose error.message
        return reply.code(500).send({ error: 'Failed to create enterprise' });
      }
    }
  );

  // ── PUT /api/v1/enterprises/:id ───────────────────────────────────────
  // H-2 fix: requires enterprises.update permission
  app.put('/api/v1/enterprises/:id',
    { preHandler: [authenticate, checkPermission('enterprises.update')] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const {
          name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
          gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
          status, billingPlan, billingCycle, billingAmount, nextBillingDate,
          contactName, contactDesignation, contactEmail, contactPhone
        } = request.body;

        const beforeRes = await enterpriseService.getEnterpriseById(id);
        const oldEnt = beforeRes.ok ? beforeRes.enterprise : null;

        const result = await enterpriseService.updateEnterprise(id, {
          name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
          gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
          status, billingPlan, billingCycle, billingAmount, nextBillingDate,
          contactName, contactDesignation, contactEmail, contactPhone
        }, request.session.userId);

        if (!result.ok) {
          return reply.code(400).send({ ok: false, error: result.error });
        }

        const newEnt = result.enterprise;
        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'enterprise.update',
            resourceType: 'enterprise',
            resourceId:   id,
            resourceName: newEnt?.name || oldEnt?.name || '',
            oldValues:    oldEnt ? { name: oldEnt.name, status: oldEnt.status, billingPlan: oldEnt.billingPlan, billingAmount: oldEnt.billingAmount } : null,
            newValues:    newEnt ? { name: newEnt.name, status: newEnt.status, billingPlan: newEnt.billingPlan, billingAmount: newEnt.billingAmount } : null,
          });
        } catch (auditError) {
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        return reply.code(200).send({ ok: true, enterprise: result.enterprise });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to update enterprise' });
      }
    }
  );

  // ── DELETE /api/v1/enterprises/:id ───────────────────────────────────
  // H-2 fix: requires enterprises.delete permission
  app.delete('/api/v1/enterprises/:id',
    { preHandler: [authenticate, checkPermission('enterprises.delete')] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const beforeRes = await enterpriseService.getEnterpriseById(id);
        const name = beforeRes.ok ? beforeRes.enterprise?.name : id;

        const result = await enterpriseService.deleteEnterprise(id, request.session.userId);
        if (!result.ok) {
          return reply.code(404).send({ error: result.error });
        }

        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'enterprise.delete',
            resourceType: 'enterprise',
            resourceId:   id,
            resourceName: name,
            oldValues:    { status: 'active' },
            newValues:    { status: 'deleted' },
          });
        } catch (auditError) {
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        return reply.code(200).send({ ok: true, message: 'Enterprise deleted successfully' });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to delete enterprise' });
      }
    }
  );

  // ── POST /api/v1/enterprises/:id/restore ─────────────────────────────
  // H-2 fix: requires enterprises.update permission
  app.post('/api/v1/enterprises/:id/restore',
    { preHandler: [authenticate, checkPermission('enterprises.update')] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await enterpriseService.restoreEnterprise(id, request.session.userId);
        if (!result.ok) {
          return reply.code(404).send({ error: result.error });
        }

        try {
          auditLogService.log({
            ...auditLogService.fromRequest(request),
            action:       'enterprise.restore',
            resourceType: 'enterprise',
            resourceId:   id,
            resourceName: result.enterprise?.name || id,
            oldValues:    { status: 'deleted' },
            newValues:    { status: 'active' },
          });
        } catch (auditError) {
          request.log.warn('Audit log failed (non-critical):', auditError.message);
        }

        return reply.code(200).send({ ok: true, enterprise: result.enterprise });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to restore enterprise' });
      }
    }
  );
}

module.exports = { registerEnterpriseRoutes };
