const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function checkDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connection URI:', mongoUri.substring(0, 50) + '...');
    
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    
    const db = mongoose.connection.db;
    console.log('\nConnected to database:', db.name);
    
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(c => console.log('  -', c.name));
    
    const userCount = await User.countDocuments();
    console.log('\nTotal users:', userCount);
    
    const users = await User.find({}).select('username fullName accessLevel');
    console.log('\nUsers in database:');
    users.forEach(u => {
      console.log(`  - ${u.username} (${u.fullName}) [${u.accessLevel}]`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDB();
