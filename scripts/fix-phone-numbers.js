const mongoose = require('mongoose');
const PatientFile = require('../src/models/PatientFile');
require('dotenv').config();

async function fixPhoneNumbers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all patients with phone numbers containing hyphens
    const patientsWithHyphens = await PatientFile.find({
      phoneNumber: { $regex: /-/ }
    });

    console.log(`Found ${patientsWithHyphens.length} patients with hyphens in phone numbers`);

    if (patientsWithHyphens.length === 0) {
      console.log('No patients with hyphens found. Nothing to update.');
      return;
    }

    // Show current phone numbers
    console.log('\nCurrent phone numbers with hyphens:');
    patientsWithHyphens.forEach(patient => {
      console.log(`- ${patient.fullName}: ${patient.phoneNumber}`);
    });

    // Update phone numbers by removing all hyphens
    const bulkOps = patientsWithHyphens.map(patient => ({
      updateOne: {
        filter: { _id: patient._id },
        update: {
          $set: {
            phoneNumber: patient.phoneNumber.replace(/-/g, '')
          }
        }
      }
    }));

    const result = await PatientFile.bulkWrite(bulkOps);
    console.log(`\n✅ Successfully updated ${result.modifiedCount} phone numbers`);

    // Show updated phone numbers
    const updatedPatients = await PatientFile.find({
      _id: { $in: patientsWithHyphens.map(p => p._id) }
    });

    console.log('\nUpdated phone numbers:');
    updatedPatients.forEach(patient => {
      console.log(`- ${patient.fullName}: ${patient.phoneNumber}`);
    });

  } catch (error) {
    console.error('❌ Failed to fix phone numbers:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

// Run the function
fixPhoneNumbers();