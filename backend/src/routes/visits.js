const express = require('express');
const Visit = require('../models/Visit');
const PatientFile = require('../models/PatientFile');
const User = require('../models/User');
const { requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// Role constants
const CAN_HANDLE_FILES = ['ADMINISTRATOR', 'RECORDS_OPERATOR'];
const CAN_VIEW_AND_ADD = ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'];
const CAN_CORRECT = ['ADMINISTRATOR'];

// Helper: Get start of today in Lagos time (UTC+1)
function startOfTodayLagos() {
  const OFFSET = 60 * 60 * 1000; // Lagos is UTC+1, no DST
  const d = new Date(Date.now() + OFFSET);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - OFFSET);
}

// Helper: Validate ObjectId
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// POST /api/visits/checkout - Check out a file
router.post('/checkout', requireAccessLevel(...CAN_HANDLE_FILES), async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId || !patientId.trim()) {
      return res.status(400).json({
        error: 'Patient number is required',
        message: 'Please enter a patient number'
      });
    }

    // Look up patient
    const patient = await PatientFile.findOne({ patientId: patientId.trim() });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'No patient with that number'
      });
    }

    // Check if archived
    if (patient.status === 'archived') {
      return res.status(400).json({
        error: 'File is archived',
        message: 'This file is archived. Reactivate it first.'
      });
    }

    // Check for existing open visit
    const existingVisit = await Visit.findOne({ patient: patient._id, fileStatus: 'out' })
      .populate('checkedOutBy', 'fullName');

    if (existingVisit) {
      const takenBy = existingVisit.checkedOutBy?.fullName || 'Unknown';
      const takenAt = existingVisit.checkedOutAt.toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return res.status(409).json({
        error: 'File already out',
        message: `This file is already out. Taken by ${takenBy} at ${takenAt}.`,
        visitId: existingVisit._id
      });
    }

    // Create new visit
    const visit = new Visit({
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.fullName,
      fileLocation: patient.locationDisplay,
      checkedOutBy: req.user.userId,
      checkedOutAt: new Date()
    });

    try {
      await visit.save();
    } catch (saveError) {
      // Handle race condition with partial unique index
      if (saveError.code === 11000) {
        const conflictVisit = await Visit.findOne({ patient: patient._id, fileStatus: 'out' })
          .populate('checkedOutBy', 'fullName');
        
        if (conflictVisit) {
          const takenBy = conflictVisit.checkedOutBy?.fullName || 'Unknown';
          const takenAt = conflictVisit.checkedOutAt.toLocaleString('en-US', {
            timeZone: 'Africa/Lagos',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          return res.status(409).json({
            error: 'File already out',
            message: `This file is already out. Taken by ${takenBy} at ${takenAt}.`,
            visitId: conflictVisit._id
          });
        }
      }
      throw saveError;
    }

    // Log activity
    await logActivity({
      req,
      action: 'FILE_CHECKED_OUT',
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName
    });

    res.status(201).json({
      message: `File taken out for ${patient.fullName}`,
      visit: visit.toObject()
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      error: 'Checkout failed',
      message: 'Internal server error'
    });
  }
});

// PUT /api/visits/:id/return - Mark file as returned
router.put('/:id/return', requireAccessLevel(...CAN_HANDLE_FILES), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id).populate('patient');

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (visit.fileStatus !== 'out') {
      return res.status(409).json({
        error: 'Already returned',
        message: 'This file was already marked as returned.'
      });
    }

    visit.fileStatus = 'returned';
    visit.returnedBy = req.user.userId;
    visit.returnedAt = new Date();

    await visit.save();

    // Log activity
    await logActivity({
      req,
      action: 'FILE_RETURNED',
      targetType: 'PatientFile',
      targetId: visit.patient._id,
      targetLabel: visit.patientName
    });

    res.json({
      message: 'File marked as returned',
      visit: visit.toObject()
    });

  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({
      error: 'Return failed',
      message: 'Internal server error'
    });
  }
});

