// Vercel Serverless Function Handler for SHOPORA
const connectDB = require('../backend/config/db');
const { app } = require('../backend/server');

module.exports = async (req, res) => {
  // Ensure database connection is initialized and awaited before Express handles routes
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless] DB connection error on request:', err.message);
  }

  // Handle URL normalization if Vercel serverless strips the /api prefix
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/css') && !req.url.startsWith('/js')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
};
