const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

async function fixNelsonAccessLevel() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find nelson user
    const nelson = await User.findOne({ username: 'nelson' });
    
    if (!nelson) {
      console.log('❌ User "nelson" not found');
      return;
    }
    
    console.log('📋 Current nelson user:');
    console.log(`   Username: ${nelson.username}`);
    console.log(`   Full Name: ${nelson.fullName}`);
    console.log(`   Access Level: ${nelson.accessLevel || '(undefined - NEEDS FIX)'}`);
    console.log(`   Active: ${nelson.isActive}`);
    console.log('');
    
    if (nelson.accessLevel === 'ADMINISTRATOR') {
      console.log('✅ Nelson already has ADMINISTRATOR access level - no fix needed!');
      return;
    }
    
    // Fix the access level
    nelson.accessLevel = 'ADMINISTRATOR';
    await nelson.save();
    
    console.log('✅ Fixed! Nelson now has ADMINISTRATOR access level.');
    console.log('\n═══════════════════════════════════════');
    console.log('Updated user:');
    console.log(`   Username: ${nelson.username}`);
    console.log(`   Access Level: ${nelson.accessLevel}`);
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

fixNelsonAccessLevel();
