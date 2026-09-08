const express = require('express');
const PatientFile = require('../models/PatientFile');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// GET /api/patients/search - Search patient files (all authenticated users)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, includeArchived } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json({
        patients: [],
        total: 0,
        message: 'Search query is required'
      });
    }

    const startTime = Date.now();
    let patients = await PatientFile.searchFiles(q.trim());
    
    // Filter out archived patients unless explicitly requested
    if (includeArchived !== 'true') {
      patients = patients.filter(p => p.status !== 'archived');
    }
    
    const searchTime = Date.now() - startTime;

    // Add locationDisplay virtual to each result
    const patientsWithLocation = patients.map(patient => ({
      ...patient.toObject(),
      locationDisplay: patient.locationDisplay
    }));

    res.json({
      patients: patientsWithLocation,
      total: patients.length,
      searchTime,
      query: q.trim()
    });

  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// GET /api/patients - Get all patients (all authenticated users, with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { includeArchived } = req.query;

    // Build query - exclude archived by default
    const query = includeArchived === 'true' ? {} : { status: { $ne: 'archived' } };

    const patients = await PatientFile.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PatientFile.countDocuments(query);

    const patientsWithLocation = patients.map(patient => ({
      ...patient.toObject(),
      locationDisplay: patient.locationDisplay
    }));

    res.json({
      patients: patientsWithLocation,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: patients.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patients',
      message: 'Internal server error'
    });
  }
});

// GET /api/patients/:id - Get specific patient (all authenticated users)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await PatientFile.findOne({ patientId: req.params.id });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    res.json({
      ...patient.toObject(),
      locationDisplay: patient.locationDisplay
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patient',
      message: 'Internal server error'
    });
  }
});

// POST /api/patients - Add new patient file (ADMINISTRATOR or RECORDS_OPERATOR)
router.post('/', authenticateToken, requireAccessLevel('ADMINISTRATOR', 'RECORDS_OPERATOR'), async (req, res) => {
  try {
    const { patientId, fullName, phoneNumber, cabinetNumber, shelfNumber, folderNumber } = req.body;

    // Basic required field validation
    if (!patientId || !fullName || !phoneNumber || !cabinetNumber || !shelfNumber || !folderNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Patient ID, full name, phone number, cabinet, shelf, and folder numbers are required'
      });
    }

    // Detailed validation
    const trimmedPatientId = patientId.trim();
    const trimmedFullName = fullName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    // Patient ID validation
    if (!/^\d{4,8}$/.test(trimmedPatientId)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Patient ID must be 4-8 digits'
      });
    }

    // Full Name validation
    if (trimmedFullName.length < 2 || trimmedFullName.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Full name must be 2-100 characters long'
      });
    }

    if (!/^[a-zA-Z\s'\-]+$/.test(trimmedFullName)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Full name can only contain letters, spaces, apostrophes, and hyphens'
      });
    }

    // Phone Number validation - must be +234XXXXXXXXXX format
    if (!/^\+234\d{10}$/.test(trimmedPhoneNumber)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Phone number must be in format +234XXXXXXXXXX (exactly 10 digits after +234)'
      });
    }

    // Location validation
    const cabinet = parseInt(cabinetNumber);
    const shelf = parseInt(shelfNumber);
    const folder = parseInt(folderNumber);

    if (cabinet < 1 || cabinet > 50) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cabinet number must be between 1 and 50'
      });
    }

    if (shelf < 1 || shelf > 20) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Shelf number must be between 1 and 20'
      });
    }

    if (folder < 1 || folder > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Folder number must be between 1 and 100'
      });
    }

    // Check if patient ID already exists
    const existingPatient = await PatientFile.findOne({ patientId: trimmedPatientId });
    if (existingPatient) {
      return res.status(409).json({
        error: 'Patient ID already exists',
        message: `A patient with ID ${trimmedPatientId} already exists`
      });
    }

    // Create new patient file
    const newPatient = new PatientFile({
      patientId: trimmedPatientId,
      fullName: trimmedFullName,
      phoneNumber: trimmedPhoneNumber,
      cabinetNumber: cabinet,
      shelfNumber: shelf,
      folderNumber: folder
    });

    await newPatient.save();

    res.status(201).json({
      message: 'Patient file created successfully',
      patient: {
        ...newPatient.toObject(),
        locationDisplay: `Cabinet ${newPatient.cabinetNumber} → Shelf ${newPatient.shelfNumber} → Folder ${newPatient.folderNumber}`
      }
    });

  } catch (error) {
    console.error('Create patient error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Patient ID already exists',
        message: 'This patient ID is already in use'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        message: messages.join('. ')
      });
    }

    res.status(500).json({
      error: 'Failed to create patient file',
      message: 'Internal server error'
    });
  }
});

