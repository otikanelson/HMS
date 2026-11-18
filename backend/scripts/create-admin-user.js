const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createAdminUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create admin user with lowercase username
    const adminUser = new User({
      username: 'otika',
      password: 'NELSON2005',
      fullName: 'Otika Nelson',
      accessLevel: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false
    });

    await adminUser.save();

    console.log('\n✓ Admin user created successfully');
    console.log('Username: otika');
    console.log('Password: NELSON2005');
    console.log('Access Level: ADMINISTRATOR');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
