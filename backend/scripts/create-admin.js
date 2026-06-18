const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

const users = [
  {
    username: 'nelson',
    password: 'NELSON2005',
    fullName: 'Nelson - System Administrator',
    role: 'admin',
    phoneNumber: '+234 800 000 0001'
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
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

    console.log('\n🎉 De Tender Care user account created!');
    console.log('\nLogin credentials:');
    users.forEach(user => {
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Role: ${user.role}`);
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