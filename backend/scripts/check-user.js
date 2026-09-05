const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

async function checkUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`\nFound ${users.length} user(s):\n`);
    
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Full Name: ${user.fullName}`);
      console.log(`Role: ${user.role}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });

    // Try to find nelson specifically
    const nelson = await User.findOne({ username: 'nelson' });
    if (nelson) {
      console.log('\n✅ Found nelson user');
      console.log('Password hash exists:', !!nelson.password);
      console.log('Password hash length:', nelson.password?.length);
      
      // Test password comparison
      const isValid = await nelson.comparePassword('NELSON2005');
      console.log('Password "NELSON2005" is valid:', isValid);
    } else {
      console.log('\n❌ Nelson user not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

checkUser();
