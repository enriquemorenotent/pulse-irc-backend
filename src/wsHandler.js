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
                wsIrcMap.set(ws, { ircSessions: new Map() });

                ws.on('close', () => {
                        logger.info('WebSocket client disconnected, cleaning up IRC clients');
                        const entry = wsIrcMap.get(ws);
                        if (entry) {
                                for (const session of entry.ircSessions.values()) {
                                        if (session.ircClient) {
                                                try {
                                                        session.ircClient.disconnect('WebSocket client disconnected', false);
                                                } catch (err) {
                                                        logger.error('Error cleaning IRC client:', err);
                                                }
                                        }
                                }
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
                        const sessions = entry.ircSessions;

                        if (msg.type === 'connect') {
                                if (!msg.id) {
                                        ws.send(JSON.stringify({ type: 'error', error: 'Missing id' }));
                                        return;
                                }
                                if (sessions.has(msg.id)) {
                                        ws.send(JSON.stringify({ type: 'error', error: 'ID already connected' }));
                                        return;
                                }
                                if (!msg.server || !msg.nick) {
                                        ws.send(JSON.stringify({ type: 'error', error: 'Missing IRC server or nick' }));
                                        return;
                                }

                                const sessionEntry = { ircClient: null, ircReady: false };
                                sessions.set(msg.id, sessionEntry);
                                createIrcClient(
                                        {
                                                server: msg.server,
                                                port: msg.port || 6697,
                                                nick: msg.nick,
                                                password: msg.password,
                                                tls: msg.tls,
                                                encoding: msg.encoding,
                                        },
                                        ws,
                                        sessionEntry,
                                        msg.id,
                                        () => sessions.delete(msg.id)
                                );
                                return;
                        }

                        if (!msg.id) {
                                ws.send(JSON.stringify({ type: 'error', error: 'Missing id' }));
                                return;
                        }

                        const session = sessions.get(msg.id);

                        if (!session || !session.ircClient || !session.ircReady) {
                                ws.send(JSON.stringify({ type: 'error', error: 'IRC not connected' }));
                                return;
                        }

			try {
				switch (msg.type) {
                                        case 'join':
                                                if (msg.channel) {
                                                        logger.info(`WS requests IRC join: ${msg.channel}`);
                                                        session.ircClient.join(msg.channel);
                                                }
                                                break;
                                        case 'message':
                                                if (msg.channel && msg.text) {
                                                        logger.info(`WS sends IRC message to ${msg.channel}: ${msg.text}`);
                                                        session.ircClient.say(msg.channel, msg.text);
                                                }
                                                break;
                                       case 'part':
                                               if (msg.channel) {
                                                       logger.info(`WS requests IRC part: ${msg.channel}`);
                                                       session.ircClient.part(msg.channel);
                                               }
                                               break;
                                       case 'whois':
                                               if (msg.target) {
                                                       logger.info(`WS requests WHOIS for: ${msg.target}`);
                                                       try {
                                                               session.ircClient.whois(msg.target);
                                                       } catch (e) {
                                                               logger.error('Error issuing WHOIS:', e);
                                                       }
                                               } else {
                                                       ws.send(JSON.stringify({ type: 'error', error: 'Missing whois target' }));
                                               }
                                               break;
                                       case 'names':
                                               if (msg.channel) {
                                                       logger.info(`WS requests IRC names for: ${msg.channel}`);
                                                       session.ircClient.raw(`NAMES ${msg.channel}`);
                                               }
                                               break;
                                       case 'list':
                                               try {
                                                       if (msg.mask) {
                                                               logger.info(`WS requests IRC LIST with mask: ${msg.mask}`);
                                                               session.ircClient.list(msg.mask);
                                                       } else {
                                                               logger.info('WS requests IRC LIST (no mask)');
                                                               session.ircClient.list();
                                                       }
                                               } catch (e) {
                                                       logger.error('Error issuing LIST:', e);
                                                       ws.send(JSON.stringify({ type: 'error', error: 'Failed to request LIST' }));
                                               }
                                               break;
                                       case 'disconnect':
                                               logger.info(`WS requests IRC disconnect for session ${msg.id}`);
                                               session.ircClient.disconnect('Client requested disconnect');
                                               break;
                                       case 'nick':
                                               if (msg.nick) {
                                                       logger.info(`WS requests nick change to: ${msg.nick}`);
                                                       try {
                                                               session.ircClient.changeNick(msg.nick);
                                                       } catch (e) {
                                                               logger.error('Error changing nick:', e);
                                                               ws.send(JSON.stringify({ type: 'error', error: 'Failed to change nick' }));
                                                       }
                                               } else {
                                                       ws.send(JSON.stringify({ type: 'error', error: 'Missing nick' }));
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
