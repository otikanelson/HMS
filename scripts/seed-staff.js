const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
require('dotenv').config();

// Names for seeding
const names = {
  male: {
    first: ['Adebayo', 'Chukwuma', 'Ibrahim', 'Emeka', 'Olumide', 'Kemi', 'Tunde', 'Segun', 'Femi', 'Yemi', 'Kunle', 'Wale', 'Dele', 'Gbenga', 'Lanre', 'Dayo', 'Biodun', 'Kayode', 'Rotimi', 'Ayo'],
    last: ['Adebayo', 'Okafor', 'Ibrahim', 'Eze', 'Adeyemi', 'Okonkwo', 'Bello', 'Okoro', 'Adesanya', 'Nwankwo', 'Aliyu', 'Chukwu', 'Adeleke', 'Onuoha', 'Musa', 'Ogbonna', 'Adamu', 'Nwosu', 'Hassan', 'Okeke']
  },
  female: {
    first: ['Adunni', 'Chioma', 'Aisha', 'Ngozi', 'Folake', 'Amina', 'Blessing', 'Grace', 'Joy', 'Peace', 'Funmi', 'Kemi', 'Bukola', 'Tolani', 'Yetunde', 'Ronke', 'Bisi', 'Dupe', 'Sola', 'Tola'],
    last: ['Adebayo', 'Okafor', 'Ibrahim', 'Eze', 'Adeyemi', 'Okonkwo', 'Bello', 'Okoro', 'Adesanya', 'Nwankwo', 'Aliyu', 'Chukwu', 'Adeleke', 'Onuoha', 'Musa', 'Ogbonna', 'Adamu', 'Nwosu', 'Hassan', 'Okeke']
  }
};

const roles = ['DOCTOR', 'NURSE', 'TRAINEE_NURSE', 'MIDWIFE', 'MAINTENANCE'];

const locations = [
  { building: 'Main Hospital', floor: 1, room: 'Emergency Ward' },
  { building: 'Main Hospital', floor: 1, room: 'Reception' },
  { building: 'Main Hospital', floor: 2, room: 'General Ward A' },
  { building: 'Main Hospital', floor: 2, room: 'General Ward B' },
  { building: 'Main Hospital', floor: 3, room: 'Maternity Ward' },
  { building: 'Main Hospital', floor: 3, room: 'Labor Room 1' },
  { building: 'Main Hospital', floor: 3, room: 'Labor Room 2' },
  { building: 'Main Hospital', floor: 4, room: 'Surgery Suite' },
  { building: 'Main Hospital', floor: 4, room: 'Recovery Room' },
  { building: 'Outpatient Building', floor: 1, room: 'Consultation Room 1' },
  { building: 'Outpatient Building', floor: 1, room: 'Consultation Room 2' },
  { building: 'Outpatient Building', floor: 1, room: 'Pharmacy' },
  { building: 'Main Hospital', floor: 1, room: 'Maintenance Workshop' },
  { building: 'Main Hospital', floor: 5, room: 'Staff Room' },
  { building: 'Main Hospital', floor: 1, room: 'Laboratory' }
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

// Generate salary based on role
const generateSalary = (role) => {
  const salaryRanges = {
    'DOCTOR': { min: 300000, max: 600000 },
    'NURSE': { min: 150000, max: 280000 },
    'TRAINEE_NURSE': { min: 80000, max: 150000 },
    'MIDWIFE': { min: 180000, max: 320000 },
    'MAINTENANCE': { min: 90000, max: 180000 }
  };
  
  const range = salaryRanges[role];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

// Generate staff member
const generateStaffMember = (index) => {
  const isGenderMale = Math.random() < 0.5;
  const gender = isGenderMale ? 'male' : 'female';
  
  const firstName = names[gender].first[Math.floor(Math.random() * names[gender].first.length)];
  const lastName = names[gender].last[Math.floor(Math.random() * names[gender].last.length)];
  
  const role = roles[Math.floor(Math.random() * roles.length)];
  
  const employeeId = `EMP${(index + 1).toString().padStart(3, '0')}`;
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  // Generate hire date within the last 5 years
  const hireDate = new Date();
  hireDate.setFullYear(hireDate.getFullYear() - Math.floor(Math.random() * 5));
  hireDate.setMonth(Math.floor(Math.random() * 12));
  hireDate.setDate(Math.floor(Math.random() * 28) + 1);
  
  // Assign shift (60% day shift, 40% night shift)
  const shift = Math.random() < 0.6 ? 'DAY' : 'NIGHT';
  
  return {
    staffId: `STAFF-${employeeId}`,
    employeeId,
    firstName,
    lastName,
    role,
    phoneNumber: generatePhone(),
    email: generateEmail(firstName, lastName),
    address: `${Math.floor(Math.random() * 999) + 1} ${['Ikoyi', 'Victoria Island', 'Lekki', 'Surulere', 'Ikeja', 'Yaba', 'Ajah', 'Magodo'][Math.floor(Math.random() * 8)]}, Lagos State`,
    schedule: generateSchedule(),
    location,
    onDuty: Math.random() < 0.85, // 85% on duty
    shift,
    hireDate,
    salary: generateSalary(role),
    emergencyContact: {
      name: `${names[gender].first[Math.floor(Math.random() * names[gender].first.length)]} ${names[gender].last[Math.floor(Math.random() * names[gender].last.length)]}`,
      relationship: ['Spouse', 'Parent', 'Sibling', 'Child'][Math.floor(Math.random() * 4)],
      phoneNumber: generatePhone()
    }
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
    
    // Generate staff members
    const staffMembers = [];
    for (let i = 0; i < 40; i++) {
      staffMembers.push(generateStaffMember(i));
    }
    
    // Insert staff members
    const createdStaff = await Staff.insertMany(staffMembers);
    console.log(`✅ Created ${createdStaff.length} staff members`);
    
    // Assign supervisors (doctors and senior nurses supervise others)
    const supervisors = createdStaff.filter(staff => 
      ['DOCTOR', 'NURSE'].includes(staff.role)
    );
    
    const updatePromises = [];
    for (const staff of createdStaff) {
      if (staff.role === 'TRAINEE_NURSE' || (staff.role === 'MAINTENANCE' && Math.random() < 0.5)) {
        // Trainee nurses always have supervisors, maintenance staff sometimes do
        const supervisor = supervisors[Math.floor(Math.random() * supervisors.length)];
        if (supervisor && supervisor.staffId !== staff.staffId) {
          updatePromises.push(
            Staff.findByIdAndUpdate(staff._id, { supervisorId: supervisor.staffId })
          );
        }
      }
    }
    
    await Promise.all(updatePromises);
    console.log('✅ Assigned supervisors to staff members');
    
    // Print summary
    const summary = await Staff.aggregate([
      { $group: { 
        _id: '$role', 
        count: { $sum: 1 },
        shifts: { $addToSet: '$shift' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Staff Summary by Role:');
    summary.forEach(role => {
      console.log(`  ${role._id}: ${role.count} staff (${role.shifts.join(', ')} shifts)`);
    });
    
    const totalOnDuty = await Staff.countDocuments({ onDuty: true });
    const totalOffDuty = await Staff.countDocuments({ onDuty: false });
    
    console.log(`\n👥 Total Staff: ${createdStaff.length}`);
    console.log(`✅ On Duty: ${totalOnDuty}`);
    console.log(`❌ Off Duty: ${totalOffDuty}`);
    
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