const mongoose = require('mongoose');
const User = require('../src/models/User');

async function migrateUsernamesToLowercase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    let updated = 0;
    for (const user of users) {
      const lowercaseUsername = user.username.toLowerCase().trim();
      
      if (user.username !== lowercaseUsername) {
        console.log(`Updating: "${user.username}" → "${lowercaseUsername}"`);
        user.username = lowercaseUsername;
        await user.save();
        updated++;
      }
    }

    console.log(`\n✓ Migration complete: ${updated} usernames updated to lowercase`);
    
    // Verify
    const verifyUsers = await User.find({});
    console.log('\nVerification:');
    verifyUsers.forEach(u => {
      console.log(`  - ${u.username} (${u.fullName})`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsernamesToLowercase();
