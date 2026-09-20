/**
 * PHASE 5 — Backend API Application
 *
 * REST API for the Airport Smart Facility & Sustainability Command Center.
 * Exposes live Supabase data to the dashboard without exposing
 * service-role credentials to the client.
 */

const express = require('express');
const cors = require('cors');

const dashboardRouter = require('./routes/dashboard');
const telemetryRouter = require('./routes/telemetry');
const incidentsRouter = require('./routes/incidents');
const ticketsRouter = require('./routes/tickets');
const cleaningRouter = require('./routes/cleaning');
const sensorsRouter = require('./routes/sensors');
const waterRouter = require('./routes/water');
const zonesRouter = require('./routes/zones');

const app = express();

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/cleaning', cleaningRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/water', waterRouter);
app.use('/api/zones', zonesRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    environment: 'airport-commercial-facility',
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'UNKNOWN_ERROR',
  });
});

module.exports = app;
