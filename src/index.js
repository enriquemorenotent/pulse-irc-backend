// Load environment variables from .env file
require('dotenv').config();

// Simple logger utility
const logger = require('./logger');

// Set up Express app for REST endpoints and health checks
const express = require('express');
const cors = require('cors');
const app = express();
// Enable CORS for all routes (customize origin as needed)
app.use(cors());

// Health-check route for monitoring server status
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

// Set up HTTP server and attach WebSocket server
const http = require('http');
const { Server: WebSocketServer } = require('ws');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map each WebSocket to its IRC client and ready state
const wsIrcMap = new Map(); // ws -> { ircClient, ircReady: bool }

/**
 * Broadcast a message to all connected WebSocket clients
 * @param {Object} data - The message object to send
 */

// Handle new WebSocket client connections

wss.on('connection', (ws) => {
	logger.info('WebSocket client connected');
	wsIrcMap.set(ws, { ircClient: null, ircReady: false });

	ws.on('close', (code, reason) => {
		logger.info('WebSocket client disconnected, cleaning up IRC client');
		const entry = wsIrcMap.get(ws);
		if (entry && entry.ircClient) {
			entry.ircClient.quit('WebSocket client disconnected');
		}
		wsIrcMap.delete(ws);
	});

	// Handle messages from WebSocket clients
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

		// Handle connect message
		if (msg.type === 'connect') {
			if (entry.ircClient) {
				ws.send(JSON.stringify({ type: 'error', error: 'Already connected to IRC' }));
				return;
			}
			if (!msg.server || !msg.nick) {
				ws.send(JSON.stringify({ type: 'error', error: 'Missing IRC server or nick' }));
				return;
			}

			const IRC = require('irc-framework');
			const ircClient = new IRC.Client();
			entry.ircClient = ircClient;
			const ircHost = msg.server;
			const ircPort = msg.port || 6697;
			const useTLS = ircPort === 6697 || ircPort === 7000 || ircPort === 7070 || /libera\.chat$/.test(ircHost);
			logger.info(`Connecting to IRC for ws: server=${ircHost}, port=${ircPort}, nick=${msg.nick}, tls=${useTLS}`);

			ircClient.on('connecting', () => {
				logger.info('IRC client: connecting...');
			});

			ircClient.on('socket connected', () => {
				logger.info('IRC client: socket connected');
			});

			ircClient.on('registered', () => {
				entry.ircReady = true;
				ws.send(JSON.stringify({ type: 'irc-ready' }));
				logger.info('Sent irc-ready to WebSocket client after IRC handshake');
			});

			ircClient.on('close', () => {
				logger.warn('IRC client: connection closed');
			});

			ircClient.on('quit', (event) => {
				logger.warn('IRC client: quit', event);
			});

			ircClient.on('error', (err) => {
				logger.error('IRC error:', err);
				ws.send(JSON.stringify({ type: 'error', error: 'IRC connection failed', details: err && err.message }));
			});

			ircClient.on('raw', (event) => {
				logger.info('IRC RAW:', event);
			});

			ircClient.on('nick in use', (event) => {
				logger.warn('IRC nick in use:', event);
				// Try a new nick by appending a random 4-digit number
				const newNick = `${event.nick}${Math.floor(1000 + Math.random() * 9000)}`;
				logger.info(`Trying new IRC nick: ${newNick}`);
				ws.send(JSON.stringify({ type: 'nick', nick: newNick }));
				ircClient.changeNick(newNick);
			});

			ircClient.on('registration failed', (event) => {
				logger.error('IRC registration failed:', event);
			});

			ircClient.on('message', (event) => {
				ws.send(JSON.stringify({ type: 'message', from: event.nick, channel: event.target, text: event.message }));
			});

			// Forward MOTD to frontend
			ircClient.on('motd', (event) => {
				ws.send(JSON.stringify({ type: 'server-message', subtype: 'motd', text: event.motd }));
			});

			// Forward channel topic to frontend
			ircClient.on('topic', (event) => {
				ws.send(JSON.stringify({ type: 'topic', channel: event.channel, topic: event.topic, nick: event.nick }));
			});

			// Forward server notices to frontend
			ircClient.on('notice', (event) => {
				if (!event.target || event.target === ircClient.user.nick) {
					ws.send(JSON.stringify({ type: 'server-message', subtype: 'notice', from: event.nick, text: event.message }));
				}
			});

			// Forward raw server numerics (welcome, info, MOTD lines, etc.)
			ircClient.on('raw', (event) => {
				if (!event || !event.command) return;
				const serverNumerics = ['001', '002', '003', '004', '005', '372', '375', '376'];
				if (serverNumerics.includes(event.command)) {
					ws.send(JSON.stringify({ type: 'server-message', subtype: event.command, text: event.params && event.params.join(' ') }));
				}
			});

			ircClient.on('join', (event) => {
				ws.send(JSON.stringify({ type: 'join', nick: event.nick, channel: event.channel }));
			});

			ircClient.on('part', (event) => {
				ws.send(JSON.stringify({ type: 'part', nick: event.nick, channel: event.channel }));
			});

			ircClient.on('names', (event) => {
				const nicks = event && event.users ? Object.keys(event.users) : [];
				ws.send(JSON.stringify({ type: 'names', channel: event.channel, nicks }));
			});

			// Fallback: handle raw 353 numeric for NAMES reply if irc-framework does not emit 'names' event
			ircClient.on('raw', (event) => {
				if (!event || !event.line) return;
				// 353 = NAMES reply, format: :server 353 <nick> <symbol> <channel> :nick1 nick2 ...
				const match = event.line.match(/\s353\s+\S+\s+[@=*]\s+(#\S+)\s+:([\S ]+)/);
				if (match) {
					const channel = match[1];
					// Remove @ or + prefix from nicks (ops/voice)
					const nicks = match[2].split(' ').map((n) => n.replace(/^[@+]/, ''));
					ws.send(JSON.stringify({ type: 'names', channel, nicks }));
				}
			});
			ircClient.connect({ host: ircHost, port: ircPort, nick: msg.nick, password: msg.password, tls: useTLS, auto_reconnect: false });
			return;
		}

		// All other messages require IRC client to be ready
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

// Start the HTTP/WebSocket server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
