const { buildApp } = require('./app');
const { env } = require('./config/env');

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.port,
      host: '0.0.0.0'
    });

    app.log.info('═══════════════════════════════════════════════════════');
    app.log.info('  🚀 KAEL AGGREGATOR BACKEND STARTED');
    app.log.info('═══════════════════════════════════════════════════════');
    app.log.info(`  📍 Server running at: http://127.0.0.1:${env.port}`);
    app.log.info(`  🌍 Environment: ${env.nodeEnv}`);
    app.log.info(`  🗄️  Database: Connected to Supabase`);
    app.log.info('═══════════════════════════════════════════════════════');
    
    app.log.info('📋 Available Routes loaded.');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
