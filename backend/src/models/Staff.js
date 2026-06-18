const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    unique: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['DOCTOR', 'NURSE', 'TRAINEE_NURSE', 'MIDWIFE', 'MAINTENANCE'],
    uppercase: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String,
    endTime: String
  }],
  location: {
    building: {
      type: String,
      default: 'Main Hospital'
    },
    floor: {
      type: Number,
      default: 1
    },
    room: {
      type: String,
      default: 'General'
    }
  },
  supervisorId: {
    type: String,
    ref: 'Staff'
  },
  shift: {
    type: String,
    required: true,
    enum: ['DAY', 'NIGHT'],
    default: 'DAY'
  },
  onDuty: {
    type: Boolean,
    default: true
  },
  hireDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  salary: {
    type: Number,
    min: 0
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
staffSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for location display
staffSchema.virtual('locationDisplay').get(function() {
  const { building, floor, room } = this.location;
  return `${building}, Floor ${floor}, ${room}`;
});

// Virtual for role display
staffSchema.virtual('roleDisplay').get(function() {
  const roleMap = {
    'DOCTOR': 'Doctor',
    'NURSE': 'Nurse',
    'TRAINEE_NURSE': 'Trainee Nurse',
    'MIDWIFE': 'Midwife',
    'MAINTENANCE': 'Maintenance'
  };
  return roleMap[this.role] || this.role;
});

// Virtual for status display
staffSchema.virtual('statusDisplay').get(function() {
  return this.onDuty ? 'On Duty' : 'Off Duty';
});

// Virtual for shift display
staffSchema.virtual('shiftDisplay').get(function() {
  return this.shift ? this.shift.charAt(0).toUpperCase() + this.shift.slice(1).toLowerCase() : 'Day';
});

// Index for search functionality
staffSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  employeeId: 'text',
  role: 'text'
});

// Static method to search staff with improved partial matching
staffSchema.statics.searchStaff = function(query) {
  // Escape special regex characters to prevent regex injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(escapedQuery, 'i');
  
  return this.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { employeeId: searchRegex },
      { role: searchRegex },
      { phoneNumber: searchRegex },
      { email: searchRegex }
    ]
  }).sort({ lastName: 1, firstName: 1 });
};

// Instance method to update location
staffSchema.methods.updateLocation = function(building, floor, room, reason = 'Location updated') {
  const previousLocation = { ...this.location };
  
  this.location = {
    building: building || this.location.building,
    floor: floor || this.location.floor,
    room: room || this.location.room
  };

  // Add to location history if we want to track changes
  if (!this.locationHistory) {
    this.locationHistory = [];
  }
  
  this.locationHistory.push({
    previousLocation,
    newLocation: { ...this.location },
    reason,
    changedAt: new Date()
  });
};

// Pre-save middleware to generate staffId if not provided
staffSchema.pre('save', function(next) {
  if (!this.staffId && this.employeeId) {
    // Generate staffId from employeeId if not provided
    this.staffId = `STAFF-${this.employeeId}`;
  }
  next();
});

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;