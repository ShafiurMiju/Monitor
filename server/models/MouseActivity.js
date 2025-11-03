const mongoose = require('mongoose');

const mouseActivitySchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    enum: ['move', 'click', 'scroll', 'rightclick', 'doubleclick'],
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  screenWidth: {
    type: Number,
    required: true
  },
  screenHeight: {
    type: Number,
    required: true
  },
  scrollX: {
    type: Number,
    default: 0
  },
  scrollY: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  computerName: {
    type: String,
    default: ''
  }
});

// Indexes for efficient querying
mouseActivitySchema.index({ userId: 1, timestamp: -1 });
mouseActivitySchema.index({ deviceId: 1, timestamp: -1 });
mouseActivitySchema.index({ eventType: 1 });
mouseActivitySchema.index({ timestamp: -1 });

module.exports = mongoose.model('MouseActivity', mouseActivitySchema);
