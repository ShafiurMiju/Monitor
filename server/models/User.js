const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false // Not required for external API users
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  computerName: {
    type: String,
    default: ''
  },
  // Fields from external API
  externalUserId: {
    type: String,
    default: null // ID from Octopi Digital API
  },
  name: {
    type: String,
    default: '' // Full name from external API
  },
  photoUrl: {
    type: String,
    default: ''
  },
  isExternalUser: {
    type: Boolean,
    default: false // True if user logged in via external API
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isStreaming: {
    type: Boolean,
    default: false
  },
  screenShowEnabled: {
    type: Boolean,
    default: true // Admin can control whether screenshots are enabled for this user
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving (only if password exists)
userSchema.pre('save', async function(next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
