const mongoose = require('mongoose');

/**
 * Global Mongoose Connection Cache for Serverless Environments (Vercel / AWS Lambda)
 * Prevents multiple concurrent connections across warm container invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Disable Mongoose command buffering so queries fail-fast when disconnected
// rather than hanging for 10,000ms and timing out Vercel functions
mongoose.set('bufferCommands', false);

let lastFailureTime = 0;
const RETRY_COOLDOWN_MS = 15000;

const connectDB = async () => {
  // If connection is already established and open, reuse it immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Circuit breaker: If connection failed recently, avoid waiting on another timeout
  if (lastFailureTime && Date.now() - lastFailureTime < RETRY_COOLDOWN_MS) {
    return null;
  }

  let uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  // On Vercel / serverless without configured MongoDB URI, avoid hanging on localhost
  if (!uri) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.warn('[Database] Cloud serverless environment detected without MONGODB_URI. Operating with built-in product catalog.');
      return null;
    }
    uri = 'mongodb://127.0.0.1:27017/novamart';
  }

  // Sanitize URI (remove surrounding single/double quotes, trailing whitespace, or newlines)
  uri = uri.trim().replace(/^["']|["']$/g, '');

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      dbName: process.env.DB_NAME || 'novamart',
    };

    console.log('[Database] Connecting to MongoDB...');

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        console.log(`[Database] MongoDB Connected successfully to host: ${mongooseInstance.connection.host}`);
        cached.conn = mongooseInstance.connection;
        lastFailureTime = 0;
        return cached.conn;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        lastFailureTime = Date.now();
        console.error(`[Database Error] Connection failed: ${error.message}`);
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
          console.warn('[Database] Continuing with high-availability in-memory catalog fallback.');
        }
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    lastFailureTime = Date.now();
    return null;
  }

  return cached.conn;
};

module.exports = connectDB;
