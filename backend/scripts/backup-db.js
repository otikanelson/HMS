const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function backupDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupDir = path.join(__dirname, '..', '..', 'backups', timestamp);
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📁 Backing up to ${backupDir}...`);

    for (const collection of collections) {
      const collectionName = collection.name;
      const docs = await db.collection(collectionName).find({}).toArray();
      const filePath = path.join(backupDir, `${collectionName}.json`);
      
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      console.log(`✅ Backed up ${collectionName} (${docs.length} documents)`);
    }

    console.log('🎉 Database backup complete!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
