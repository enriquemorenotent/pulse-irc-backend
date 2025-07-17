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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Express server listening on port ${PORT}`);
});
