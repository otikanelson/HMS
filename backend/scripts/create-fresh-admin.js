const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function createFreshAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    
    console.log('✓ Connected to MongoDB');

    // Delete ALL users
    const deleteResult = await User.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} users`);

    // Create admin user
    const adminUser = new User({
      username: 'otika',
      password: 'NELSON2005',
      fullName: 'Otika Nelson',
      accessLevel: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false
    });

    const saved = await adminUser.save();
    console.log('\n✓ Admin user created:');
    console.log(`  Username: otika`);
    console.log(`  Password: NELSON2005`);
    console.log(`  Full Name: Otika Nelson`);
    console.log(`  Access Level: ADMINISTRATOR`);

    // Verify
    const verify = await User.findOne({ username: 'otika' });
    if (verify) {
      console.log('\n✓ Verified: User exists in database');
      console.log(`  ID: ${verify._id}`);
      console.log(`  Username: ${verify.username}`);
    } else {
      console.log('\n✗ ERROR: User not found after creation!');
    }

    // Show all users
    const allUsers = await User.find({});
    console.log(`\n✓ Total users in database: ${allUsers.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createFreshAdmin();
