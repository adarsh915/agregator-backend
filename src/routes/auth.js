function registerAuthRoutes(app, { authService, auditLogService }) {
  // ── Helper: extract IP + User-Agent ──────────────────────────────────
  function clientInfo(request) {
    return {
      ipAddress: request.ip || request.headers['x-forwarded-for'] || '',
      userAgent: request.headers['user-agent'] || '',
      httpMethod: request.method || '',
      httpPath:   request.url   || '',
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/login', async (request, reply) => {
    const email    = String(request.body?.email    || '').trim().toLowerCase();
    const password = String(request.body?.password || '');

    console.log('📝 POST /api/v1/auth/login - Login attempt:', { email });

    if (!email || !password) {
      console.error('❌ Login failed: Missing credentials');
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });

    if (!result.ok) {
      console.error('❌ Login failed:', result.error);
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

    console.log('✅ Login successful:', { email, userId: result.response.userId });

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
      console.error('⚠️  Audit log failed (non-critical):', auditError.message);
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
      // Fetch session before deleting so we can log who logged out
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
    if (!session) {
      return reply.code(200).send({ ok: true, auth: authService.getPublicAuthState(null) });
    }

    return reply.code(200).send({ ok: true, auth: authService.getPublicAuthState(session) });
  });

  // ── Profile ───────────────────────────────────────────────────────────
  app.get('/api/v1/auth/profile', async (request, reply) => {
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

    const result = await authService.getUserProfile(session.userId);
    if (!result.ok) {
      return reply.code(404).send({ error: result.error });
    }

    return reply.code(200).send({ ok: true, profile: result.profile });
  });
}

module.exports = { registerAuthRoutes };
