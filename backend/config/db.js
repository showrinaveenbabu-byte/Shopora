const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/novamart';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect: ${error.message}`);
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.warn('[Database] Running in cloud/serverless; awaiting MongoDB Atlas connection or configured URI.');
    } else {
      // In local dev, log warning but do not hard exit so offline/static dev continues
      console.warn('[Database] Continuing in offline mode. Ensure MongoDB service is running.');
    }
  }
};

module.exports = connectDB;
