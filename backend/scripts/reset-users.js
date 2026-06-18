const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function resetUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Drop the users collection completely (this removes all indexes too)
    try {
      await mongoose.connection.db.collection('users').drop();
      console.log('✅ Dropped users collection and all indexes');
    } catch (error) {
      if (error.code === 26) {
        console.log('ℹ️ Users collection does not exist');
      } else {
        throw error;
      }
    }

    console.log('🎉 Database reset completed!');

  } catch (error) {
    console.error('❌ Failed to reset database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the function
resetUsers();