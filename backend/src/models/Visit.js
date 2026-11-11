const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  // Patient reference
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientFile',
    required: true,
    index: true
  },

  // Snapshot fields
  patientId: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  fileLocation: {
    type: String,
    required: true
  },

  // File tracking
  fileStatus: {
    type: String,
    enum: ['out', 'returned'],
    default: 'out',
    index: true
  },
  documentationStatus: {
    type: String,
    enum: ['pending', 'done'],
    default: 'pending',
    index: true
  },

  // Checkout info
  checkedOutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkedOutAt: {
    type: Date,
    required: true,
    index: true
  },

  // Return info
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedAt: {
    type: Date
  },

  // Clinical details
  vitals: {
    systolic: {
      type: Number,
      min: 50,
      max: 260
    },
    diastolic: {
      type: Number,
      min: 30,
      max: 160
    },
    heartRate: {
      type: Number,
      min: 20,
      max: 250
    }
  },

  tests: [{
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    result: {
      type: String,
      maxlength: 200
    }
  }],

  medications: [{
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    dose: {
      type: String,
      maxlength: 100
    },
    frequency: {
      type: String,
      maxlength: 100
    },
    duration: {
      type: String,
      maxlength: 100
    }
  }],

  notes: {
    type: String,
    maxlength: 1000
  },

  // Documentation tracking
  documentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  documentedAt: {
    type: Date
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedAt: {
    type: Date
  }

}, { timestamps: true });

// Compound index for patient history queries
visitSchema.index({ patient: 1, createdAt: -1 });

// Index for open files queries
visitSchema.index({ fileStatus: 1, documentationStatus: 1 });

// Partial unique index - only one file can be 'out' per patient at a time
visitSchema.index(
  { patient: 1 },
  { 
    unique: true,
    partialFilterExpression: { fileStatus: 'out' }
  }
);

module.exports = mongoose.model('Visit', visitSchema);
