const mongoose = require('mongoose');

const adminNoteSchema = new mongoose.Schema({
  body: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Index for faster queries by creator
adminNoteSchema.index({ createdBy: 1, createdAt: -1 });

const AdminNote = mongoose.model('AdminNote', adminNoteSchema);

module.exports = AdminNote;
