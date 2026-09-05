const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
require('dotenv').config({ path: '../.env' });

// Specific staff members with salaries as requested
const staffMembers = [
  {
    firstName: 'Chinaza',
    lastName: 'Okafor',
    otherNames: 'Blessing',
    role: 'NURSE',
    salary: 60000
  },
  {
    firstName: 'Okwuchi',
    lastName: 'Nwankwo', 
    otherNames: 'Grace',
    role: 'MIDWIFE',
    salary: 56000
  },
  {
    firstName: 'Vera',
    lastName: 'Adebayo',
    otherNames: 'Joy',
    role: 'DOCTOR',
    salary: 68500 // 68 1/2 thousand
  },
  {
    firstName: 'Gift',
    lastName: 'Eze',
    otherNames: 'Peace',
    role: 'DOCTOR',
    salary: 68000
  },
  {
    firstName: 'Ogechi',
    lastName: 'Okoro',
    otherNames: 'Faith',
    role: 'TRAINEE_NURSE',
    salary: 42000
  },
  {
    firstName: 'Oluchi',
    lastName: 'Chukwu',
    otherNames: 'Hope',
    role: 'NURSE',
    salary: 44000
  },
  {
    firstName: 'Victoria',
    lastName: 'Musa',
    otherNames: 'Love',
    role: 'TRAINEE_NURSE',
    salary: 42000
  },
  {
    firstName: 'Esther',
    lastName: 'Bello',
    otherNames: 'Mercy',
    role: 'MIDWIFE',
    salary: 54000
  },
  {
    firstName: 'Daniel',
    lastName: 'Ogbonna',
    otherNames: 'Wisdom',
    role: 'MAINTENANCE',
    salary: 35000
  }
];

const banks = [
  'First Bank of Nigeria',
  'Zenith Bank',
  'GTBank',
  'Access Bank',
  'UBA',
  'Stanbic IBTC',
  'Fidelity Bank',
  'Union Bank',
  'Sterling Bank',
  'FCMB'
];

// Generate phone number
const generatePhone = () => {
  const prefixes = ['0803', '0806', '0813', '0816', '0903', '0906', '0705', '0708'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${suffix}`;
};

// Generate email
const generateEmail = (firstName, lastName) => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
};

// Generate account number
const generateAccountNumber = () => {
  return Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit account number
};

// Generate schedule
const generateSchedule = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const shifts = [
    { startTime: '08:00', endTime: '16:00' },
    { startTime: '16:00', endTime: '00:00' },
    { startTime: '00:00', endTime: '08:00' }
  ];
  
  return days.map(day => ({
    day,
    ...shifts[Math.floor(Math.random() * shifts.length)]
  }));
};

// Generate staff member data
const generateStaffData = (staffMember) => {
  // Generate staffId manually
  const firstName = staffMember.firstName.toUpperCase().slice(0, 3);
  const lastName = staffMember.lastName.toUpperCase().slice(0, 3);
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const staffId = `STAFF-${firstName}${lastName}-${randomNum}`;
  
  // Assign shift (60% day shift, 40% night shift)
  const shift = Math.random() < 0.6 ? 'DAY' : 'NIGHT';
  
  return {
    ...staffMember,
    staffId,
    phoneNumber: generatePhone(),
    email: generateEmail(staffMember.firstName, staffMember.lastName),
    schedule: generateSchedule(),
    onDuty: Math.random() < 0.85, // 85% on duty
    shift,
    bankAccount: banks[Math.floor(Math.random() * banks.length)],
    accountNumber: generateAccountNumber().toString()
  };
};

// Main seeding function
async function seedStaff() {
  try {
    console.log('🌱 Starting staff seeding process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_operations');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing staff
    await Staff.deleteMany({});
    console.log('🧹 Cleared existing staff data');
    
    // Generate staff data for each member
    const staffData = staffMembers.map(member => generateStaffData(member));
    
    // Insert staff members
    const createdStaff = await Staff.insertMany(staffData);
    console.log(`✅ Created ${createdStaff.length} staff members`);
    
    // Print summary
    const summary = await Staff.aggregate([
      { $group: { 
        _id: '$role', 
        count: { $sum: 1 },
        avgSalary: { $avg: '$salary' },
        shifts: { $addToSet: '$shift' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Staff Summary by Role:');
    summary.forEach(role => {
      console.log(`  ${role._id}: ${role.count} staff (Avg salary: ₦${role.avgSalary.toLocaleString()}) - ${role.shifts.join(', ')} shifts`);
    });
    
    const totalOnDuty = await Staff.countDocuments({ onDuty: true });
    const totalOffDuty = await Staff.countDocuments({ onDuty: false });
    
    console.log(`\n👥 Total Staff: ${createdStaff.length}`);
    console.log(`✅ On Duty: ${totalOnDuty}`);
    console.log(`❌ Off Duty: ${totalOffDuty}`);
    
    // List all staff with their details
    console.log('\n👨‍⚕️ Staff Details:');
    const allStaff = await Staff.find({}).sort({ lastName: 1, firstName: 1 });
    allStaff.forEach(staff => {
      console.log(`  ${staff.fullName} (${staff.roleDisplay}) - ₦${staff.salary.toLocaleString()} - ${staff.bankAccount} (${staff.accountNumber})`);
    });
    
    console.log('\n🎉 Staff seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding staff:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedStaff()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedStaff };