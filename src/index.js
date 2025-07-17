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

// IRC bridge setup
// eslint-disable-next-line no-undef
const IRC_SERVER = process.env.IRC_SERVER;
// eslint-disable-next-line no-undef
const IRC_NICK = process.env.IRC_NICK;
// eslint-disable-next-line no-undef
const IRC_CHANNEL = process.env.IRC_CHANNEL;

if (IRC_SERVER && IRC_NICK && IRC_CHANNEL) {
  const IRC = require('irc-framework');
  const ircClient = new IRC.Client();

  ircClient.connect({
    host: IRC_SERVER,
    nick: IRC_NICK,
    auto_reconnect: true,
  });

  ircClient.on('registered', () => {
    logger.info(`Connected to IRC server ${IRC_SERVER} as ${IRC_NICK}`);
    ircClient.join(IRC_CHANNEL);
  });

  ircClient.on('error', (err) => {
    logger.error('IRC error:', err);
  });
} else {
  logger.warn(
    'IRC bridge not started: missing IRC_SERVER, IRC_NICK, or IRC_CHANNEL env vars'
  );
}

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
