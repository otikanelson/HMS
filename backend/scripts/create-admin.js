const mongoose = require('mongoose');
const User = require('../src/models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const users = [
  {
    username: 'nelson',
    password: 'NELSON2005',
    fullName: 'Nelson - System Administrator',
    accessLevel: 'ADMINISTRATOR',
    phoneNumber: '+234 800 000 0001',
    mustChangePassword: false // Admin doesn't need to change password
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    console.log('Using MongoDB URI:', mongoUri.substring(0, 50) + '...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear ALL existing users first
    const deletedCount = await User.deleteMany({});
    console.log(`Deleted ${deletedCount} existing users`);

    // Create new user
    for (const userData of users) {
      try {
        // Create new user
        const user = new User(userData);
        await user.save();
        
        console.log(`✅ Created user: ${userData.username} (${userData.fullName})`);
      } catch (userError) {
        console.error(`❌ Failed to create user '${userData.username}':`, userError.message);
      }
    }

    console.log('\n🎉 Tender Care user account created!');
    console.log('\nLogin credentials:');
    users.forEach(user => {
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Access Level: ${user.accessLevel}`);
    });

  } catch (error) {
    console.error('❌ Failed to seed users:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

// Run the function
seedUsers();