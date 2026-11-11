const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  // Patient reference
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientFile',
    required: true,
    index: true
  },

  // Snapshot fields (captured at visit start)
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

  // Stage tracking
  stage: {
    type: String,
    enum: ['waiting_for_file', 'with_doctor', 'needs_recording', 'filed'],
    default: 'waiting_for_file',
    required: true,
    index: true
  },

  // Visit lifecycle
  isOpen: {
    type: Boolean,
    default: true,
    index: true
  },

  // Who started the visit and when
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    required: true
  },

  // Sent to doctor transition
  sentToDoctorBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentToDoctorAt: {
    type: Date
  },

  // File back transition
  fileBackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fileBackAt: {
    type: Date
  },

  // Filed transition
  filedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  filedAt: {
    type: Date
  },

  // Last edited tracking
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedAt: {
    type: Date
  },

  // Vitals
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

  // Vitals not taken
  vitalsNotTaken: {
    type: Boolean,
    default: false
  },
  vitalsNotTakenReason: {
    type: String,
    maxlength: 200
  },

  // Who recorded vitals
  vitalsBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vitalsAt: {
    type: Date
  },

  // Tests (simple string array)
  tests: [{
    type: String,
    maxlength: 200
  }],
  testsNone: {
    type: Boolean,
    default: false
  },

  // Medications (simple string array)
  medications: [{
    type: String,
    maxlength: 200
  }],
  medicationsNone: {
    type: Boolean,
    default: false
  },

  // Notes
  notes: {
    type: String,
    maxlength: 1000
  }

}, { timestamps: true });

// Compound index for patient history queries
visitSchema.index({ patient: 1, createdAt: -1 });

// Index for open files queries
visitSchema.index({ isOpen: 1 });

// Partial unique index - only one open visit per patient at a time
// Using explicit name to avoid clashes with old index
visitSchema.index(
  { patient: 1 },
  { 
    unique: true,
    partialFilterExpression: { isOpen: true },
    name: 'one_open_visit_per_patient'
  }
);

module.exports = mongoose.model('Visit', visitSchema);
