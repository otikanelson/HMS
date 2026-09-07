const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabases() {
  try {
    console.log('Checking MongoDB Atlas databases...\n');
    
    // Connect using the .env URI
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('❌ MONGODB_URI not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      return;
    }
    
    console.log('Connection string from .env:');
    console.log(mongoUri.substring(0, 80) + '...\n');
    
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to database: ${mongoose.connection.name}\n`);
    
    // List all collections in the current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Collections in "${mongoose.connection.name}":`);
    for (const coll of collections) {
      const count = await mongoose.connection.db.collection(coll.name).countDocuments();
      console.log(`   - ${coll.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
    process.exit(0);
  }
}

checkDatabases();
