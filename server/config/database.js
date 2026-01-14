const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // URL encode the password if it contains special characters
    const conn = await mongoose.connect('mongodb://localhost:27017/odl-track', {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Listen for connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Stack:', error.stack);
    // Don't exit process in production, allow retries
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
