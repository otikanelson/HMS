const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function restoreStaffAndAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    
    console.log('✓ Connected to MongoDB');

    // The 9 staff users to restore
    const staffUsers = [
      {
        username: 'STAFF-CHIOKA-821',
        password: 'DefaultPass123!',
        fullName: 'Chinaza Blessing Okafor',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OKWNWA-405',
        password: 'DefaultPass123!',
        fullName: 'Okwuchi Grace Nwankwo',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-VERADE-684',
        password: 'DefaultPass123!',
        fullName: 'Vera Joy Adebayo',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-GIFEZE-429',
        password: 'DefaultPass123!',
        fullName: 'Gift Peace Eze',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OGEOKO-453',
        password: 'DefaultPass123!',
        fullName: 'Ogechi Faith Okoro',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OLUCHU-607',
        password: 'DefaultPass123!',
        fullName: 'Oluchi Hope Chukwu',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-VICMUS-715',
        password: 'DefaultPass123!',
        fullName: 'Victoria Love Musa',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-ESTBEL-083',
        password: 'DefaultPass123!',
        fullName: 'Esther Mercy Bello',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-DANOGB-892',
        password: 'DefaultPass123!',
        fullName: 'Daniel Wisdom Ogbonna',
        accessLevel: 'CLINICAL_STAFF',
        isActive: true,
        mustChangePassword: true
      }
    ];

    // Create all staff users
    const created = await User.insertMany(staffUsers);
    console.log(`✓ Restored ${created.length} staff users`);

    // Create admin user
    const adminUser = new User({
      username: 'otika',
      password: 'NELSON2005',
      fullName: 'Otika Nelson',
      accessLevel: 'ADMINISTRATOR',
      isActive: true,
      mustChangePassword: false
    });

    await adminUser.save();
    console.log(`✓ Created admin user`);

    // Verify
    const allUsers = await User.find({}).select('username fullName accessLevel');
    console.log(`\n✓ Total users in database: ${allUsers.length}`);
    console.log('\nUsers:');
    allUsers.forEach(u => {
      console.log(`  - ${u.username} (${u.fullName}) [${u.accessLevel}]`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

restoreStaffAndAdmin();
