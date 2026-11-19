const mongoose = require('mongoose');
const User = require('../src/models/User');

async function clearAndSeed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✓ Connected to MongoDB');

    // Delete ALL users
    const deleteResult = await User.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing users`);

    // Create fresh admin user
    const adminUser = new User({
      username: 'otika',
      password: 'NELSON2005',
      fullName: 'Otika Nelson',
      accessLevel: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false
    });

    await adminUser.save();
    console.log('\n✓ Created new admin user');
    console.log('  Username: otika');
    console.log('  Password: NELSON2005');
    console.log('  Full Name: Otika Nelson');
    console.log('  Access Level: ADMINISTRATOR\n');

    // Verify it exists
    const verify = await User.findOne({ username: 'otika' });
    if (verify) {
      console.log('✓ Verification: User found in database');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

clearAndSeed();
