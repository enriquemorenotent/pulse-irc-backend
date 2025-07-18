const express = require('express');
const cors = require('cors');
const logger = require('./logger');

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
	logger.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error' });
});
/* eslint-enable no-unused-vars */

module.exports = app;
