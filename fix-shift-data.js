const mongoose = require('mongoose');
const Staff = require('./src/models/Staff');
require('dotenv').config();

async function fixShiftData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations');
    console.log('Connected to MongoDB');
    
    // Update records without shift field
    const result1 = await Staff.updateMany(
      { shift: { $exists: false } }, 
      { $set: { shift: 'DAY' } }
    );
    console.log('Records without shift field updated:', result1.modifiedCount);
    
    // Update records with null shift
    const result2 = await Staff.updateMany(
      { shift: null }, 
      { $set: { shift: 'DAY' } }
    );
    console.log('Records with null shift updated:', result2.modifiedCount);
    
    // Update records without onDuty field
    const result3 = await Staff.updateMany(
      { onDuty: { $exists: false } }, 
      { $set: { onDuty: true } }
    );
    console.log('Records without onDuty field updated:', result3.modifiedCount);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixShiftData();