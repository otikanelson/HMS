const express = require('express');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { serializeStaffForRequester } = require('../utils/serializeStaff');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// GET /api/staff/search - Search staff members (all authenticated users)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json({
        staff: [],
        total: 0,
        message: 'Search query is required'
      });
    }

    const startTime = Date.now();
    const staff = await Staff.searchStaff(q.trim());
    const searchTime = Date.now() - startTime;

    // Lookup User accounts for each staff member
    const staffIds = staff.map(s => s._id);
    const users = await User.find({ staffId: { $in: staffIds } }).select('staffId username accessLevel isActive mustChangePassword');
    
    // Create a map for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.staffId.toString(), {
        username: user.username,
        accessLevel: user.accessLevel,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword
      });
    });

    // Serialize staff data based on requester's access level
    const staffWithVirtuals = staff.map(member => {
      const userData = userMap.get(member._id.toString());
      const serialized = serializeStaffForRequester(member, req.user);
      
      return {
        ...serialized,
        // Login account information (Admin/Records Operator only)
        ...(req.user.accessLevel === 'ADMINISTRATOR' || req.user.accessLevel === 'RECORDS_OPERATOR' ? {
          loginAccount: userData ? {
            username: userData.username,
            accessLevel: userData.accessLevel,
            isActive: userData.isActive,
            mustChangePassword: userData.mustChangePassword,
            exists: true
          } : {
            exists: false
          }
        } : {})
      };
    });

    res.json({
      staff: staffWithVirtuals,
      total: staff.length,
      searchTime,
      query: q.trim()
    });

  } catch (error) {
    console.error('Staff search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// GET /api/staff - Get all staff (all authenticated users, with pagination and filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, status, shift } = req.query;

    // Build filter object
    const filter = {};
    if (role) filter.role = role.toUpperCase();
    
    // For on-duty/off-duty filtering, we'll filter after fetching based on today's schedule
    const needsScheduleFilter = status === 'on-duty' || status === 'off-duty';
    
    if (shift) filter.shift = shift.toUpperCase();

    let staff = await Staff.find(filter)
      .sort({ lastName: 1, firstName: 1 });

    let total = staff.length;

    // Filter by today's schedule if status filter is applied
    if (needsScheduleFilter) {
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = days[now.getDay()];
      const currentHour = now.getHours();
      
      // Determine current shift: day (7 AM - 4 PM) or night (4 PM - 7 AM)
      const currentShift = (currentHour >= 7 && currentHour < 16) ? 'day' : 'night';
      
      staff = staff.filter(member => {
        const todayShift = member.WeeklySchedule?.[today] || 'off';
        const isOnDuty = todayShift === currentShift;
        return status === 'on-duty' ? isOnDuty : !isOnDuty;
      });
      
      total = staff.length;
    }
    
    // Apply pagination
    staff = staff.slice(skip, skip + limit);

    // Lookup User accounts for each staff member
    const staffIds = staff.map(s => s._id);
    const users = await User.find({ staffId: { $in: staffIds } }).select('staffId username accessLevel isActive mustChangePassword');
    
    // Create a map for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.staffId.toString(), {
        username: user.username,
        accessLevel: user.accessLevel,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword
      });
    });

    // Serialize staff data based on requester's access level
    const staffWithVirtuals = staff.map(member => {
      const userData = userMap.get(member._id.toString());
      const serialized = serializeStaffForRequester(member, req.user);
      
      return {
        ...serialized,
        // Login account information (Admin/Records Operator only)
        ...(req.user.accessLevel === 'ADMINISTRATOR' || req.user.accessLevel === 'RECORDS_OPERATOR' ? {
          loginAccount: userData ? {
            username: userData.username,
            accessLevel: userData.accessLevel,
            isActive: userData.isActive,
            mustChangePassword: userData.mustChangePassword,
            exists: true
          } : {
            exists: false
          }
        } : {})
      };
    });

    res.json({
      staff: staffWithVirtuals,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: staff.length,
        totalRecords: total
      },
      filters: { role, status, shift }
    });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      error: 'Failed to retrieve staff',
      message: 'Internal server error'
    });
  }
});

