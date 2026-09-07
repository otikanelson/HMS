const mongoose = require('mongoose');
const PatientFile = require('../src/models/PatientFile');
const Staff = require('../src/models/Staff');
const User = require('../src/models/User');
const Notice = require('../src/models/Notice');
require('dotenv').config({ path: '../.env' });

async function verifyData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}\n`);

    // Count all collections
    const patientCount = await PatientFile.countDocuments();
    const staffCount = await Staff.countDocuments();
    const userCount = await User.countDocuments();
    const noticeCount = await Notice.countDocuments();

    console.log('═══════════════════════════════════════');
    console.log('DATABASE SUMMARY');
    console.log('═══════════════════════════════════════\n');

    console.log(`👥 Patient Files: ${patientCount}`);
    if (patientCount > 0) {
      const recentPatients = await PatientFile.find().sort({ createdAt: -1 }).limit(3);
      recentPatients.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.fullName} (${p.patientId})`);
      });
    }
    console.log('');

    console.log(`👔 Staff Members: ${staffCount}`);
    if (staffCount > 0) {
      const staff = await Staff.find().limit(5);
      staff.forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.fullName} - ${s.roleDisplay}`);
      });
      if (staffCount > 5) console.log(`   ... and ${staffCount - 5} more`);
    }
    console.log('');

    console.log(`🔐 User Accounts: ${userCount}`);
    if (userCount > 0) {
      const users = await User.find().select('username fullName accessLevel');
      users.forEach((u, idx) => {
        console.log(`   ${idx + 1}. ${u.username} - ${u.fullName} (${u.accessLevel})`);
      });
    }
    console.log('');

    console.log(`📢 Notices: ${noticeCount}`);
    if (noticeCount > 0) {
      const notices = await Notice.find().sort({ createdAt: -1 });
      notices.forEach((n, idx) => {
        console.log(`   ${idx + 1}. [${n.type.toUpperCase()}] ${n.title}`);
      });
    }
    console.log('');

    // Check data integrity
    console.log('═══════════════════════════════════════');
    console.log('DATA INTEGRITY CHECKS');
    console.log('═══════════════════════════════════════\n');

    const staffWithoutUsers = await Staff.countDocuments();
    const staffIds = (await Staff.find().select('_id')).map(s => s._id.toString());
    const usersWithStaff = await User.countDocuments({ staffId: { $in: staffIds } });
    
    console.log(`✅ Staff records: ${staffWithoutUsers}`);
    console.log(`✅ Users linked to staff: ${usersWithStaff}`);
    
    if (staffWithoutUsers > usersWithStaff) {
      console.log(`⚠️  ${staffWithoutUsers - usersWithStaff} staff member(s) without user accounts`);
    }

    const cabinets = await PatientFile.distinct('cabinetNumber');
    console.log(`✅ Cabinets in use: ${cabinets.length}`);

    console.log('\n═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

verifyData();
