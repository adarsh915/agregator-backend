function registerPackageRoutes(app, { packageService, authService, auditLogService }) {
  
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

  // ── GET /api/v1/packages ────────────────────────────────────────────
  app.get('/api/v1/packages', { preHandler: authenticate }, async (request, reply) => {
    try {
      const includeInactive = request.query.includeInactive === 'true';
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 10;
      const search = request.query.search || '';

      const result = await packageService.listPackages({ includeInactive, page, limit, search });
      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch packages' });
    }
  });

  // ── GET /api/v1/packages/:id ────────────────────────────────────────
  app.get('/api/v1/packages/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await packageService.getPackage(request.params.id);
      return result;
    } catch (err) {
      app.log.error(err);
      return reply.code(404).send({ error: err.message || 'Failed to fetch package' });
    }
  });

  // ── POST /api/v1/packages ───────────────────────────────────────────
  app.post('/api/v1/packages', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await packageService.createPackage(request.body);
      
      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'package_created',
        resourceType: 'billing_package',
        resourceId: result.package?.id,
        resourceName: result.package?.name,
        httpMethod: request.method,
        httpPath: request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        newValues: { name: result.package?.name },
        status: 'success'
      });

      return reply.code(201).send(result);
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: err.message || 'Failed to create package' });
    }
  });

  // ── PUT /api/v1/packages/:id ────────────────────────────────────────
  app.put('/api/v1/packages/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await packageService.updatePackage(request.params.id, request.body);
      
      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'package_updated',
        resourceType: 'billing_package',
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
      return reply.code(500).send({ error: err.message || 'Failed to update package' });
    }
  });

  // ── DELETE /api/v1/packages/:id ─────────────────────────────────────
  app.delete('/api/v1/packages/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (request.session.role !== 'Super Admin' && request.session.role !== 'super_admin') {
        return reply.code(403).send({ error: 'Forbidden: Super Admin only' });
      }

      const result = await packageService.deletePackage(request.params.id);
      
      auditLogService.log({
        actorId: request.session.userId,
        actorEmail: request.session.email,
        actorName: request.session.email,
        action: 'package_deactivated',
        resourceType: 'billing_package',
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
      return reply.code(500).send({ error: err.message || 'Failed to deactivate package' });
    }
  });
}

module.exports = { registerPackageRoutes };
