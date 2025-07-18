const { Server: WebSocketServer } = require('ws');
const logger = require('./logger');
const createIrcClient = require('./ircClientFactory');

/**
 * Initialize the WebSocket server and wire IRC handling.
 * @param {import('http').Server} server - HTTP server instance
 * @returns {WebSocketServer}
 */
function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  const wsIrcMap = new Map();

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    wsIrcMap.set(ws, { ircClient: null, ircReady: false });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected, cleaning up IRC client');
      const entry = wsIrcMap.get(ws);
      if (entry && entry.ircClient) {
        entry.ircClient.quit('WebSocket client disconnected');
      }
      wsIrcMap.delete(ws);
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        logger.warn('Invalid WS message:', raw, e);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON format' }));
        return;
      }

      const entry = wsIrcMap.get(ws);

      if (msg.type === 'connect') {
        if (entry.ircClient) {
          ws.send(JSON.stringify({ type: 'error', error: 'Already connected to IRC' }));
          return;
        }
        if (!msg.server || !msg.nick) {
          ws.send(JSON.stringify({ type: 'error', error: 'Missing IRC server or nick' }));
          return;
        }

        createIrcClient(
          { server: msg.server, port: msg.port || 6697, nick: msg.nick, password: msg.password },
          ws,
          entry
        );
        return;
      }

      if (!entry.ircClient || !entry.ircReady) {
        ws.send(JSON.stringify({ type: 'error', error: 'IRC not connected' }));
        return;
      }

      try {
        switch (msg.type) {
          case 'join':
            if (msg.channel) {
              logger.info(`WS requests IRC join: ${msg.channel}`);
              entry.ircClient.join(msg.channel);
            }
            break;
          case 'message':
            if (msg.channel && msg.text) {
              logger.info(`WS sends IRC message to ${msg.channel}: ${msg.text}`);
              entry.ircClient.say(msg.channel, msg.text);
            }
            break;
          case 'part':
            if (msg.channel) {
              logger.info(`WS requests IRC part: ${msg.channel}`);
              entry.ircClient.part(msg.channel);
            }
            break;
          case 'names':
            if (msg.channel) {
              logger.info(`WS requests IRC names for: ${msg.channel}`);
              entry.ircClient.raw(`NAMES ${msg.channel}`);
            }
            break;
          default:
            logger.warn('Unknown WS message type:', msg.type);
            ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
        }
      } catch (err) {
        logger.error('Error handling WS message:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Internal server error' }));
      }
    });
  });

  return wss;
}

module.exports = setupWebSocketServer;
