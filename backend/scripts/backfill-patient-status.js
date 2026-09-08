/**
 * One-time migration script to backfill status field on existing patient records
 * Run with: node backend/scripts/backfill-patient-status.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const PatientFile = require('../src/models/PatientFile');

async function backfillPatientStatus() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all patients without a status field
    const patientsWithoutStatus = await PatientFile.find({ 
      status: { $exists: false } 
    });

    console.log(`\n📊 Found ${patientsWithoutStatus.length} patient records without status field`);

    if (patientsWithoutStatus.length === 0) {
      console.log('✅ All patient records already have status field - no backfill needed');
      process.exit(0);
    }

    // Update all records to have default 'discharged' status
    const result = await PatientFile.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'discharged' } }
    );

    console.log(`\n✅ Backfill complete:`);
    console.log(`   - Records updated: ${result.modifiedCount}`);
    console.log(`   - Default status set: 'discharged'`);
    console.log(`\n💡 Existing patient records are now properly initialized.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

backfillPatientStatus();
