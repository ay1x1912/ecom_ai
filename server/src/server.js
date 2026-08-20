import { app } from './app.js';
import { env } from './config/env.js';
import { sequelize, assertDatabaseConnection } from './config/database.js';
import { redis } from './config/redis.js';

const start = async () => {
  await assertDatabaseConnection();
  console.log(`[db] connected to ${env.DB_NAME}`);

  const server = app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] payments: ${env.PAYMENT_PROVIDER}`);
  });

  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[api] ${signal} received — draining`);

    // Stop accepting connections, then release the pools.
    server.close(async () => {
      await sequelize.close().catch((e) => console.error(`[db] close: ${e.message}`));
      await redis.quit().catch((e) => console.error(`[redis] quit: ${e.message}`));
      console.log('[api] shutdown complete');
      process.exit(0);
    });

    // Don't hang forever on a stuck connection.
    setTimeout(() => {
      console.error('[api] forced exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});
