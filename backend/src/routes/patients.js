const express = require('express');
const PatientFile = require('../models/PatientFile');
const { authenticateToken, requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { normalizePatientNumber, loadRanges, attachLocation } = require('../utils/storageMap');
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
    const ranges = await loadRanges();
    
    // Check if query is all digits - prioritize exact patient number match
    const normalized = normalizePatientNumber(q.trim());
    let patients = [];
    
    if (normalized) {
      // Try exact patient number match first
      const exactMatch = await PatientFile.findOne({ patientId: normalized });
      if (exactMatch && (includeArchived === 'true' || exactMatch.status !== 'archived')) {
        patients.push(exactMatch);
      }
      
      // Then add other matches
      const otherMatches = await PatientFile.searchFiles(q.trim());
      const otherFiltered = otherMatches
        .filter(p => p.patientId !== normalized && (includeArchived === 'true' || p.status !== 'archived'));
      patients = [...patients, ...otherFiltered];
    } else {
      // Non-digit search
      patients = await PatientFile.searchFiles(q.trim());
      if (includeArchived !== 'true') {
        patients = patients.filter(p => p.status !== 'archived');
      }
    }
    
    const searchTime = Date.now() - startTime;

    // Attach location display
    const patientsWithLocation = attachLocation(patients, ranges);

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
    const ranges = await loadRanges();

    // Attach location display
    const patientsWithLocation = attachLocation(patients, ranges);

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
    const normalized = normalizePatientNumber(req.params.id);
    if (!normalized) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Invalid patient number'
      });
    }

    const patient = await PatientFile.findOne({ patientId: normalized });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${normalized}`
      });
    }

    const ranges = await loadRanges();
    const patientWithLocation = attachLocation(patient, ranges);

    res.json(patientWithLocation);

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patient',
      message: 'Internal server error'
    });
  }
});

// POST /api/patients - Add new patient file (all roles - determines on first visit)
router.post('/', authenticateToken, requireAccessLevel('ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'), async (req, res) => {
  try {
    const { patientId, fullName, phoneNumber } = req.body;

    // Basic required field validation
    if (!patientId || !fullName) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Patient number and full name are required'
      });
    }

    // Normalize and validate patient ID
    const normalized = normalizePatientNumber(patientId);
    if (!normalized) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Patient number must be 1 to 8 digits'
      });
    }

    // Validate full name
    const trimmedFullName = fullName.trim();
    if (trimmedFullName.length < 2 || trimmedFullName.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Full name must be 2-100 characters long'
      });
    }

    // Validate phone number if provided (optional)
    let trimmedPhoneNumber = '';
    if (phoneNumber && phoneNumber.trim()) {
      trimmedPhoneNumber = phoneNumber.trim();
      if (!/^\+234\d{10}$/.test(trimmedPhoneNumber)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Phone number must be in format +234XXXXXXXXXX'
        });
      }
    }

    // Check if patient ID already exists
    const existingPatient = await PatientFile.findOne({ patientId: normalized });
    if (existingPatient) {
      return res.status(409).json({
        error: 'Patient ID already exists',
        message: `A patient with ID ${normalized} already exists`
      });
    }

    // Create new patient file
    const newPatient = new PatientFile({
      patientId: normalized,
      fullName: trimmedFullName,
      phoneNumber: trimmedPhoneNumber
    });

    await newPatient.save();

    // Load ranges and attach location
    const ranges = await loadRanges();
    const patientWithLocation = attachLocation(newPatient, ranges);

    // Log activity
    await logActivity({
      req,
      action: 'PATIENT_FILE_CREATED',
      targetType: 'PatientFile',
      targetId: newPatient._id,
      targetLabel: newPatient.fullName,
      details: { patientId: normalized }
    });

    res.status(201).json({
      message: 'Patient file created successfully',
      patient: patientWithLocation
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

// PUT /api/patients/:id/status - Update patient status with role-specific transition rules
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const normalized = normalizePatientNumber(req.params.id);
    if (!normalized) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Invalid patient number'
      });
    }

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
    const patient = await PatientFile.findOne({ patientId: normalized });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${normalized}`
      });
    }

    const currentStatus = patient.status || 'discharged'; // Treat missing status as discharged
    const requestedStatus = status;
    const userRole = req.user.accessLevel;

    // If no change, return success immediately
    if (currentStatus === requestedStatus) {
      const ranges = await loadRanges();
      const patientWithLocation = attachLocation(patient, ranges);
      return res.json({
        message: 'Patient status unchanged',
        patient: patientWithLocation
      });
    }

    // Guard: prevent archiving if visit is in progress
    if (requestedStatus === 'archived') {
      const Visit = require('../models/Visit');
      const openVisit = await Visit.findOne({ patient: patient._id, isOpen: true });
      if (openVisit) {
        return res.status(409).json({
          error: 'Visit in progress',
          message: 'This patient has a visit in progress. Finish it before archiving.'
        });
      }
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

    const ranges = await loadRanges();
    const patientWithLocation = attachLocation(patient, ranges);

    res.json({
      message: `Patient status updated to '${requestedStatus}' successfully`,
      patient: patientWithLocation
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Failed to update status',
      message: 'Internal server error'
    });
  }
});

