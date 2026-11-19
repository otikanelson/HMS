const mongoose = require('mongoose');
const User = require('../src/models/User');

async function resetAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');

    // Delete existing otika user if exists
    const existing = await User.findOneAndDelete({ username: 'otika' });
    if (existing) {
      console.log('Deleted existing otika user');
    }

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

    console.log('\n✓ Admin user reset successfully');
    console.log('Username: otika');
    console.log('Password: NELSON2005');
    console.log('Full Name: Otika Nelson');
    console.log('Access Level: ADMINISTRATOR');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdmin();
