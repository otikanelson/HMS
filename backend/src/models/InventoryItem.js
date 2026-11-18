const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 120,
    lowercase: true
  },
  category: { 
    type: String, 
    enum: ['drug', 'supply'], 
    required: true 
  },
  unit: { 
    type: String, 
    trim: true, 
    maxlength: 40,
    default: null
  },
  expectedQuantity: { 
    type: Number, 
    min: 0,
    default: null
  },
  price: { 
    type: Number, 
    min: 0,
    default: null
  },
  notes: { 
    type: String, 
    maxlength: 300,
    default: null
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastUpdatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Index on isActive, category, and name for efficient queries
inventoryItemSchema.index({ isActive: 1, category: 1, name: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