// PUT /api/visits/:id/details - Save visit details
router.put('/:id/details', requireAccessLevel(...CAN_VIEW_AND_ADD), async (req, res) => {
  try {
    const { id } = req.params;
    const { vitals, tests, medications, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    // Validate vitals
    if (vitals) {
      const { systolic, diastolic, heartRate } = vitals;

      // Both systolic and diastolic must be provided together or both empty
      const hasSystolic = systolic !== undefined && systolic !== null && systolic !== '';
      const hasDiastolic = diastolic !== undefined && diastolic !== null && diastolic !== '';

      if (hasSystolic !== hasDiastolic) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Please enter both top and bottom blood pressure numbers'
        });
      }

      if (hasSystolic && hasDiastolic) {
        const sys = Number(systolic);
        const dia = Number(diastolic);

        if (!Number.isInteger(sys) || sys < 50 || sys > 260) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Top blood pressure number must be between 50 and 260'
          });
        }

        if (!Number.isInteger(dia) || dia < 30 || dia > 160) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Bottom blood pressure number must be between 30 and 160'
          });
        }

        if (sys <= dia) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Top blood pressure number must be greater than bottom number'
          });
        }
      }

      if (heartRate !== undefined && heartRate !== null && heartRate !== '') {
        const hr = Number(heartRate);
        if (!Number.isInteger(hr) || hr < 20 || hr > 250) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Heart rate must be between 20 and 250'
          });
        }
      }
    }

    // Validate and clean tests
    let cleanedTests = [];
    if (tests && Array.isArray(tests)) {
      cleanedTests = tests
        .map(t => ({
          name: (t.name || '').trim(),
          result: (t.result || '').trim()
        }))
        .filter(t => t.name.length > 0);

      if (cleanedTests.length > 20) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Maximum 20 tests allowed'
        });
      }

      for (const test of cleanedTests) {
        if (!test.name) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Each test must have a name'
          });
        }
      }
    }

    // Validate and clean medications
    let cleanedMeds = [];
    if (medications && Array.isArray(medications)) {
      cleanedMeds = medications
        .map(m => ({
          name: (m.name || '').trim(),
          dose: (m.dose || '').trim(),
          frequency: (m.frequency || '').trim(),
          duration: (m.duration || '').trim()
        }))
        .filter(m => m.name.length > 0);

      if (cleanedMeds.length > 20) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Maximum 20 medications allowed'
        });
      }

      for (const med of cleanedMeds) {
        if (!med.name) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Each medication must have a name'
          });
        }
      }
    }

    // Clean notes
    const cleanedNotes = notes ? notes.trim() : '';

    // At least one field must be filled
    const hasVitals = vitals && (
      (vitals.systolic !== undefined && vitals.systolic !== null && vitals.systolic !== '') ||
      (vitals.heartRate !== undefined && vitals.heartRate !== null && vitals.heartRate !== '')
    );
    const hasTests = cleanedTests.length > 0;
    const hasMeds = cleanedMeds.length > 0;
    const hasNotes = cleanedNotes.length > 0;

    if (!hasVitals && !hasTests && !hasMeds && !hasNotes) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please enter at least one piece of information'
      });
    }

    // Build update object
    const updateData = {
      notes: cleanedNotes,
      tests: cleanedTests,
      medications: cleanedMeds
    };

    if (vitals) {
      const { systolic, diastolic, heartRate } = vitals;
      updateData.vitals = {};

      if (systolic !== undefined && systolic !== null && systolic !== '') {
        updateData.vitals.systolic = Number(systolic);
      }
      if (diastolic !== undefined && diastolic !== null && diastolic !== '') {
        updateData.vitals.diastolic = Number(diastolic);
      }
      if (heartRate !== undefined && heartRate !== null && heartRate !== '') {
        updateData.vitals.heartRate = Number(heartRate);
      }
    }

    // Find and check current status
    const currentVisit = await Visit.findById(id);

    if (!currentVisit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (currentVisit.documentationStatus === 'pending') {
      // First documentation - CAN_VIEW_AND_ADD allowed
      updateData.documentationStatus = 'done';
      updateData.documentedBy = req.user.userId;
      updateData.documentedAt = new Date();

      const updatedVisit = await Visit.findOneAndUpdate(
        { _id: id, documentationStatus: 'pending' },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedVisit) {
        // Race condition - someone else just documented
        const recheckVisit = await Visit.findById(id);
        if (recheckVisit && recheckVisit.documentationStatus === 'done') {
          return res.status(409).json({
            error: 'Already documented',
            message: 'Someone just saved these details. Open the record to see them.'
          });
        }
        // Other error
        return res.status(500).json({
          error: 'Update failed',
          message: 'Failed to save details'
        });
      }

      // Log activity
      await logActivity({
        req,
        action: 'VISIT_DOCUMENTED',
        targetType: 'PatientFile',
        targetId: updatedVisit.patient,
        targetLabel: updatedVisit.patientName
      });

      return res.json({
        message: 'Visit details saved',
        visit: updatedVisit.toObject()
      });

    } else if (currentVisit.documentationStatus === 'done') {
      // Correction - only CAN_CORRECT allowed
      if (!CAN_CORRECT.includes(req.user.accessLevel)) {
        return res.status(403).json({
          error: 'Permission denied',
          message: 'Only an administrator can correct a finished entry.'
        });
      }

      // Capture before state for audit
      const before = {
        vitals: currentVisit.vitals,
        tests: currentVisit.tests,
        medications: currentVisit.medications,
        notes: currentVisit.notes
      };

      updateData.lastEditedBy = req.user.userId;
      updateData.lastEditedAt = new Date();

      const updatedVisit = await Visit.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      // Log correction with before/after
      const after = {
        vitals: updatedVisit.vitals,
        tests: updatedVisit.tests,
        medications: updatedVisit.medications,
        notes: updatedVisit.notes
      };

      await logActivity({
        req,
        action: 'VISIT_CORRECTED',
        targetType: 'PatientFile',
        targetId: updatedVisit.patient,
        targetLabel: updatedVisit.patientName,
        details: { before, after }
      });

      return res.json({
        message: 'Visit details corrected',
        visit: updatedVisit.toObject()
      });
    }

  } catch (error) {
    console.error('Save details error:', error);
    res.status(500).json({
      error: 'Save failed',
      message: 'Internal server error'
    });
  }
});

// GET /api/visits/open - Get all open files
router.get('/open', requireAccessLevel(...CAN_HANDLE_FILES), async (req, res) => {
  try {
    const visits = await Visit.find({
      $or: [
        { fileStatus: 'out' },
        { fileStatus: 'returned', documentationStatus: 'pending' }
      ]
    })
    .populate('checkedOutBy', 'fullName')
    .populate('returnedBy', 'fullName')
    .lean();

    const startToday = startOfTodayLagos();

    const visitsWithCarryOver = visits.map(visit => ({
      ...visit,
      carriedOver: visit.checkedOutAt < startToday
    }));

    // Sort: carriedOver first, then oldest first
    visitsWithCarryOver.sort((a, b) => {
      if (a.carriedOver && !b.carriedOver) return -1;
      if (!a.carriedOver && b.carriedOver) return 1;
      return a.checkedOutAt - b.checkedOutAt;
    });

    res.json({
      visits: visitsWithCarryOver,
      total: visitsWithCarryOver.length
    });

  } catch (error) {
    console.error('Get open files error:', error);
    res.status(500).json({
      error: 'Failed to retrieve open files',
      message: 'Internal server error'
    });
  }
});

// GET /api/visits/patient/:patientId - Get patient visit history
router.get('/patient/:patientId', requireAccessLevel(...CAN_VIEW_AND_ADD), async (req, res) => {
  try {
    const { patientId } = req.params;

    // Find patient
    const patient = await PatientFile.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'No patient with that number'
      });
    }

    // Get visits
    const visits = await Visit.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('documentedBy', 'fullName')
      .populate('checkedOutBy', 'fullName')
      .populate('lastEditedBy', 'fullName')
      .lean();

    // Log activity
    await logActivity({
      req,
      action: 'PATIENT_RECORD_VIEWED',
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName
    });

    res.json({
      patient: {
        patientId: patient.patientId,
        fullName: patient.fullName
      },
      visits,
      total: visits.length
    });

  } catch (error) {
    console.error('Get patient history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: 'Internal server error'
    });
  }
});

// GET /api/visits/:id - Get single visit
router.get('/:id', requireAccessLevel(...CAN_VIEW_AND_ADD), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id)
      .populate('checkedOutBy', 'fullName')
      .populate('returnedBy', 'fullName')
      .populate('documentedBy', 'fullName')
      .populate('lastEditedBy', 'fullName')
      .lean();

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    res.json({ visit });

  } catch (error) {
    console.error('Get visit error:', error);
    res.status(500).json({
      error: 'Failed to retrieve visit',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
