// Vercel Serverless Function Handler for SHOPORA
require('dotenv').config();
const connectDB = require('../backend/config/db');
const { app } = require('../backend/server');

module.exports = (req, res) => {
  // Handle URL normalization if Vercel serverless strips the /api prefix
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/css') && !req.url.startsWith('/js')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
};

