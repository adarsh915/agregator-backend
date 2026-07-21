// H-1 fix: Use shared makeAuthenticate factory — no more duplicated local copies
const { makeAuthenticate } = require('../middleware/authenticate');

function registerProfileRoutes(app, { profileService, authService, auditLogService }) {
  const authenticate = makeAuthenticate(authService);

  // GET /api/v1/profile - Get current user profile
  app.get('/api/v1/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      const result = await profileService.getProfile(userId);

      if (!result.ok) {
        return reply.code(404).send({ error: result.error });
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // PUT /api/v1/profile - Update user profile (displayName, email)
  app.put('/api/v1/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      const { displayName, email } = request.body;

      const result = await profileService.updateProfile(userId, { displayName, email });

      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      // Audit log
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
        request.log.warn('Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      // H-3 fix: never expose error.message to the client
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // POST /api/v1/profile/password - Change password
  app.post('/api/v1/profile/password', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.session.userId;
      const { currentPassword, newPassword } = request.body;

      const result = await profileService.changePassword(userId, currentPassword, newPassword);

      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }

      // Audit log
      try {
        auditLogService.log({
          ...auditLogService.fromRequest(request),
          action:       'profile.password_change',
          resourceType: 'profile',
          resourceId:   userId,
          resourceName: 'password',
        });
      } catch (auditError) {
        request.log.warn('Audit log failed (non-critical):', auditError.message);
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      // H-3 fix: never expose error.message to the client
      return reply.code(500).send({ error: 'Failed to change password' });
    }
  });
}

module.exports = { registerProfileRoutes };