// PUT /api/patients/:id - Update patient details (ADMINISTRATOR only)
router.put('/:id', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const normalized = normalizePatientNumber(req.params.id);
    if (!normalized) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Invalid patient number'
      });
    }

    const { fullName, phoneNumber, customFields } = req.body;
    
    const patient = await PatientFile.findOne({ patientId: normalized });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${normalized}`
      });
    }

    const changedFields = [];

    // Validate and update fullName
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({
          error: 'Invalid value',
          message: 'Full name must be 2-100 characters'
        });
      }
      if (patient.fullName !== fullName) {
        patient.fullName = fullName;
        changedFields.push('fullName');
      }
    }

    // Validate and update phoneNumber
    if (phoneNumber !== undefined) {
      const trimmed = phoneNumber.trim();
      if (trimmed && !/^\+234\d{10}$/.test(trimmed)) {
        return res.status(400).json({
          error: 'Invalid value',
          message: 'Phone number must be in format +234XXXXXXXXXX or empty'
        });
      }
      if (patient.phoneNumber !== trimmed) {
        patient.phoneNumber = trimmed;
        changedFields.push('phoneNumber');
      }
    }

    // Validate and update customFields
    if (customFields !== undefined) {
      if (!Array.isArray(customFields) || customFields.length > 20) {
        return res.status(400).json({
          error: 'Invalid value',
          message: 'Custom fields must be an array of at most 20 items'
        });
      }
      for (const field of customFields) {
        if (!field.fieldName || typeof field.fieldName !== 'string' || field.fieldName.length === 0 || field.fieldName.length > 60) {
          return res.status(400).json({
            error: 'Invalid value',
            message: 'Field name must be a non-empty string up to 60 characters'
          });
        }
        if (typeof field.fieldValue !== 'string' || field.fieldValue.length > 200) {
          return res.status(400).json({
            error: 'Invalid value',
            message: 'Field value must be a string up to 200 characters'
          });
        }
      }
      if (JSON.stringify(patient.customFields) !== JSON.stringify(customFields)) {
        patient.customFields = customFields;
        changedFields.push('customFields');
      }
    }

    // Only save and log if something actually changed
    if (changedFields.length > 0) {
      await patient.save();

      // Log activity
      await logActivity({
        req,
        action: 'PATIENT_DETAILS_UPDATED',
        targetType: 'PatientFile',
        targetId: patient._id,
        targetLabel: patient.fullName,
        details: { fields: changedFields }
      });
    }

    const ranges = await loadRanges();
    const patientWithLocation = attachLocation(patient, ranges);

    res.json({
      message: 'Patient updated successfully',
      patient: patientWithLocation
    });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      error: 'Failed to update patient',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/patients/:id - Delete patient file (ADMINISTRATOR only)
router.delete('/:id', authenticateToken, requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const normalized = normalizePatientNumber(req.params.id);
    if (!normalized) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Invalid patient number'
      });
    }

    const patient = await PatientFile.findOne({ patientId: normalized });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${normalized}`
      });
    }

    // Guard: prevent deletion if non-cancelled visit records exist
    const Visit = require('../models/Visit');
    const visitCount = await Visit.countDocuments({ patient: patient._id, stage: { $ne: 'cancelled' } });
    if (visitCount > 0) {
      return res.status(409).json({
        error: 'Patient has visit records',
        message: "This patient has visit records and can't be deleted. Archive the file instead."
      });
    }

    // Delete any cancelled visits for this patient
    await Visit.deleteMany({ patient: patient._id, stage: 'cancelled' });

    await PatientFile.findOneAndDelete({ patientId: normalized });

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
      details: { patientId: patient.patientId }
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