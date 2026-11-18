const mongoose = require('mongoose');
const InventoryItem = require('../src/models/InventoryItem');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Helper: normalize name for duplicate checking (lowercase, trim extra spaces)
const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, ' ').trim();

async function seedInventory() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}\n`);

    // Read seed data
    const seedDataPath = path.join(__dirname, 'data/inventory-seed.json');
    if (!fs.existsSync(seedDataPath)) {
      throw new Error(`Seed data file not found: ${seedDataPath}`);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    console.log(`📦 Loaded ${seedData.length} items from seed file\n`);

    // Get admin user for lastUpdatedBy
    const User = require('../src/models/User');
    const adminUser = await User.findOne({ username: 'nelson' });
    
    if (!adminUser) {
      console.log('⚠️  Admin user "nelson" not found. Items will be seeded without lastUpdatedBy.\n');
    }

    // Fetch all existing active items to check for duplicates
    const existingItems = await InventoryItem.find({ isActive: true });
    const existingNormalizedNames = new Map();
    existingItems.forEach(item => {
      existingNormalizedNames.set(normalizeName(item.name), item);
    });

    let added = 0;
    let skipped = 0;

    console.log('📝 Seeding inventory items...\n');

    for (const itemData of seedData) {
      const normalizedName = normalizeName(itemData.name);
      
      // Check if item already exists (ignoring case and spaces)
      if (existingNormalizedNames.has(normalizedName)) {
        console.log(`⏭️  Skipped: "${itemData.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create new item
      const newItem = new InventoryItem({
        name: itemData.name.trim(),
        category: itemData.category,
        unit: itemData.unit || null,
        price: itemData.price,
        expectedQuantity: itemData.expectedQuantity,
        lastUpdatedBy: adminUser ? adminUser._id : null
      });

      await newItem.save();
      existingNormalizedNames.set(normalizedName, newItem);
      added++;
      console.log(`✅ Added: "${itemData.name}"`);
    }

    console.log(`\n📊 Seed summary:`);
    console.log(`   ✅ Added: ${added}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);

    // Count items still missing price
    const itemsWithoutPrice = await InventoryItem.countDocuments({ 
      isActive: true, 
      price: null 
    });
    console.log(`   💰 Items with no price yet: ${itemsWithoutPrice}\n`);

    console.log(`✅ Inventory seeding complete`);

  } catch (error) {
    console.error('❌ Error seeding inventory:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedInventory();
