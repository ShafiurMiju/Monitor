const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema({
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
  imageData: {
    type: String,
    required: true
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

// Index for efficient querying
screenshotSchema.index({ userId: 1, timestamp: -1 });
screenshotSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Screenshot', screenshotSchema);
