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
  const app = fastify({ logger: true });

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

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  // Register multipart for file uploads
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1 // Max 1 file per upload
    }
  });

  // Register static file serving for uploads
  await app.register(require('@fastify/static'), {
    root: path.join(__dirname, '../uploads'),
    prefix: '/api/v1/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      // Add CORS headers for static files
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  });

  // Register routes
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
