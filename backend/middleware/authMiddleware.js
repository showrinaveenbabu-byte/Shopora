const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectDB = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'novamart_super_secret_jwt_key_987654321_secure'
      );

      // Ensure database connection is complete before querying user
      await connectDB();

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found or session expired' });
      }
      return next();
    } catch (error) {
      if (
        error.name === 'MongooseServerSelectionError' ||
        error.name === 'MongoServerSelectionError' ||
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoConfigurationError' ||
        (error.message && error.message.includes('bufferCommands = false'))
      ) {
        return res.status(503).json({
          success: false,
          message: 'Database is currently unavailable. Please verify MONGODB_URI and try again.',
        });
      }
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };

