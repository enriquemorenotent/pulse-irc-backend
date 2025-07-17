// Load environment variables from .env file
require('dotenv').config();

// Simple logger utility
const logger = require('./logger');

// Set up Express app for REST endpoints and health checks
const express = require('express');
const app = express();

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

// IRC client reference for mapping WebSocket <-> IRC
let ircClient = null;

/**
 * Broadcast a message to all connected WebSocket clients
 * @param {Object} data - The message object to send
 */
function broadcastWS(data) {
	wss.clients.forEach((client) => {
		if (client.readyState === client.OPEN) {
			client.send(JSON.stringify(data));
		}
	});
}

// Handle new WebSocket client connections
wss.on('connection', (ws) => {
	logger.info('WebSocket client connected');

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

		if (!ircClient) {
			logger.error('IRC client not connected when WS message received');
			ws.send(JSON.stringify({ type: 'error', error: 'IRC not connected' }));
			return;
		}

		// Map WebSocket messages to IRC actions
		try {
			switch (msg.type) {
				case 'join':
					if (msg.channel) {
						logger.info(`WS requests IRC join: ${msg.channel}`);
						ircClient.join(msg.channel);
					}
					break;
				case 'message':
					if (msg.channel && msg.text) {
						logger.info(`WS sends IRC message to ${msg.channel}: ${msg.text}`);
						ircClient.say(msg.channel, msg.text);
					}
					break;
				case 'part':
					if (msg.channel) {
						logger.info(`WS requests IRC part: ${msg.channel}`);
						ircClient.part(msg.channel);
					}
					break;
				case 'names':
					if (msg.channel) {
						logger.info(`WS requests IRC names for: ${msg.channel}`);
						ircClient.raw(`NAMES ${msg.channel}`);
					}
					break;
				default:
					logger.warn('Unknown WS message type:', msg.type);
					ws.send(
						JSON.stringify({ type: 'error', error: 'Unknown message type' })
					);
					// Relay IRC channel nick list to WebSocket clients
					ircClient.on('names', (event) => {
						logger.info(
							`IRC names for ${event.channel}: ${Object.keys(event.users).join(', ')}`
						);
						broadcastWS({
							type: 'names',
							channel: event.channel,
							nicks: Object.keys(event.users),
						});
					});
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

// IRC bridge setup: connect to IRC server using irc-framework
// eslint-disable-next-line no-undef
const IRC_SERVER = process.env.IRC_SERVER;
// eslint-disable-next-line no-undef
const IRC_NICK = process.env.IRC_NICK;
// eslint-disable-next-line no-undef
const IRC_CHANNEL = process.env.IRC_CHANNEL;

if (IRC_SERVER && IRC_NICK && IRC_CHANNEL) {
	// Import irc-framework and create IRC client
	const IRC = require('irc-framework');
	ircClient = new IRC.Client();

	// Connect to IRC server
	ircClient.connect({
		host: IRC_SERVER,
		nick: IRC_NICK,
		auto_reconnect: true,
	});

	// Relay IRC events to WebSocket clients
	ircClient.on('message', (event) => {
		logger.info(
			`IRC message from ${event.nick} in ${event.target}: ${event.message}`
		);
		broadcastWS({
			type: 'message',
			from: event.nick,
			channel: event.target,
			text: event.message,
		});
	});
	ircClient.on('join', (event) => {
		logger.info(`IRC join: ${event.nick} joined ${event.channel}`);
		broadcastWS({
			type: 'join',
			nick: event.nick,
			channel: event.channel,
		});
	});
	ircClient.on('part', (event) => {
		logger.info(`IRC part: ${event.nick} left ${event.channel}`);
		broadcastWS({
			type: 'part',
			nick: event.nick,
			channel: event.channel,
		});
	});

	// When IRC client is registered, join the default channel
	ircClient.on('registered', () => {
		logger.info(`Connected to IRC server ${IRC_SERVER} as ${IRC_NICK}`);
		ircClient.join(IRC_CHANNEL);
	});

	// Log IRC errors
	ircClient.on('error', (err) => {
		logger.error('IRC error:', err);
	});
} else {
	logger.warn(
		'IRC bridge not started: missing IRC_SERVER, IRC_NICK, or IRC_CHANNEL env vars'
	);
}

// Start the HTTP/WebSocket server
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
