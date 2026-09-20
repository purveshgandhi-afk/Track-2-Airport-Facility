/**
 * PHASE 5 — Backend Server Entrypoint
 *
 * Runs the Express server.
 * Usage: node src/api/server.js
 */

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[KOHLER Smart Facility API] Listening on http://localhost:${PORT}`);
  console.log(`  - GET /api/dashboard/summary`);
  console.log(`  - GET /api/telemetry`);
  console.log(`  - GET /api/incidents`);
  console.log(`  - GET /api/tickets`);
  console.log(`  - GET /api/cleaning`);
  console.log(`  - GET /api/sensors`);
  console.log(`  - GET /api/water`);
  console.log(`  - GET /api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('[API Server] Terminated cleanly.');
  });
});

module.exports = server;
