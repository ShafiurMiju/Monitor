const mongoose = require('mongoose');

const keystrokeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  keystrokes: [{
    key: String,
    timestamp: Date,
    appName: String,
    appTitle: String
  }],
  totalCount: {
    type: Number,
    default: 0
  },
  appBreakdown: [{
    appName: String,
    count: Number
  }],
  screenResolution: {
    width: Number,
    height: Number
  }
}, {
  timestamps: true
});

// Index for efficient querying
keystrokeSchema.index({ userId: 1, createdAt: -1 });
keystrokeSchema.index({ deviceId: 1, createdAt: -1 });
keystrokeSchema.index({ sessionId: 1 });
keystrokeSchema.index({ 'keystrokes.timestamp': 1 });

module.exports = mongoose.model('Keystroke', keystrokeSchema);
