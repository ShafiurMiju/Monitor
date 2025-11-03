const mongoose = require('mongoose');

const mouseTrackingSchema = new mongoose.Schema({
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
  movements: [{
    x: Number,
    y: Number,
    timestamp: Date
  }],
  clicks: [{
    x: Number,
    y: Number,
    button: String, // 'left', 'right', 'middle'
    timestamp: Date
  }],
  scrolls: [{
    deltaX: Number,
    deltaY: Number,
    timestamp: Date
  }],
  screenResolution: {
    width: Number,
    height: Number
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
mouseTrackingSchema.index({ userId: 1, startTime: -1 });
mouseTrackingSchema.index({ deviceId: 1, startTime: -1 });
mouseTrackingSchema.index({ sessionId: 1 });

module.exports = mongoose.model('MouseTracking', mouseTrackingSchema);
