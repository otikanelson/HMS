const express = require('express');
const Staff = require('../models/Staff');
const router = express.Router();

// GET /api/staff/search - Search staff members
router.get('/search', async (req, res) => {
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

    // Add virtual fields to each result
    const staffWithVirtuals = await Promise.all(staff.map(async (member) => {
      let supervisor = null;
      if (member.supervisorId) {
        supervisor = await Staff.findOne({ staffId: member.supervisorId }, 'firstName lastName employeeId');
      }
      
      return {
        ...member.toObject(),
        fullName: member.fullName,
        locationDisplay: member.locationDisplay,
        roleDisplay: member.roleDisplay,
        statusDisplay: member.statusDisplay,
        shiftDisplay: member.shiftDisplay,
        supervisor
      };
    }));

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

// GET /api/staff - Get all staff (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, status, shift } = req.query;

    // Build filter object
    const filter = {};
    if (role) filter.role = role.toUpperCase();
    if (status === 'on-duty') filter.onDuty = true;
    if (status === 'off-duty') filter.onDuty = false;
    if (shift) filter.shift = shift.toUpperCase();

    const staff = await Staff.find(filter)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Staff.countDocuments(filter);

    const staffWithVirtuals = await Promise.all(staff.map(async (member) => {
      let supervisor = null;
      if (member.supervisorId) {
        supervisor = await Staff.findOne({ staffId: member.supervisorId }, 'firstName lastName employeeId');
      }
      
      return {
        ...member.toObject(),
        fullName: member.fullName,
        locationDisplay: member.locationDisplay,
        roleDisplay: member.roleDisplay,
        statusDisplay: member.statusDisplay,
        shiftDisplay: member.shiftDisplay,
        supervisor
      };
    }));

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

// GET /api/staff/roles - Get all roles
router.get('/roles', async (req, res) => {
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

// GET /api/staff/:id - Get specific staff member
router.get('/:id', async (req, res) => {
  try {
    let staff;
    const id = req.params.id;
    
    // Check if it's a MongoDB ObjectId or staffId/employeeId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a MongoDB ObjectId
      staff = await Staff.findById(id);
    } else {
      // It's a staffId or employeeId
      staff = await Staff.findOne({ 
        $or: [
          { staffId: id },
          { employeeId: id }
        ]
      });
    }
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    let supervisor = null;
    if (staff.supervisorId) {
      supervisor = await Staff.findOne({ staffId: staff.supervisorId }, 'firstName lastName employeeId');
    }

    res.json({
      ...staff.toObject(),
      fullName: staff.fullName,
      locationDisplay: staff.locationDisplay,
      roleDisplay: staff.roleDisplay,
      statusDisplay: staff.statusDisplay,
      shiftDisplay: staff.shiftDisplay,
      supervisor
    });

  } catch (error) {
    console.error('Get staff member error:', error);
    res.status(500).json({
      error: 'Failed to retrieve staff member',
      message: 'Internal server error'
    });
  }
});

// POST /api/staff - Add new staff member
router.post('/', async (req, res) => {
  try {
    const { 
      employeeId, 
      firstName, 
      lastName, 
      role, 
      phoneNumber,
      email,
      address,
      schedule,
      location,
      supervisorId,
      shift,
      hireDate,
      salary,
      emergencyContact
    } = req.body;

    // Validation
    if (!employeeId || !firstName || !lastName || !role) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Employee ID, first name, last name, and role are required'
      });
    }

    // Check if employee ID already exists
    const existingStaff = await Staff.findOne({ employeeId: employeeId.trim() });
    if (existingStaff) {
      return res.status(409).json({
        error: 'Employee ID already exists',
        message: `A staff member with Employee ID ${employeeId.trim()} already exists`
      });
    }

    // Create new staff member
    const newStaff = new Staff({
      employeeId: employeeId.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role.toUpperCase(),
      phoneNumber: phoneNumber?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      schedule: schedule || [],
      location: location || {},
      supervisorId: supervisorId?.trim(),
      shift: shift?.toUpperCase() || 'DAY',
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      salary: salary ? parseFloat(salary) : undefined,
      emergencyContact
    });

    await newStaff.save();

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: {
        ...newStaff.toObject(),
        fullName: newStaff.fullName,
        locationDisplay: newStaff.locationDisplay,
        roleDisplay: newStaff.roleDisplay,
        statusDisplay: newStaff.statusDisplay,
        shiftDisplay: newStaff.shiftDisplay
      }
    });

  } catch (error) {
    console.error('Create staff member error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Employee ID already exists',
        message: 'This employee ID is already in use'
      });
    }

    res.status(500).json({
      error: 'Failed to create staff member',
      message: 'Internal server error'
    });
  }
});

// PUT /api/staff/:id - Update staff member
router.put('/:id', async (req, res) => {
  try {
    const staff = await Staff.findOne({ 
      $or: [
        { staffId: req.params.id },
        { employeeId: req.params.id }
      ]
    });
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    // Update fields
    const updateFields = [
      'firstName', 'lastName', 'role', 'phoneNumber', 
      'email', 'address', 'schedule', 'supervisorId', 'onDuty', 'shift',
      'salary', 'emergencyContact'
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

    res.json({
      message: 'Staff member updated successfully',
      staff: {
        ...staff.toObject(),
        fullName: staff.fullName,
        locationDisplay: staff.locationDisplay,
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

// PUT /api/staff/:id/location - Update staff member location
router.put('/:id/location', async (req, res) => {
  try {
    const { building, floor, room, reason } = req.body;

    if (!building && !floor && !room) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'At least one location field (building, floor, room) is required'
      });
    }

    const staff = await Staff.findOne({ 
      $or: [
        { staffId: req.params.id },
        { employeeId: req.params.id }
      ]
    });
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: `No staff member found with ID: ${req.params.id}`
      });
    }

    // Update location with history tracking
    staff.updateLocation(
      building,
      floor ? parseInt(floor) : undefined,
      room,
      reason || 'Location updated via API'
    );

    await staff.save();

    res.json({
      message: 'Staff member location updated successfully',
      staff: {
        ...staff.toObject(),
        fullName: staff.fullName,
        locationDisplay: staff.locationDisplay,
        roleDisplay: staff.roleDisplay,
        statusDisplay: staff.statusDisplay,
        shiftDisplay: staff.shiftDisplay
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      error: 'Failed to update location',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/staff/:id - Set staff member off duty (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    let staff;
    const id = req.params.id;
    
    // Check if it's a MongoDB ObjectId or staffId/employeeId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      staff = await Staff.findById(id);
    } else {
      staff = await Staff.findOne({ 
        $or: [
          { staffId: id },
          { employeeId: id }
        ]
      });
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

    res.json({
      message: 'Staff member set to off duty successfully',
      modifiedStaff: {
        staffId: staff.staffId,
        employeeId: staff.employeeId,
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