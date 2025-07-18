/* global process */
// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const logger = require('./logger');
const setupWebSocketServer = require('./wsHandler');

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Centralized error handler for REST endpoints
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
/* eslint-enable no-unused-vars */

const server = http.createServer(app);
setupWebSocketServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
