const mongoose = require('mongoose');
const PatientFile = require('../src/models/PatientFile');
require('dotenv').config();

// Sample patient names for testing
const names = [
  'Adebayo Johnson', 'Bukola Adeyemi', 'Chuka Okafor', 'Dayo Ibrahim',
  'Emeka Nwankwo', 'Folake Bello', 'Grace Okoro', 'Hassan Aliyu',
  'Ifunanya Eze', 'Joy Adeleke', 'Kemi Onuoha', 'Lanre Musa',
  'Mary Ogbonna', 'Ngozi Adamu', 'Olumide Nwosu', 'Peace Hassan',
  'Queen Okeke', 'Rotimi Chukwu', 'Sola Adesanya', 'Tunde Okonkwo',
  'Uche Bello', 'Victoria Okoro', 'Wale Adebayo', 'Xavier Eze',
  'Yemi Adeyemi', 'Zainab Okafor'
];

// Generate phone number
const generatePhone = () => {
  const prefixes = ['0803', '0806', '0813', '0816', '0903', '0906', '0705', '0708'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+234${prefix.substring(1)}${suffix}`;
};

// Generate patient
const generatePatient = (index, name) => {
  const patientId = (12340000 + index + 1).toString();
  
  return {
    patientId,
    fullName: name,
    phoneNumber: generatePhone(),
    cabinetNumber: Math.floor(Math.random() * 50) + 1,
    shelfNumber: Math.floor(Math.random() * 20) + 1,
    folderNumber: Math.floor(Math.random() * 100) + 1
  };
};

// Main seeding function
async function seedPatients() {
  try {
    console.log('🌱 Starting patient seeding process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing patients
    await PatientFile.deleteMany({});
    console.log('🧹 Cleared existing patient data');
    
    // Generate patient files
    const patients = [];
    for (let i = 0; i < names.length; i++) {
      patients.push(generatePatient(i, names[i]));
    }
    
    // Insert patient files
    const createdPatients = await PatientFile.insertMany(patients);
    console.log(`✅ Created ${createdPatients.length} patient files`);
    
    console.log(`\n👥 Total Patients: ${createdPatients.length}`);
    console.log('\n🎉 Patient seeding completed successfully!');
    
    // Show a few examples
    console.log('\n📋 Sample patients for testing:');
    createdPatients.slice(0, 5).forEach(patient => {
      console.log(`  ${patient.fullName} (ID: ${patient.patientId})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding patients:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedPatients()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedPatients };