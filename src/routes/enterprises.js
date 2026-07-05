function registerEnterpriseRoutes(app, { enterpriseService, authService, auditLogService }) {
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

  // ── GET /api/v1/enterprises - List all enterprises ────────────────────
  app.get('/api/v1/enterprises', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await enterpriseService.listEnterprises();
      return result;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch enterprises' });
    }
  });

  // ── GET /api/v1/enterprises/stats - Dashboard stats ───────────────────
  app.get('/api/v1/enterprises/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await enterpriseService.getStats();
      return result;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch enterprise stats' });
    }
  });

  // ── GET /api/v1/enterprises/:id ───────────────────────────────────────
  app.get('/api/v1/enterprises/:id', { preHandler: authenticate }, async (request, reply) => {
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
  });

  // ── POST /api/v1/enterprises - Create ────────────────────────────────
  app.post('/api/v1/enterprises', { preHandler: authenticate }, async (request, reply) => {
    try {
      const {
        name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
        gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
        status, billingPlan, billingCycle, billingAmount, nextBillingDate,
        contactName, contactDesignation, contactEmail, contactPhone
      } = request.body;

      console.log('📝 POST /api/v1/enterprises - Create enterprise:', { name, status });

      const result = await enterpriseService.createEnterprise({
        name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
        gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
        status, billingPlan, billingCycle, billingAmount, nextBillingDate,
        contactName, contactDesignation, contactEmail, contactPhone
      }, request.session.userId);

      console.log('📝 Enterprise service result:', { ok: result.ok, hasEnterprise: !!result.enterprise });

      if (!result.ok) {
        console.error('❌ Enterprise creation failed:', result.error);
        return reply.code(400).send({ error: result.error });
      }

      console.log('✅ Enterprise created successfully:', { id: result.enterprise?.id, name: result.enterprise?.name });

      // ── Audit log ─────────────────────────────────────────────────────
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
        console.error('⚠️  Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(201).send({
        ok: true,
        enterprise: result.enterprise
      });
    } catch (error) {
      console.error('💥 Exception in POST /api/v1/enterprises:', error);
      console.error('Error stack:', error.stack);
      request.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to create enterprise' });
    }
  });

  // ── PUT /api/v1/enterprises/:id - Update ─────────────────────────────
  app.put('/api/v1/enterprises/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params;
      const {
        name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
        gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
        status, billingPlan, billingCycle, billingAmount, nextBillingDate,
        contactName, contactDesignation, contactEmail, contactPhone
      } = request.body;

      // Fetch current state for diff (old_values)
      const beforeRes = await enterpriseService.getEnterpriseById(id);
      const oldEnt = beforeRes.ok ? beforeRes.enterprise : null;

      const result = await enterpriseService.updateEnterprise(id, {
        name, logoUrl, logoStoragePath, generalPhone, generalEmail, apiUrl,
        gstinNumber, panNumber, hqStreet, hqCity, hqState, hqPincode,
        status, billingPlan, billingCycle, billingAmount, nextBillingDate,
        contactName, contactDesignation, contactEmail, contactPhone
      }, request.session.userId);

      if (!result.ok) {
        console.error('Enterprise service returned error:', result.error);
        return reply.code(400).send({ ok: false, error: result.error });
      }

      // ── Audit log ─────────────────────────────────────────────────────
      const newEnt = result.enterprise;
      console.log('Enterprise updated successfully:', { id, name: newEnt?.name });
      
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
        console.error('Audit log failed (non-fatal):', auditError);
      }

      console.log('Returning success result:', { ok: result.ok, hasEnterprise: !!result.enterprise });
      return reply.code(200).send({
        ok: true,
        enterprise: result.enterprise
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update enterprise' });
    }
  });

  // ── DELETE /api/v1/enterprises/:id - Soft delete ──────────────────────
  app.delete('/api/v1/enterprises/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Fetch name before delete for the log
      const beforeRes = await enterpriseService.getEnterpriseById(id);
      const name = beforeRes.ok ? beforeRes.enterprise?.name : id;

      const result = await enterpriseService.deleteEnterprise(id, request.session.userId);

      if (!result.ok) {
        return reply.code(404).send({ error: result.error });
      }

      // ── Audit log ─────────────────────────────────────────────────────
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
        console.error('⚠️  Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send({ ok: true, message: 'Enterprise deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete enterprise' });
    }
  });

  // ── POST /api/v1/enterprises/:id/restore ─────────────────────────────
  app.post('/api/v1/enterprises/:id/restore', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await enterpriseService.restoreEnterprise(id, request.session.userId);

      if (!result.ok) {
        return reply.code(404).send({ error: result.error });
      }

      // ── Audit log ─────────────────────────────────────────────────────
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
        console.error('⚠️  Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send({ ok: true, enterprise: result.enterprise });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to restore enterprise' });
    }
  });
}

module.exports = { registerEnterpriseRoutes };
