const mongoose = require('mongoose');
require('dotenv').config();
const Staff = require('../src/models/Staff');

async function getStaffIds() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    
    console.log('✓ Connected to MongoDB\n');

    // Get all staff
    const staffList = await Staff.find({}).select('_id firstName lastName role');
    
    console.log('Staff in database:');
    staffList.forEach(staff => {
      console.log(`{`);
      console.log(`  staffId: '${staff._id}',`);
      console.log(`  firstName: '${staff.firstName}',`);
      console.log(`  lastName: '${staff.lastName}',`);
      console.log(`  role: '${staff.role}'`);
      console.log(`},`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getStaffIds();