// GET /api/staff/roles - Get all roles (all authenticated users)
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await Staff.distinct('role', { onDuty: true });
    res.json({ roles: roles.sort() });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      error: 'Failed to retrieve roles',
      message: 'Internal server error'
    });
  }
});

// GET /api/staff/schedule - Get Weekly schedule for all active staff (all authenticated users)
// NOTE: This MUST come before /:id route to avoid "schedule" being treated as an id parameter
router.get('/schedule', authenticateToken, async (req, res) => {
  try {
    const staff = await Staff.find({ onDuty: true })
      .select('staffId firstName lastName otherNames role WeeklySchedule')
      .sort({ role: 1, lastName: 1, firstName: 1 })
      .lean();

    // Map to lean format with computed fullName
    const scheduleData = staff.map(member => ({
      staffId: member.staffId,
      fullName: [member.firstName, member.otherNames, member.lastName]
        .filter(n => n && n.trim())
        .join(' '),
      role: member.role,
      WeeklySchedule: member.WeeklySchedule || {
        monday: 'off',
        tuesday: 'off',
        wednesday: 'off',
        thursday: 'off',
        friday: 'off',
        saturday: 'off',
        sunday: 'off'
      }
    }));

    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching staff schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch staff schedule',
      message: error.message
    });
  }
});

