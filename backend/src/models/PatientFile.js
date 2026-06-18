const mongoose = require('mongoose');

const patientFileSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: [4, 'Patient ID must be at least 4 digits'],
    maxlength: [8, 'Patient ID cannot exceed 8 digits']
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true,
    validate: [
      {
        validator: function(v) {
          return /^\+234\d{10}$/.test(v);
        },
        message: 'Phone number must be in format +234XXXXXXXXXX'
      }
    ]
  },
  cabinetNumber: {
    type: Number,
    required: true,
    min: [1, 'Cabinet number must be at least 1'],
    max: [50, 'Cabinet number cannot exceed 50']
  },
  shelfNumber: {
    type: Number,
    required: true,
    min: [1, 'Shelf number must be at least 1'],
    max: [20, 'Shelf number cannot exceed 20']
  },
  folderNumber: {
    type: Number,
    required: true,
    min: [1, 'Folder number must be at least 1'],
    max: [100, 'Folder number cannot exceed 100']
  },
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
  phoneNumber: 'text'
});

// Virtual for full location display
patientFileSchema.virtual('locationDisplay').get(function() {
  return `Cabinet ${this.cabinetNumber} → Shelf ${this.shelfNumber} → Folder ${this.folderNumber}`;
});

// Pre-save middleware to update updatedAt
patientFileSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Instance method to update location with history
patientFileSchema.methods.updateLocation = function(newCabinet, newShelf, newFolder, reason = '', changedBy = '') {
  const oldLocation = {
    cabinet: this.cabinetNumber,
    shelf: this.shelfNumber,
    folder: this.folderNumber
  };
  
  // Add to history if location actually changed
  if (oldLocation.cabinet !== newCabinet || 
      oldLocation.shelf !== newShelf || 
      oldLocation.folder !== newFolder) {
    
    this.locationHistory.push({
      oldLocation,
      newLocation: {
        cabinet: newCabinet,
        shelf: newShelf,
        folder: newFolder
      },
      reason,
      changedBy
    });
  }
  
  // Update current location
  this.cabinetNumber = newCabinet;
  this.shelfNumber = newShelf;
  this.folderNumber = newFolder;
};

// Static method for search with improved partial matching
patientFileSchema.statics.searchFiles = function(query) {
  // Escape special regex characters to prevent regex injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  return this.find({
    $or: [
      { patientId: { $regex: escapedQuery, $options: 'i' } },
      { fullName: { $regex: escapedQuery, $options: 'i' } },
      { phoneNumber: { $regex: escapedQuery, $options: 'i' } }
    ]
  }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('PatientFile', patientFileSchema);