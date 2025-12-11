// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const logger = require('./logger');
const setupWebSocketServer = require('./wsHandler');
const app = require('./app');

const server = http.createServer(app);
setupWebSocketServer(server);

const PORT = process.env.PORT || 38100;
server.listen(PORT, () => {
	logger.info(`Express & WebSocket server listening on port ${PORT}`);
});
