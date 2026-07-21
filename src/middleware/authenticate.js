/**
 * Shared authenticate middleware (M-2 fix)
 * Used by all route files — single source of truth.
 * Must be called with authService injected.
 *
 * Usage:
 *   const { makeAuthenticate } = require('../middleware/authenticate');
 *   const authenticate = makeAuthenticate(authService);
 *   app.get('/...', { preHandler: [authenticate, checkPermission('x')] }, handler);
 */
function makeAuthenticate(authService) {
  return async function authenticate(request, reply) {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return reply.code(401).send({ success: false, error: 'Authorization token required' });
    }

    const session = await authService.getSession(token);
    if (!session) {
      return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
    }

    request.session = session;
  };
}

module.exports = { makeAuthenticate };
