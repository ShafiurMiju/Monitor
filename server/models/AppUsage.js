const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  appName: {
    type: String,
    required: true
  },
  windowTitle: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for faster queries
appUsageSchema.index({ userId: 1, timestamp: -1 });
appUsageSchema.index({ deviceId: 1, timestamp: -1 });
appUsageSchema.index({ userId: 1, appName: 1 });

module.exports = mongoose.model('AppUsage', appUsageSchema);
