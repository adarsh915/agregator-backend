function registerProfileRoutes(app, { profileService, authService, auditLogService }) {
  // Middleware to verify authentication
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

  // GET /api/v1/profile - Get current user profile
  app.get('/api/v1/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      
      console.log('📝 GET /api/v1/profile - Request:', { userId });
      
      const result = await profileService.getProfile(userId);

      if (!result.ok) {
        console.error('❌ Get profile failed:', result.error);
        return reply.code(404).send({ error: result.error });
      }

      console.log('✅ Profile fetched successfully');
      return reply.code(200).send(result);
    } catch (error) {
      console.error('💥 Exception in GET /api/v1/profile:', error);
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // PUT /api/v1/profile - Update user profile (displayName, email)
  app.put('/api/v1/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      const { displayName, email } = request.body;

      console.log('📝 PUT /api/v1/profile - Update request:', { userId, displayName, email });

      const result = await profileService.updateProfile(userId, {
        displayName,
        email
      });

      if (!result.ok) {
        console.error('❌ Profile update failed:', result.error);
        return reply.code(400).send({ error: result.error });
      }

      console.log('✅ Profile updated successfully');

      // ── Audit log ────────────────────────────────────────────────────
      try {
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'profile.update',
          resourceType: 'profile',
          resourceId:   userId,
          resourceName: displayName || email || '',
          newValues:    { displayName, email },
        });
      } catch (auditError) {
        console.error('⚠️  Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send(result);
    } catch (error) {
      console.error('💥 Exception in PUT /api/v1/profile:', error);
      request.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to update profile' });
    }
  });

  // POST /api/v1/profile/password - Change password
  app.post('/api/v1/profile/password', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      const { currentPassword, newPassword } = request.body;

      console.log('📝 POST /api/v1/profile/password - Change password request:', { userId });

      const result = await profileService.changePassword(userId, currentPassword, newPassword);

      if (!result.ok) {
        console.error('❌ Password change failed:', result.error);
        return reply.code(400).send({ error: result.error });
      }

      console.log('✅ Password changed successfully');

      // ── Audit log ────────────────────────────────────────────────────
      try {
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'profile.password_change',
          resourceType: 'profile',
          resourceId:   userId,
          resourceName: 'password',
        });
      } catch (auditError) {
        console.error('⚠️  Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send(result);
    } catch (error) {
      console.error('💥 Exception in POST /api/v1/profile/password:', error);
      request.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to change password' });
    }
  });
}

module.exports = { registerProfileRoutes };
