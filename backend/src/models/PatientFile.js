const mongoose = require('mongoose');

const patientFileSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: [1, 'Patient ID must be at least 1 digit'],
    maxlength: [8, 'Patient ID cannot exceed 8 digits']
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters'],
    validate: [
      {
        validator: function (v) {
          // Allow letters in any language, accents, spaces, apostrophes, hyphens, periods and commas
          return /^[\p{L}\p{M}\s''.,-]+$/u.test(v);
        },
        message: 'Full name can only contain letters (any language), spaces, apostrophes, hyphens, periods and commas'
      }
    ]
  },
  phoneNumber: {
    type: String,
    trim: true,
    index: true,
    validate: [
      {
        validator: function (v) {
          // Optional, but if present must match format
          if (!v || v === '') return true;
          return /^\+234\d{10}$/.test(v);
        },
        message: 'Phone number must be in format +234XXXXXXXXXX or left empty'
      }
    ],
    default: ''
  },
  patientType: {
    type: String,
    enum: ['general', 'antenatal'],
    default: 'general',
    index: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters'],
    default: ''
  },
  cabinetNumber: {
    type: Number,
    min: [1, 'Cabinet number must be at least 1'],
    max: [50, 'Cabinet number cannot exceed 50']
  },
  shelfNumber: {
    type: Number,
    min: [1, 'Shelf number must be at least 1'],
    max: [20, 'Shelf number cannot exceed 20']
  },
  folderNumber: {
    type: Number,
    min: [1, 'Folder number must be at least 1'],
    max: [100, 'Folder number cannot exceed 100']
  },
  status: {
    type: String,
    enum: ['admitted', 'discharged', 'archived'],
    default: 'discharged'
  },
  // Custom fields added by admins
  customFields: [{
    fieldName: {
      type: String,
      required: true,
      trim: true
    },
    fieldValue: {
      type: String,
      default: ''
    },
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Audit trail fields
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Optional: Track location changes
  locationHistory: [{
    oldLocation: {
      cabinet: Number,
      shelf: Number,
      folder: Number
    },
    newLocation: {
      cabinet: Number,
      shelf: Number,
      folder: Number
    },
    reason: String,
    changedBy: String, // Future: user who made the change
    changedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Compound index for location (cabinet -> shelf -> folder)
patientFileSchema.index({
  cabinetNumber: 1,
  shelfNumber: 1,
  folderNumber: 1
});

// Text index for search functionality
patientFileSchema.index({
  fullName: 'text',
  patientId: 'text',
  phoneNumber: 'text',
  address: 'text'
});

// Pre-save middleware to update updatedAt
patientFileSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Static method for search with improved partial matching
patientFileSchema.statics.searchFiles = function (query) {
  // Escape special regex characters to prevent regex injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return this.find({
    $or: [
      { patientId: { $regex: escapedQuery, $options: 'i' } },
      { fullName: { $regex: escapedQuery, $options: 'i' } },
      { phoneNumber: { $regex: escapedQuery, $options: 'i' } },
      { address: { $regex: escapedQuery, $options: 'i' } }
    ]
  }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('PatientFile', patientFileSchema);