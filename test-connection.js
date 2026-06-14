const database = require('./src/config/database');
const PatientFile = require('./src/models/PatientFile');

async function testConnection() {
  try {
    console.log('🧪 Testing MongoDB connection...\n');
    
    // Test connection
    await database.connect();
    console.log('✅ Connection successful!\n');
    
    // Test health check
    const health = await database.healthCheck();
    console.log('🏥 Health Check:', health);
    console.log();
    
    // Test creating a sample patient record
    console.log('👤 Testing patient file creation...');
    const testPatient = new PatientFile({
      patientId: 'TEST001',
      fullName: 'John Test Patient',
      phoneNumber: '555-0123',
      cabinetNumber: 1,
      shelfNumber: 2, 
      folderNumber: 3
    });
    
    await testPatient.save();
    console.log('✅ Sample patient created:', testPatient.locationDisplay);
    
    // Test search functionality
    console.log('\n🔍 Testing search...');
    const searchResults = await PatientFile.searchFiles('john');
    console.log('✅ Search results:', searchResults.length, 'found');
    
    // Cleanup test data
    await PatientFile.deleteOne({ patientId: 'TEST001' });
    console.log('🗑️ Cleanup: Test patient deleted\n');
    
    // Show connection status
    const status = database.getStatus();
    console.log('📊 Final Status:', status);
    
    console.log('\n🎉 All tests passed! Your database is ready.');
    
  } catch (error) {
    console.error('💥 Connection test failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔑 Check your username/password in .env');
    } else if (error.message.includes('network')) {
      console.log('\n🌐 Check your network connection and MongoDB Atlas whitelist');
    }
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

testConnection();