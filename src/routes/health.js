function registerHealthRoutes(app) {
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'kael-aggregator-backend',
      version: '1.0.0'
    };
  });

  app.get('/api/v1/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'kael-aggregator-backend',
      version: '1.0.0'
    };
  });
}

module.exports = { registerHealthRoutes };
