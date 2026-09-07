const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

async function resetStaffPassword() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Replace this with your staff username from the database
    const username = 'STAFF-CHIEIL-444'; // Change this to your actual username
    const newPassword = 'TempPass123'; // Temporary password to set

    const user = await User.findOne({ username });

    if (!user) {
      console.log(`❌ User '${username}' not found`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('username fullName accessLevel');
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.fullName}) - ${u.accessLevel}`);
      });
      return;
    }

    console.log(`Found user: ${user.fullName} (${user.username})`);
    console.log(`Access Level: ${user.accessLevel}`);
    console.log(`Current status: ${user.isActive ? 'Active' : 'Inactive'}\n`);

    // Update password
    user.password = newPassword;
    user.mustChangePassword = true; // Force password change on first login
    await user.save();

    console.log('✅ Password reset successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('  LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log(`  Username: ${user.username}`);
    console.log(`  Password: ${newPassword}`);
    console.log('═══════════════════════════════════════\n');
    console.log('⚠️  User will be required to change password on first login');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

resetStaffPassword();
