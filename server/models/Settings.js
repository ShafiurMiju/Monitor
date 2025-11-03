const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Screenshot settings
  screenshotEnabled: {
    type: Boolean,
    default: true
  },
  screenshotInterval: {
    type: Number,
    default: 6000, // milliseconds (6 seconds = 10 per minute)
    min: 1000, // minimum 1 second
    max: 3600000 // maximum 1 hour
  },
  
  // Streaming settings
  streamingEnabled: {
    type: Boolean,
    default: true
  },
  
  // System settings
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    settings.lastUpdated = Date.now();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