// PUT /api/staff/:id/schedule - Update Weekly schedule for a staff member (ADMINISTRATOR only)
// NOTE: This must come before general /:id route but after /schedule route
router.put('/:id/schedule', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { WeeklySchedule } = req.body;

    if (!WeeklySchedule || typeof WeeklySchedule !== 'object') {
      return res.status(400).json({
        error: 'Invalid Weekly schedule',
        message: 'WeeklySchedule object is required'
      });
    }

    // Validate all days
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validShifts = ['day', 'night', 'off'];

    for (const day of days) {
      if (!WeeklySchedule.hasOwnProperty(day)) {
        return res.status(400).json({
          error: 'Invalid Weekly schedule',
          message: `Missing schedule for ${day}`
        });
      }

      if (!validShifts.includes(WeeklySchedule[day])) {
        return res.status(400).json({
          error: 'Invalid shift value',
          message: `Invalid shift value "${WeeklySchedule[day]}" for ${day}. Must be one of: ${validShifts.join(', ')}`
        });
      }
    }

    // Find staff member
    let staff;
    const id = req.params.id;
    
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      staff = await Staff.findById(id);
    } else {
      staff = await Staff.findOne({ staffId: id });
    }

    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${id}`
      });
    }

    // Update Weekly schedule
    staff.WeeklySchedule = WeeklySchedule;
    await staff.save();

    // Log activity
    await logActivity({
      actorId: req.user.userId,
      actorAccessLevel: req.user.accessLevel,
      action: 'STAFF_SCHEDULE_UPDATED',
      targetType: 'Staff',
      targetId: staff._id,
      targetLabel: staff.fullName
    });

    res.json({
      message: 'Weekly schedule updated successfully',
      staff: {
        staffId: staff.staffId,
        fullName: staff.fullName,
        WeeklySchedule: staff.WeeklySchedule
      }
    });
  } catch (error) {
    console.error('Error updating staff schedule:', error);
    res.status(500).json({
      error: 'Failed to update schedule',
      message: error.message
    });
  }
});

// GET /api/staff/:id - Get specific staff member (all authenticated users)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let staff;
    const id = req.params.id;
    
    // Check if it's a MongoDB ObjectId or staffId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      staff = await Staff.findById(id);
    } else {
      // It's a staffId
      staff = await Staff.findOne({ staffId: id });
    }
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    // Lookup User account for this staff member
    const user = await User.findOne({ staffId: staff._id }).select('username accessLevel isActive mustChangePassword');

    // Serialize staff data based on requester's access level
    const serialized = serializeStaffForRequester(staff, req.user);

    res.json({
      ...serialized,
      // Login account information (Admin/Records Operator only)
      ...(req.user.accessLevel === 'ADMINISTRATOR' || req.user.accessLevel === 'RECORDS_OPERATOR' ? {
        loginAccount: user ? {
          username: user.username,
          accessLevel: user.accessLevel,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          exists: true
        } : {
          exists: false
        }
      } : {})
    });

  } catch (error) {
    console.error('Get staff member error:', error);
    res.status(500).json({
      error: 'Failed to retrieve staff member',
      message: 'Internal server error'
    });
  }
});

// POST /api/staff - Add new staff member (ADMINISTRATOR only)
router.post('/', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      otherNames,
      role, 
      phoneNumber,
      email,
      schedule,
      shift,
      salary,
      bankAccount,
      accountNumber,
      accessLevel
    } = req.body;

    // Validation
    if (!firstName || !lastName || !role) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'First name, last name, and role are required'
      });
    }

    // Create new staff member
    const newStaff = new Staff({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      otherNames: otherNames?.trim(),
      role: role.toUpperCase(),
      phoneNumber: phoneNumber?.trim(),
      email: email?.trim(),
      schedule: schedule || [],
      shift: shift?.toUpperCase() || 'DAY',
      salary: salary ? parseFloat(salary) : undefined,
      bankAccount: bankAccount?.trim(),
      accountNumber: accountNumber?.trim()
    });

    await newStaff.save();

    // Log activity
    await logActivity({
      req,
      action: 'STAFF_CREATED',
      targetType: 'Staff',
      targetId: newStaff._id,
      targetLabel: newStaff.fullName,
      details: { role: newStaff.role, weeklySchedule: newStaff.weeklySchedule }
    });

    // Auto-provision user account for the new staff member
    let userCredentials = null;
    try {
      // Use staffId as username (it's unique and can be given verbally)
      const username = newStaff.staffId;
      
      // Generate random temporary password (12 characters, alphanumeric)
      const tempPassword = Array.from({ length: 12 }, () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        return chars.charAt(Math.floor(Math.random() * chars.length));
      }).join('');
      
      // Determine access level (default to CLINICAL_STAFF if not provided)
      const userAccessLevel = accessLevel || 'CLINICAL_STAFF';
      
      // Validate access level
      if (!['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'].includes(userAccessLevel)) {
        throw new Error('Invalid access level');
      }
      
      // Create User document (let the model's pre-save hook hash the password)
      const fullName = [newStaff.firstName, newStaff.otherNames, newStaff.lastName]
        .filter(name => name && name.trim())
        .join(' ');
      
      const newUser = new User({
        username: username,
        password: tempPassword, // Store plaintext - the pre-save hook will hash it
        fullName: fullName,
        accessLevel: userAccessLevel,
        staffId: newStaff._id,
        mustChangePassword: true,
        isActive: true
      });
      
      await newUser.save();
      
      // Store credentials to return (ONLY TIME we return the plaintext password)
      userCredentials = {
        username: username,
        temporaryPassword: tempPassword,
        accessLevel: userAccessLevel
      };
      
    } catch (userError) {
      console.error('Failed to create user account for staff:', userError);
      console.error('Error details:', {
        message: userError.message,
        stack: userError.stack,
        name: userError.name
      });
      // Don't fail the staff creation if user creation fails
      // But log it prominently
      userCredentials = {
        error: 'Failed to create login account. Please create manually.',
        details: userError.message
      };
    }

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: {
        ...newStaff.toObject(),
        fullName: newStaff.fullName,
        roleDisplay: newStaff.roleDisplay,
        statusDisplay: newStaff.statusDisplay,
        shiftDisplay: newStaff.shiftDisplay
      },
      loginCredentials: userCredentials
    });

  } catch (error) {
    console.error('Create staff member error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Staff ID already exists',
        message: 'This staff ID is already in use'
      });
    }

    res.status(500).json({
      error: 'Failed to create staff member',
      message: error.message || 'Internal server error'
    });
  }
});

// PUT /api/staff/:id - Update staff member (ADMINISTRATOR only)
router.put('/:id', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const staff = await Staff.findOne({ staffId: req.params.id });
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    // Track if onDuty status is being changed to false
    const wasOnDuty = staff.onDuty;
    const willBeOffDuty = req.body.onDuty === false;

    // Update fields
    const updateFields = [
      'firstName', 'lastName', 'otherNames', 'role', 'phoneNumber', 
      'email', 'schedule', 'onDuty', 'shift',
      'salary', 'bankAccount', 'accountNumber'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'role') {
          staff[field] = req.body[field].toUpperCase();
        } else {
          staff[field] = req.body[field];
        }
      }
    });

    await staff.save();

    // If staff is being deactivated, deactivate their user account and revoke sessions
    if (wasOnDuty && willBeOffDuty) {
      try {
        const Session = require('../models/Session');
        
        // Find and deactivate the linked user account
        const user = await User.findOne({ staffId: staff._id });
        if (user) {
          user.isActive = false;
          await user.save();
          
          // Revoke all active sessions for this user
          await Session.updateMany(
            { userId: user._id, isActive: true },
            { isActive: false }
          );
          
          console.log(`Deactivated user account and sessions for staff: ${staff.staffId}`);
        }

        // Log deactivation activity
        await logActivity({
          req,
          action: 'STAFF_DEACTIVATED',
          targetType: 'Staff',
          targetId: staff._id,
          targetLabel: staff.fullName,
          details: { staffId: staff.staffId }
        });
      } catch (deactivationError) {
        console.error('Failed to deactivate user account:', deactivationError);
        // Don't fail the staff update if user deactivation fails
      }
    }

    res.json({
      message: 'Staff member updated successfully',
      staff: {
        ...staff.toObject(),
        fullName: staff.fullName,
        roleDisplay: staff.roleDisplay,
        statusDisplay: staff.statusDisplay,
        shiftDisplay: staff.shiftDisplay
      }
    });

  } catch (error) {
    console.error('Update staff member error:', error);
    res.status(500).json({
      error: 'Failed to update staff member',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/staff/:id - Set staff member off duty (ADMINISTRATOR only, soft delete)
router.delete('/:id', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    let staff;
    const id = req.params.id;
    
    // Check if it's a MongoDB ObjectId or staffId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      staff = await Staff.findById(id);
    } else {
      staff = await Staff.findOne({ staffId: id });
    }
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    // Soft delete by setting onDuty to false
    staff.onDuty = false;
    await staff.save();

    // Deactivate the linked user account and revoke all sessions
    try {
      const Session = require('../models/Session');
      
      const user = await User.findOne({ staffId: staff._id });
      if (user) {
        user.isActive = false;
        await user.save();
        
        // Revoke all active sessions for this user
        await Session.updateMany(
          { userId: user._id, isActive: true },
          { isActive: false }
        );
        
        console.log(`Deactivated user account and sessions for staff: ${staff.staffId}`);
      }
    } catch (deactivationError) {
      console.error('Failed to deactivate user account:', deactivationError);
      // Don't fail the staff deletion if user deactivation fails
    }

    res.json({
      message: 'Staff member set to off duty successfully',
      modifiedStaff: {
        staffId: staff.staffId,
        fullName: staff.fullName,
        status: 'Off Duty'
      }
    });

  } catch (error) {
    console.error('Set staff member off duty error:', error);
    res.status(500).json({
      error: 'Failed to set staff member off duty',
      message: 'Internal server error'
    });
  }
});

module.exports = router;