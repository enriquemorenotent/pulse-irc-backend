require('dotenv').config();
const logger = require('./logger');

const express = require('express');
const app = express();

// Health-check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Centralized error handler
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
/* eslint-enable no-unused-vars */

const http = require('http');
const { Server: WebSocketServer } = require('ws');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  ws.on('message', (message) => {
    logger.info('Received via WS:', message.toString());
    ws.send(message); // Echo back
  });
  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
