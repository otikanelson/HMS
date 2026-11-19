const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/User');

async function restoreUsersWithStaffId() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    
    console.log('✓ Connected to MongoDB\n');

    // Delete all non-admin users (keep otika)
    const deleteResult = await User.deleteMany({ accessLevel: { $ne: 'ADMINISTRATOR' } });
    console.log(`✓ Deleted ${deleteResult.deletedCount} non-admin users`);

    // Staff users with their correct staffId
    const staffUsers = [
      {
        username: 'STAFF-CHIOKA-821',
        password: 'DefaultPass123!',
        fullName: 'Chinaza Blessing Okafor',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8622',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OKWNWA-405',
        password: 'DefaultPass123!',
        fullName: 'Okwuchi Grace Nwankwo',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8628',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-VERADE-684',
        password: 'DefaultPass123!',
        fullName: 'Vera Joy Adebayo',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c862e',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-GIFEZE-429',
        password: 'DefaultPass123!',
        fullName: 'Gift Peace Eze',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8634',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OGEOKO-453',
        password: 'DefaultPass123!',
        fullName: 'Ogechi Faith Okoro',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c863a',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-OLUCHU-607',
        password: 'DefaultPass123!',
        fullName: 'Oluchi Hope Chukwu',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8640',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-VICMUS-715',
        password: 'DefaultPass123!',
        fullName: 'Victoria Love Musa',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8646',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-ESTBEL-083',
        password: 'DefaultPass123!',
        fullName: 'Esther Mercy Bello',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c864c',
        isActive: true,
        mustChangePassword: true
      },
      {
        username: 'STAFF-DANOGB-892',
        password: 'DefaultPass123!',
        fullName: 'Daniel Wisdom Ogbonna',
        accessLevel: 'CLINICAL_STAFF',
        staffId: '6a9e1228273f325d663c8652',
        isActive: true,
        mustChangePassword: true
      }
    ];

    // Create all staff users
    const created = await User.insertMany(staffUsers);
    console.log(`✓ Restored ${created.length} staff users with staffId links\n`);

    // Verify
    const allUsers = await User.find({}).select('username fullName staffId accessLevel');
    console.log('✓ All users in database:');
    allUsers.forEach(u => {
      const staffLink = u.staffId ? `(linked to staff: ${u.staffId})` : '(no staff link)';
      console.log(`  - ${u.username} [${u.accessLevel}] ${staffLink}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

restoreUsersWithStaffId();
