const mongoose = require('mongoose');

const storageRangeSchema = new mongoose.Schema({
  section: {
    type: Number,
    required: true,
    min: 1,
    max: 99
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  column: {
    type: String,
    required: true,
    enum: ['left', 'right']
  },
  fromNumber: {
    type: Number,
    required: true,
    min: 1
  },
  toNumber: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Unique index on section, tier, column
storageRangeSchema.index({ section: 1, tier: 1, column: 1 }, { unique: true });

// Pre-save middleware to update updatedAt
storageRangeSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('StorageRange', storageRangeSchema);
