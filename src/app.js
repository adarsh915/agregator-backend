const fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const path = require('path');

const { env } = require('./config/env');
const { AggregatorStore } = require('./store/aggregator-store');
const { AuthService } = require('./services/auth-service');
const { EnterpriseService } = require('./services/enterprise-service');
const { PermissionService } = require('./services/permission-service');
const { RoleService } = require('./services/role-service');
const { UserService } = require('./services/user-service');
const { ProfileService } = require('./services/profile-service');
const { AuditLogService } = require('./services/audit-log-service');
const SubscriptionService = require('./services/subscription-service');
const BillingService = require('./services/billing-service');
const { registerHealthRoutes } = require('./routes/health');
const { registerAuthRoutes } = require('./routes/auth');
const { registerEnterpriseRoutes } = require('./routes/enterprises');
const { registerPermissionRoutes } = require('./routes/permissions');
const { registerRoleRoutes } = require('./routes/roles');
const { registerUserRoutes } = require('./routes/users');
const { registerUploadRoutes } = require('./routes/uploads');
const { registerProfileRoutes } = require('./routes/profile');
const { registerAuditLogRoutes } = require('./routes/audit-logs');
const { registerPackageRoutes } = require('./routes/packages');
const { registerSubscriptionRoutes } = require('./routes/subscriptions');
const { registerBillingRecordRoutes } = require('./routes/billing-records');
const { PackageService } = require('./services/package-service');

async function buildApp(options = {}) {
  // M-4 fix: trustProxy ensures request.ip is taken from the X-Forwarded-For chain
  // set by a trusted upstream proxy, not spoofed by the client directly.
  const app = fastify({ logger: true, trustProxy: true });

  // Initialize store
  const store = options.store || new AggregatorStore();

  // Initialize services
  const authService = new AuthService({ store, env });
  const subscriptionService = new SubscriptionService(store);
  const billingService = new BillingService(store);
  const enterpriseService = new EnterpriseService({ store, subscriptionService });
  const permissionService = new PermissionService({ store });
  const roleService = new RoleService({ store });
  const userService = new UserService({ store });
  const profileService = new ProfileService({ store });
  const auditLogService = new AuditLogService({ store });
  const packageService = new PackageService({ store });

  // ── CORS (C-3/C-4 fix) ─────────────────────────────────────────────────
  // Only allow explicitly configured origins; never mirror blindly.
  await app.register(cors, {
    origin: env.corsAllowedOrigins,
    credentials: true,
  });

  // ── Helmet with explicit CSP (H-5 fix) ─────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
      },
    },
  });

  // ── Rate limiting (H-4 fix) ─────────────────────────────────────────────
  // Global: 200 req/min; login route overridden to 5 req/15 min (see auth.js).
  await app.register(require('@fastify/rate-limit'), {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests, please try again later.',
    }),
  });

  // ── Multipart for file uploads ──────────────────────────────────────────
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });

  // ── Static file serving for uploads (C-3 fix) ──────────────────────────
  // Access-Control-Allow-Origin locked to known origins, not wildcard '*'.
  await app.register(require('@fastify/static'), {
    root: path.join(__dirname, '../uploads'),
    prefix: '/api/v1/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      const origin = env.corsAllowedOrigins[0] || 'http://127.0.0.1:3000';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
  });

  // ── Routes ─────────────────────────────────────────────────────────────
  registerHealthRoutes(app);
  registerAuthRoutes(app, { authService, auditLogService });
  registerEnterpriseRoutes(app, { enterpriseService, authService, auditLogService });
  registerPermissionRoutes(app, { permissionService, authService });
  registerRoleRoutes(app, { roleService, authService, auditLogService });
  registerUserRoutes(app, { userService, authService, auditLogService });
  registerUploadRoutes(app, { authService });
  registerProfileRoutes(app, { profileService, authService, auditLogService });
  registerAuditLogRoutes(app, { auditLogService, authService });
  registerPackageRoutes(app, { packageService, authService, auditLogService });
  registerSubscriptionRoutes(app, { subscriptionService, authService, auditLogService });
  registerBillingRecordRoutes(app, { billingService, authService, auditLogService });

  // ── Global Error Handler (Production Ready) ────────────────────────────
  app.setErrorHandler(function (error, request, reply) {
    this.log.error(error);
    
    if (error.validation) {
      return reply.status(400).send({
        ok: false,
        error: 'Validation Error',
        details: error.validation
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    reply.status(error.statusCode || 500).send({
      ok: false,
      error: isProd ? 'Internal Server Error' : error.message
    });
  });

  // Decorate app with services and store
  app.decorate('store', store);
  app.decorate('services', {
    store,
    authService,
    enterpriseService,
    permissionService,
    roleService,
    userService,
    profileService,
    auditLogService,
    packageService,
    subscriptionService,
    billingService,
  });

  return app;
}

module.exports = { buildApp };