// PUT /api/patients/:id/location - Update patient file location (ADMINISTRATOR or RECORDS_OPERATOR)
router.put('/:id/location', authenticateToken, requireAccessLevel('ADMINISTRATOR', 'RECORDS_OPERATOR'), async (req, res) => {
  try {
    const { cabinetNumber, shelfNumber, folderNumber, reason } = req.body;

    if (!cabinetNumber || !shelfNumber || !folderNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cabinet, shelf, and folder numbers are required'
      });
    }

    const patient = await PatientFile.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    // Store old location for activity log
    const oldLocation = patient.locationDisplay;

    // Update location with history tracking
    patient.updateLocation(
      parseInt(cabinetNumber),
      parseInt(shelfNumber),
      parseInt(folderNumber),
      reason || 'Location updated via API'
    );

    await patient.save();

    // Log activity
    await logActivity({
      req,
      action: 'PATIENT_FILE_LOCATION_UPDATED',
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName,
      details: { from: oldLocation, to: patient.locationDisplay }
    });

    res.json({
      message: 'Patient file location updated successfully',
      patient: {
        ...patient.toObject(),
        locationDisplay: patient.locationDisplay
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

// PUT /api/patients/:id/status - Update patient status with role-specific transition rules
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    const validStatuses = ['admitted', 'discharged', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find patient
    const patient = await PatientFile.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    const currentStatus = patient.status || 'discharged'; // Treat missing status as discharged
    const requestedStatus = status;
    const userRole = req.user.accessLevel;

    // If no change, return success immediately
    if (currentStatus === requestedStatus) {
      return res.json({
        message: 'Patient status unchanged',
        patient: {
          ...patient.toObject(),
          locationDisplay: patient.locationDisplay
        }
      });
    }

    // Define valid transitions and who can perform them
    const transitions = {
      'discharged->admitted': ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'],
      'admitted->discharged': ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'],
      'discharged->archived': ['ADMINISTRATOR', 'RECORDS_OPERATOR'],
      'archived->discharged': ['ADMINISTRATOR', 'RECORDS_OPERATOR']
    };

    const transitionKey = `${currentStatus}->${requestedStatus}`;
    const allowedRoles = transitions[transitionKey];

    // Check if transition is valid
    if (!allowedRoles) {
      return res.status(400).json({
        error: 'Invalid status transition',
        message: `Cannot change status from '${currentStatus}' to '${requestedStatus}'. You must change '${currentStatus}' to an intermediate status first.`
      });
    }

    // Check if user's role is allowed for this transition
    if (!allowedRoles.includes(userRole)) {
      const actionMessages = {
        'discharged->archived': 'archive patient files',
        'archived->discharged': 'reactivate archived patient files',
        'discharged->admitted': 'admit patients',
        'admitted->discharged': 'discharge patients'
      };
      
      return res.status(403).json({
        error: 'Permission denied',
        message: `You don't have permission to ${actionMessages[transitionKey] || 'perform this action'}.`
      });
    }

    // Perform the transition
    patient.status = requestedStatus;
    await patient.save();

    // Determine activity log action
    const activityActions = {
      'discharged->admitted': 'PATIENT_ADMITTED',
      'admitted->discharged': 'PATIENT_DISCHARGED',
      'discharged->archived': 'PATIENT_ARCHIVED',
      'archived->discharged': 'PATIENT_REACTIVATED'
    };

    // Log activity
    await logActivity({
      req,
      action: activityActions[transitionKey],
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName,
      details: { from: currentStatus, to: requestedStatus }
    });

    res.json({
      message: `Patient status updated to '${requestedStatus}' successfully`,
      patient: {
        ...patient.toObject(),
        locationDisplay: patient.locationDisplay
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Failed to update status',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/patients/:id - Delete patient file (ADMINISTRATOR only)
router.delete('/:id', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const patient = await PatientFile.findOneAndDelete({ patientId: req.params.id });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    res.json({
      message: 'Patient file deleted successfully',
      deletedPatient: {
        patientId: patient.patientId,
        fullName: patient.fullName
      }
    });

    // Log activity (after response sent - non-blocking)
    logActivity({
      req,
      action: 'PATIENT_FILE_DELETED',
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName,
      details: { patientId: patient.patientId, location: patient.locationDisplay }
    });

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      error: 'Failed to delete patient file',
      message: 'Internal server error'
    });
  }
});

module.exports = router;