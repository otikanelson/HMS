const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const User = require('../src/models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createUserForStaff() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}\n`);

    // Step 1: List all staff members without user accounts
    console.log('📋 Finding staff members without login accounts...\n');
    
    const allStaff = await Staff.find({});
    const allUsers = await User.find({}).select('staffId');
    
    const userStaffIds = new Set(allUsers.map(u => u.staffId?.toString()).filter(Boolean));
    
    const staffWithoutAccounts = allStaff.filter(s => !userStaffIds.has(s._id.toString()));
    
    if (staffWithoutAccounts.length === 0) {
      console.log('✅ All staff members already have user accounts!');
      console.log('\nExisting staff with accounts:');
      for (const staff of allStaff) {
        const user = allUsers.find(u => u.staffId?.toString() === staff._id.toString());
        if (user) {
          console.log(`  - ${staff.fullName} (${staff.staffId}) → User: ${user.username}`);
        }
      }
      return;
    }
    
    console.log(`Found ${staffWithoutAccounts.length} staff member(s) without login accounts:\n`);
    staffWithoutAccounts.forEach((staff, idx) => {
      console.log(`${idx + 1}. ${staff.fullName}`);
      console.log(`   Staff ID: ${staff.staffId}`);
      console.log(`   Role: ${staff.roleDisplay}`);
      console.log(`   Shift: ${staff.shiftDisplay}`);
      console.log('');
    });
    
    // Step 2: Create user accounts for each staff member
    console.log('═══════════════════════════════════════');
    console.log('Creating User Accounts...');
    console.log('═══════════════════════════════════════\n');
    
    for (const staff of staffWithoutAccounts) {
      try {
        // Generate credentials
        const username = staff.staffId;
        const tempPassword = Array.from({ length: 12 }, () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
          return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join('');
        
        // Determine access level based on role (you can customize this)
        let accessLevel = 'CLINICAL_STAFF'; // Default
        if (staff.role === 'DOCTOR') {
          accessLevel = 'CLINICAL_STAFF'; // Doctors are clinical staff
        } else if (staff.role === 'NURSE' || staff.role === 'TRAINEE_NURSE' || staff.role === 'MIDWIFE') {
          accessLevel = 'CLINICAL_STAFF';
        } else if (staff.role === 'MAINTENANCE') {
          accessLevel = 'CLINICAL_STAFF'; // Or adjust as needed
        }
        
        // Create full name
        const fullName = [staff.firstName, staff.otherNames, staff.lastName]
          .filter(name => name && name.trim())
          .join(' ');
        
        // Create User
        const newUser = new User({
          username: username,
          password: tempPassword, // Pre-save hook will hash it
          fullName: fullName,
          accessLevel: accessLevel,
          staffId: staff._id,
          mustChangePassword: true,
          isActive: true
        });
        
        await newUser.save();
        
        console.log(`✅ Created account for: ${staff.fullName}`);
        console.log('   ═══════════════════════════════════════');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${tempPassword}`);
        console.log(`   Access Level: ${accessLevel}`);
        console.log('   ═══════════════════════════════════════');
        console.log('   ⚠️  Save these credentials - they won\'t be shown again!\n');
        
      } catch (userError) {
        console.error(`❌ Failed to create account for ${staff.fullName}:`, userError.message);
      }
    }
    
    console.log('\n✅ Done! All accounts created successfully.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

createUserForStaff();
