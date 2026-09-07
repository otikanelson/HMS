const mongoose = require('mongoose');
const Notice = require('../src/models/Notice');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sampleNotices = [
  {
    title: 'New Staff Onboarding System Live',
    body: 'All new staff members now automatically receive login credentials when their profile is created. Administrators can view and manage staff accounts from the Staff page.',
    type: 'update'
  },
  {
    title: 'Weekly Payroll Processing Reminder',
    body: 'Payroll processing for the current week is scheduled for Friday at 4:00 PM. Please ensure all timesheets are submitted by Thursday evening.',
    type: 'info'
  },
  {
    title: 'System Maintenance - Sunday 2 AM',
    body: 'The hospital management system will be offline for scheduled maintenance this Sunday from 2:00 AM to 4:00 AM. Please complete all urgent tasks before then.',
    type: 'urgent'
  },
  {
    title: 'Patient File Archival Guidelines Updated',
    body: 'New guidelines for archiving patient files have been published. Files older than 5 years should be marked for archival. Contact Records Management for details.',
    type: 'info'
  },
  {
    title: 'Security Update Completed',
    body: 'A security update was successfully applied to all user accounts. If you experience any login issues, please contact IT support immediately.',
    type: 'update'
  }
];

async function seedNotices() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}\n`);

    // Get the admin user (nelson)
    const User = require('../src/models/User');
    const adminUser = await User.findOne({ username: 'nelson' });
    
    if (!adminUser) {
      console.log('❌ Admin user "nelson" not found. Cannot seed notices without a user.');
      return;
    }

    console.log(`📋 Using admin user: ${adminUser.fullName} (${adminUser.username})\n`);

    // Check existing notices
    const existingCount = await Notice.countDocuments();
    console.log(`📋 Current notices in database: ${existingCount}\n`);

    if (existingCount >= 3) {
      console.log('✅ Database already has notices. Skipping seed.');
      console.log('   To re-seed, delete existing notices first.\n');
      return;
    }

    // Add postedBy to all notices
    const noticesWithUser = sampleNotices.map(notice => ({
      ...notice,
      postedBy: adminUser._id
    }));

    // Insert sample notices
    console.log('📝 Seeding notices...\n');
    const inserted = await Notice.insertMany(noticesWithUser);
    
    console.log(`✅ Successfully seeded ${inserted.length} notices:\n`);
    inserted.forEach((notice, idx) => {
      console.log(`${idx + 1}. [${notice.type.toUpperCase()}] ${notice.title}`);
      console.log(`   "${notice.body.substring(0, 60)}..."`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error seeding notices:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedNotices();
