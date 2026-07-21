const { makeAuthenticate } = require('../middleware/authenticate');

function registerAuthRoutes(app, { authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // ── Helper: extract IP + User-Agent ──────────────────────────────────
  function clientInfo(request) {
    return {
      ipAddress: request.ip || request.headers['x-forwarded-for'] || '',
      userAgent: request.headers['user-agent'] || '',
      httpMethod: request.method || '',
      httpPath:   request.url   || '',
    };
  }

  // ── Login (H-4 fix: rate limited to 5 attempts per 15 minutes) ───────
  app.post('/api/v1/auth/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '15 minutes' },
    },
  }, async (request, reply) => {
    const email    = String(request.body?.email    || '').trim().toLowerCase();
    const password = String(request.body?.password || '');

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });

    if (!result.ok) {
      // Log failed attempt (no actorId — user not authenticated yet)
      auditLogService.log({
        actorEmail:   email,
        actorName:    '',
        action:       'auth.login_failed',
        resourceType: 'session',
        status:       'failed',
        errorMessage: result.error,
        ...clientInfo(request),
      });
      return reply.code(401).send({ error: result.error });
    }

    // Log successful login
    const session = result.response;
    try {
      auditLogService.log({
        actorId:      session.userId || '',
        actorEmail:   session.email  || email,
        actorName:    session.displayName || '',
        action:       'auth.login',
        resourceType: 'session',
        status:       'success',
        ...clientInfo(request),
      });
    } catch (auditError) {
      request.log.warn('Audit log failed (non-critical):', auditError.message);
    }

    return reply.code(200).send(session);
  });

  // ── Logout ────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/logout', async (request) => {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (token) {
      const session = await authService.getSession(token);
      await authService.logout(token);

      if (session) {
        auditLogService.log({
          actorId:      session.userId || '',
          actorEmail:   session.email  || '',
          actorName:    '',
          action:       'auth.logout',
          resourceType: 'session',
          status:       'success',
          ...clientInfo(request),
        });
      }
    }

    return reply.code(200).send({ ok: true });
  });

  // ── Auth status ───────────────────────────────────────────────────────
  app.get('/api/v1/auth/status', async (request, reply) => {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    const session = token ? await authService.getSession(token) : null;
    return reply.code(200).send({ ok: true, auth: authService.getPublicAuthState(session) });
  });

  // ── Profile ───────────────────────────────────────────────────────────
  app.get('/api/v1/auth/profile', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await authService.getUserProfile(request.session.userId);
    if (!result.ok) {
      return reply.code(404).send({ error: result.error });
    }
    return reply.code(200).send({ ok: true, profile: result.profile });
  });
}

module.exports = { registerAuthRoutes };
