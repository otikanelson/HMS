const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
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
  otherNames: {
    type: String,
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
  WeeklySchedule: {
    monday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    tuesday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    wednesday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    thursday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    friday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    saturday: { type: String, enum: ['day', 'night', 'off'], default: 'off' },
    sunday: { type: String, enum: ['day', 'night', 'off'], default: 'off' }
  },
  onDuty: {
    type: Boolean,
    default: true
  },
  salary: {
    type: Number,
    min: 0
  },
  bankAccount: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
staffSchema.virtual('fullName').get(function() {
  const names = [this.firstName, this.otherNames, this.lastName].filter(name => name && name.trim());
  return names.join(' ');
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

// Virtual for status display (based on current time and today's schedule)
staffSchema.virtual('statusDisplay').get(function() {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentHour = now.getHours();
  const todayShift = this.WeeklySchedule?.[today] || 'off';
  
  // Determine current shift: day (7 AM - 4 PM) or night (4 PM - 7 AM)
  const currentShift = (currentHour >= 7 && currentHour < 16) ? 'day' : 'night';
  
  if (todayShift === currentShift) {
    return 'On Duty';
  }
  return 'Off Duty';
});

// Virtual for shift display (based on today's schedule)
staffSchema.virtual('shiftDisplay').get(function() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayShift = this.WeeklySchedule?.[today] || 'off';
  
  if (todayShift === 'off') return 'Off';
  return todayShift.charAt(0).toUpperCase() + todayShift.slice(1);
});

// Index for search functionality
staffSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  otherNames: 'text',
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
      { otherNames: searchRegex },
      { role: searchRegex },
      { phoneNumber: searchRegex },
      { email: searchRegex }
    ]
  }).sort({ lastName: 1, firstName: 1 });
};

// Pre-save middleware to generate staffId if not provided
staffSchema.pre('save', function() {
  if (!this.staffId) {
    // Generate staffId from firstName and lastName if not provided
    const firstName = this.firstName.toUpperCase().slice(0, 3);
    const lastName = this.lastName.toUpperCase().slice(0, 3);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.staffId = `STAFF-${firstName}${lastName}-${randomNum}`;
  }
});

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;