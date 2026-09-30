const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { initBlockchainSync } = require('./services/blockchainService');

async function main() {
  await connectDB();
  await initBlockchainSync();

  const server = app.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
