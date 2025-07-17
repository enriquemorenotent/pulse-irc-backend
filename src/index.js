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

	ws.on('close', () => {
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
				ws.send(
					JSON.stringify({ type: 'error', error: 'Already connected to IRC' })
				);
				return;
			}
			if (!msg.server || !msg.nick) {
				ws.send(
					JSON.stringify({ type: 'error', error: 'Missing IRC server or nick' })
				);
				return;
			}
			const IRC = require('irc-framework');
			const ircClient = new IRC.Client();
			entry.ircClient = ircClient;
			logger.info(
				`Connecting to IRC for ws: server=${msg.server}, nick=${msg.nick}`
			);
			ircClient.connect({
				host: msg.server,
				nick: msg.nick,
				password: msg.password,
				auto_reconnect: false,
			});
			ircClient.on('registered', () => {
				entry.ircReady = true;
				ws.send(JSON.stringify({ type: 'irc-ready' }));
				logger.info('Sent irc-ready to WebSocket client after IRC handshake');
			});
			ircClient.on('message', (event) => {
				ws.send(
					JSON.stringify({
						type: 'message',
						from: event.nick,
						channel: event.target,
						text: event.message,
					})
				);
			});
			ircClient.on('join', (event) => {
				ws.send(
					JSON.stringify({
						type: 'join',
						nick: event.nick,
						channel: event.channel,
					})
				);
			});
			ircClient.on('part', (event) => {
				ws.send(
					JSON.stringify({
						type: 'part',
						nick: event.nick,
						channel: event.channel,
					})
				);
			});
			ircClient.on('names', (event) => {
				ws.send(
					JSON.stringify({
						type: 'names',
						channel: event.channel,
						nicks: Object.keys(event.users),
					})
				);
			});
			ircClient.on('error', (err) => {
				logger.error('IRC error:', err);
				ws.send(
					JSON.stringify({ type: 'error', error: 'IRC connection failed' })
				);
			});
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
					ws.send(
						JSON.stringify({ type: 'error', error: 'Unknown message type' })
					);
			}
		} catch (err) {
			logger.error('Error handling WS message:', err);
			ws.send(
				JSON.stringify({ type: 'error', error: 'Internal server error' })
			);
		}
	});

	// Log WebSocket errors
	ws.on('error', (err) => {
		logger.error('WebSocket error:', err);
	});

	// Log when a WebSocket client disconnects
	ws.on('close', (code, reason) => {
		logger.info(
			`WebSocket client disconnected (code: ${code}, reason: ${reason})`
		);
	});
});

// Start the HTTP/WebSocket server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
