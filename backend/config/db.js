const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

/**
 * Global Mongoose Connection Cache for Serverless Environments (Vercel / AWS Lambda)
 * Prevents multiple concurrent connections across warm container invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Keep command buffering disabled so queries fail-fast when disconnected
// rather than hanging indefinitely and timing out serverless function invocations
mongoose.set('bufferCommands', false);

/**
 * Check if Mongoose connection is fully open and ready (readyState === 1).
 * readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const isDBConnected = () => {
  return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
};

const connectDB = async () => {
  // If connection is already established and open, reuse it immediately (0ms overhead)
  if (cached.conn && isDBConnected()) {
    return cached.conn;
  }

  // If previous connection dropped or was closed, reset cached state
  if (cached.conn && !isDBConnected()) {
    cached.conn = null;
    cached.promise = null;
  }

  // If a connection attempt is currently in flight, wait for it instead of opening duplicate connections
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      if (isDBConnected()) {
        return cached.conn;
      }
    } catch (err) {
      cached.promise = null;
      cached.conn = null;
      throw err;
    }
  }

  // Resolve MongoDB URI across various Vercel / Cloud naming conventions
  const rawUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URL;

  let uri = rawUri ? rawUri.trim().replace(/^["']|["']$/g, '') : '';

  // In cloud/serverless environment without a configured URI, throw descriptive error
  if (!uri) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      const err = new Error(
        'MongoDB connection string is missing. Please configure MONGODB_URI in your Vercel Project Settings > Environment Variables.'
      );
      err.name = 'MongoConfigurationError';
      throw err;
    }
    // Local development fallback
    uri = 'mongodb://127.0.0.1:27017/novamart';
  }

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000, // 10s timeout to allow cold-start SSL/TLS handshake with MongoDB Atlas
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  // If DB_NAME is explicitly set, use it. Otherwise, if URI specifies a database path, Mongoose uses it automatically
  if (process.env.DB_NAME) {
    opts.dbName = process.env.DB_NAME;
  } else {
    const hasDbInUri = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i.test(uri);
    if (!hasDbInUri) {
      opts.dbName = 'novamart';
    }
  }

  console.log('[Database] Connecting to MongoDB...');

  // Cache the pending connection promise so all concurrent requests share this exact same connection attempt
  cached.promise = mongoose
    .connect(uri, opts)
    .then((mongooseInstance) => {
      console.log(`[Database] MongoDB Connected successfully to host: ${mongooseInstance.connection.host}`);
      cached.conn = mongooseInstance.connection;
      return cached.conn;
    });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error(`[Database Error] Connection failed: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
