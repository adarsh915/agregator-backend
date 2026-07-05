const { buildApp } = require('./app');
const { env } = require('./config/env');

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.port,
      host: '0.0.0.0'
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🚀 KAEL AGGREGATOR BACKEND STARTED');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  📍 Server running at: http://127.0.0.1:${env.port}`);
    console.log(`  🌍 Environment: ${env.nodeEnv}`);
    console.log(`  🗄️  Database: Connected to Supabase`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Available Routes:');
    console.log(`  GET    /health`);
    console.log(`  POST   /api/v1/auth/login`);
    console.log(`  POST   /api/v1/auth/logout`);
    console.log(`  GET    /api/v1/auth/status`);
    console.log(`  GET    /api/v1/auth/profile`);
    console.log(`  GET    /api/v1/enterprises`);
    console.log(`  POST   /api/v1/enterprises`);
    console.log(`  GET    /api/v1/enterprises/:id`);
    console.log(`  PUT    /api/v1/enterprises/:id`);
    console.log(`  DELETE /api/v1/enterprises/:id`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
