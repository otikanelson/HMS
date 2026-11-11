const express = require('express');
const Visit = require('../models/Visit');
const PatientFile = require('../models/PatientFile');
const { requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// Role constants
const ALL_ROLES = ['ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'];
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

// Helper: Format location from patient document
function formatLocation(patientDoc) {
  if (!patientDoc) return '';
  return `Cabinet ${patientDoc.cabinetNumber} → Shelf ${patientDoc.shelfNumber} → Folder ${patientDoc.folderNumber}`;
}

// POST /api/visits/start - Start a new visit
router.post('/start', requireAccessLevel(...ALL_ROLES), async (req, res) => {
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
        message: 'No patient with that number.'
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
    const existingVisit = await Visit.findOne({ patient: patient._id, isOpen: true })
      .populate('startedBy', 'fullName');

    if (existingVisit) {
      const stageLabels = {
        waiting_for_file: 'Finding file',
        with_doctor: 'With doctor',
        needs_recording: 'File back - needs recording',
        filed: 'Done - file back in cabinet'
      };
      const startedBy = existingVisit.startedBy?.fullName || 'Unknown';
      const startedAt = existingVisit.startedAt.toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return res.status(409).json({
        error: 'Visit in progress',
        message: `This patient already has a visit in progress (${stageLabels[existingVisit.stage]}, started ${startedAt} by ${startedBy}).`,
        visitId: existingVisit._id
      });
    }

    // Create new visit
    const visit = new Visit({
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.fullName,
      fileLocation: formatLocation(patient),
      startedBy: req.user.userId,
      startedAt: new Date()
    });

    try {
      await visit.save();
    } catch (saveError) {
      // Handle race condition with partial unique index
      if (saveError.code === 11000) {
        const conflictVisit = await Visit.findOne({ patient: patient._id, isOpen: true })
          .populate('startedBy', 'fullName');
        
        if (conflictVisit) {
          const stageLabels = {
            waiting_for_file: 'Finding file',
            with_doctor: 'With doctor',
            needs_recording: 'File back - needs recording',
            filed: 'Done - file back in cabinet'
          };
          const startedBy = conflictVisit.startedBy?.fullName || 'Unknown';
          const startedAt = conflictVisit.startedAt.toLocaleString('en-US', {
            timeZone: 'Africa/Lagos',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          return res.status(409).json({
            error: 'Visit in progress',
            message: `This patient already has a visit in progress (${stageLabels[conflictVisit.stage]}, started ${startedAt} by ${startedBy}).`,
            visitId: conflictVisit._id
          });
        }
      }
      throw saveError;
    }

    // Log activity
    await logActivity({
      req,
      action: 'VISIT_STARTED',
      targetType: 'PatientFile',
      targetId: patient._id,
      targetLabel: patient.fullName
    });

    res.status(201).json({
      message: `Visit started for ${patient.fullName}`,
      visit: visit.toObject()
    });

  } catch (error) {
    console.error('Start visit error:', error);
    res.status(500).json({
      error: 'Failed to start visit',
      message: 'Internal server error'
    });
  }
});

// PUT /api/visits/:id/vitals - Record vitals
router.put('/:id/vitals', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { systolic, diastolic, heartRate, notTaken, reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id);

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (visit.stage === 'filed') {
      return res.status(400).json({
        error: 'Visit already filed',
        message: 'This visit is already finished. Use correct to change it.'
      });
    }

    // Validate: either all three vitals OR notTaken with reason
    if (notTaken) {
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Please say why the vitals could not be taken.'
        });
      }
      if (reason.trim().length > 200) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Reason cannot be longer than 200 characters.'
        });
      }

      // Clear any previous vitals and set notTaken
      visit.vitals = undefined;
      visit.vitalsNotTaken = true;
      visit.vitalsNotTakenReason = reason.trim();
    } else {
      // Validate vitals
      if (systolic === undefined || systolic === null || systolic === '' ||
          diastolic === undefined || diastolic === null || diastolic === '' ||
          heartRate === undefined || heartRate === null || heartRate === '') {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Please enter all three: top BP, bottom BP, and heart rate. Or tick "Couldn\'t be taken".'
        });
      }

      const sys = Number(systolic);
      const dia = Number(diastolic);
      const hr = Number(heartRate);

      if (!Number.isInteger(sys) || sys < 50 || sys > 260) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Top blood pressure number must be between 50 and 260.'
        });
      }

      if (!Number.isInteger(dia) || dia < 30 || dia > 160) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Bottom blood pressure number must be between 30 and 160.'
        });
      }

      if (!Number.isInteger(hr) || hr < 20 || hr > 250) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Heart rate must be between 20 and 250.'
        });
      }

      if (sys <= dia) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Top blood pressure number must be greater than bottom number.'
        });
      }

      // Set vitals
      visit.vitals = { systolic: sys, diastolic: dia, heartRate: hr };
      visit.vitalsNotTaken = false;
      visit.vitalsNotTakenReason = undefined;
    }

    visit.vitalsBy = req.user.userId;
    visit.vitalsAt = new Date();

    await visit.save();

    res.json({
      message: 'Check-in saved',
      visit: visit.toObject()
    });

  } catch (error) {
    console.error('Vitals error:', error);
    res.status(500).json({
      error: 'Failed to save vitals',
      message: 'Internal server error'
    });
  }
});

// POST /api/visits/:id/send-to-doctor - Send patient to doctor
router.post('/:id/send-to-doctor', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { nameMatches } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    // Check nameMatches
    if (nameMatches !== true) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Please confirm the name on the paper file matches.'
      });
    }

    const visit = await Visit.findById(id);

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (visit.stage !== 'waiting_for_file') {
      return res.status(409).json({
        error: 'Wrong stage',
        message: 'This patient was already sent to the doctor.'
      });
    }

    // Check vitals are recorded
    const hasVitals = (visit.vitals && visit.vitals.systolic !== undefined) || visit.vitalsNotTaken;
    if (!hasVitals) {
      return res.status(400).json({
        error: 'Vitals required',
        message: 'Record the BP and heart rate first.'
      });
    }

    // Atomic update
    const updated = await Visit.findOneAndUpdate(
      { _id: id, stage: 'waiting_for_file' },
      {
        stage: 'with_doctor',
        sentToDoctorBy: req.user.userId,
        sentToDoctorAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(409).json({
        error: 'Already sent',
        message: 'This patient was already sent to the doctor.'
      });
    }

    // Log activity
    await logActivity({
      req,
      action: 'SENT_TO_DOCTOR',
      targetType: 'PatientFile',
      targetId: updated.patient,
      targetLabel: updated.patientName
    });

    res.json({
      message: 'Patient sent to doctor',
      visit: updated.toObject()
    });

  } catch (error) {
    console.error('Send to doctor error:', error);
    res.status(500).json({
      error: 'Failed to update visit',
      message: 'Internal server error'
    });
  }
});

// POST /api/visits/:id/file-back - Mark file as back
router.post('/:id/file-back', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    // Atomic update
    const updated = await Visit.findOneAndUpdate(
      { _id: id, stage: 'with_doctor' },
      {
        stage: 'needs_recording',
        fileBackBy: req.user.userId,
        fileBackAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(409).json({
        error: 'Wrong stage',
        message: 'This file was already marked as back.'
      });
    }

    // Log activity
    await logActivity({
      req,
      action: 'FILE_RETURNED',
      targetType: 'PatientFile',
      targetId: updated.patient,
      targetLabel: updated.patientName
    });

    res.json({
      message: 'File marked as back',
      visit: updated.toObject()
    });

  } catch (error) {
    console.error('File back error:', error);
    res.status(500).json({
      error: 'Failed to update visit',
      message: 'Internal server error'
    });
  }
});

// PUT /api/visits/:id/record - Record and file
router.put('/:id/record', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { tests, testsNone, medications, medicationsNone, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id).populate('patient', 'patientId fullName cabinetNumber shelfNumber folderNumber');

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (visit.stage !== 'needs_recording') {
      if (visit.stage === 'filed') {
        return res.status(409).json({
          error: 'Already filed',
          message: 'Already filed.'
        });
      }
      return res.status(409).json({
        error: 'File not back yet',
        message: "The file isn't back yet - mark it as back first."
      });
    }

    // Check vitals are still recorded
    const hasVitals = (visit.vitals && visit.vitals.systolic !== undefined) || visit.vitalsNotTaken;
    if (!hasVitals) {
      return res.status(400).json({
        error: 'Vitals required',
        message: 'Vitals must be recorded before filing.'
      });
    }

    // Validate tests
    let cleanedTests = [];
    if (tests && Array.isArray(tests)) {
      cleanedTests = tests
        .map(t => (typeof t === 'string' ? t.trim() : ''))
        .filter(t => t.length > 0);

      if (cleanedTests.length > 20) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Maximum 20 test lines allowed.'
        });
      }

      for (const test of cleanedTests) {
        if (test.length > 200) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Each test line cannot be longer than 200 characters.'
          });
        }
      }
    }

    // Tests: either at least one OR testsNone, not both, not neither
    if ((cleanedTests.length > 0) === testsNone) {
      return res.status(400).json({
        error: 'Validation error',
        message: "Say whether any tests were done: add them, or tick 'No tests'."
      });
    }

    // Validate medications
    let cleanedMeds = [];
    if (medications && Array.isArray(medications)) {
      cleanedMeds = medications
        .map(m => (typeof m === 'string' ? m.trim() : ''))
        .filter(m => m.length > 0);

      if (cleanedMeds.length > 20) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Maximum 20 medication lines allowed.'
        });
      }

      for (const med of cleanedMeds) {
        if (med.length > 200) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Each medication line cannot be longer than 200 characters.'
          });
        }
      }
    }

    // Medications: either at least one OR medicationsNone, not both, not neither
    if ((cleanedMeds.length > 0) === medicationsNone) {
      return res.status(400).json({
        error: 'Validation error',
        message: "Say whether any medicines were given: add them, or tick 'No medicines'."
      });
    }

    // Notes optional but validate length
    const cleanedNotes = notes ? notes.trim() : '';
    if (cleanedNotes.length > 1000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Notes cannot be longer than 1000 characters.'
      });
    }

    // Atomic update from needs_recording to filed
    const updated = await Visit.findOneAndUpdate(
      { _id: id, stage: 'needs_recording' },
      {
        stage: 'filed',
        isOpen: false,
        tests: cleanedTests,
        testsNone: testsNone || false,
        medications: cleanedMeds,
        medicationsNone: medicationsNone || false,
        notes: cleanedNotes,
        filedBy: req.user.userId,
        filedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('patient', 'patientId fullName cabinetNumber shelfNumber folderNumber');

    if (!updated) {
      return res.status(409).json({
        error: 'Already filed',
        message: 'This visit was already filed.'
      });
    }

    // Log activity
    await logActivity({
      req,
      action: 'VISIT_FILED',
      targetType: 'PatientFile',
      targetId: updated.patient._id,
      targetLabel: updated.patientName
    });

    res.json({
      message: 'Visit recorded and filed',
      visit: {
        ...updated.toObject(),
        currentLocation: formatLocation(updated.patient)
      }
    });

  } catch (error) {
    console.error('Record error:', error);
    res.status(500).json({
      error: 'Failed to file visit',
      message: 'Internal server error'
    });
  }
});

// PUT /api/visits/:id/correct - Correct a filed visit (Admin only)
router.put('/:id/correct', requireAccessLevel(...CAN_CORRECT), async (req, res) => {
  try {
    const { id } = req.params;
    const { vitals, notTaken, reason, tests, testsNone, medications, medicationsNone, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id);

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    if (visit.stage !== 'filed') {
      return res.status(400).json({
        error: 'Not filed yet',
        message: 'Only finished visits can be corrected.'
      });
    }

    // Capture before state
    const before = {
      vitals: visit.vitals,
      vitalsNotTaken: visit.vitalsNotTaken,
      vitalsNotTakenReason: visit.vitalsNotTakenReason,
      tests: visit.tests,
      testsNone: visit.testsNone,
      medications: visit.medications,
      medicationsNone: visit.medicationsNone,
      notes: visit.notes
    };

    // Apply changes with same validation as record
    // Vitals
    if (notTaken !== undefined) {
      if (notTaken) {
        if (!reason || !reason.trim()) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Please say why the vitals could not be taken.'
          });
        }
        if (reason.trim().length > 200) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Reason cannot be longer than 200 characters.'
          });
        }
        visit.vitals = undefined;
        visit.vitalsNotTaken = true;
        visit.vitalsNotTakenReason = reason.trim();
      } else if (vitals) {
        const { systolic, diastolic, heartRate } = vitals;
        
        if (systolic === undefined || diastolic === undefined || heartRate === undefined) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Please enter all three: top BP, bottom BP, and heart rate.'
          });
        }

        const sys = Number(systolic);
        const dia = Number(diastolic);
        const hr = Number(heartRate);

        if (!Number.isInteger(sys) || sys < 50 || sys > 260) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Top blood pressure number must be between 50 and 260.'
          });
        }

        if (!Number.isInteger(dia) || dia < 30 || dia > 160) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Bottom blood pressure number must be between 30 and 160.'
          });
        }

        if (!Number.isInteger(hr) || hr < 20 || hr > 250) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Heart rate must be between 20 and 250.'
          });
        }

        if (sys <= dia) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Top blood pressure number must be greater than bottom number.'
          });
        }

        visit.vitals = { systolic: sys, diastolic: dia, heartRate: hr };
        visit.vitalsNotTaken = false;
        visit.vitalsNotTakenReason = undefined;
      }
    }

    // Tests
    if (tests !== undefined || testsNone !== undefined) {
      let cleanedTests = [];
      if (tests && Array.isArray(tests)) {
        cleanedTests = tests
          .map(t => (typeof t === 'string' ? t.trim() : ''))
          .filter(t => t.length > 0);

        if (cleanedTests.length > 20) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Maximum 20 test lines allowed.'
          });
        }

        for (const test of cleanedTests) {
          if (test.length > 200) {
            return res.status(400).json({
              error: 'Validation error',
              message: 'Each test line cannot be longer than 200 characters.'
            });
          }
        }
      }

      const finalTestsNone = testsNone !== undefined ? testsNone : visit.testsNone;
      if ((cleanedTests.length > 0) === finalTestsNone) {
        return res.status(400).json({
          error: 'Validation error',
          message: "Say whether any tests were done: add them, or tick 'No tests'."
        });
      }

      visit.tests = cleanedTests;
      visit.testsNone = finalTestsNone;
    }

    // Medications
    if (medications !== undefined || medicationsNone !== undefined) {
      let cleanedMeds = [];
      if (medications && Array.isArray(medications)) {
        cleanedMeds = medications
          .map(m => (typeof m === 'string' ? m.trim() : ''))
          .filter(m => m.length > 0);

        if (cleanedMeds.length > 20) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Maximum 20 medication lines allowed.'
          });
        }

        for (const med of cleanedMeds) {
          if (med.length > 200) {
            return res.status(400).json({
              error: 'Validation error',
              message: 'Each medication line cannot be longer than 200 characters.'
            });
          }
        }
      }

      const finalMedsNone = medicationsNone !== undefined ? medicationsNone : visit.medicationsNone;
      if ((cleanedMeds.length > 0) === finalMedsNone) {
        return res.status(400).json({
          error: 'Validation error',
          message: "Say whether any medicines were given: add them, or tick 'No medicines'."
        });
      }

      visit.medications = cleanedMeds;
      visit.medicationsNone = finalMedsNone;
    }

    // Notes
    if (notes !== undefined) {
      const cleanedNotes = notes.trim();
      if (cleanedNotes.length > 1000) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Notes cannot be longer than 1000 characters.'
        });
      }
      visit.notes = cleanedNotes;
    }

    visit.lastEditedBy = req.user.userId;
    visit.lastEditedAt = new Date();

    await visit.save();

    // Capture after state
    const after = {
      vitals: visit.vitals,
      vitalsNotTaken: visit.vitalsNotTaken,
      vitalsNotTakenReason: visit.vitalsNotTakenReason,
      tests: visit.tests,
      testsNone: visit.testsNone,
      medications: visit.medications,
      medicationsNone: visit.medicationsNone,
      notes: visit.notes
    };

    // Log with before/after
    await logActivity({
      req,
      action: 'VISIT_CORRECTED',
      targetType: 'PatientFile',
      targetId: visit.patient,
      targetLabel: visit.patientName,
      details: { before, after }
    });

    res.json({
      message: 'Visit corrected',
      visit: visit.toObject()
    });

  } catch (error) {
    console.error('Correct error:', error);
    res.status(500).json({
      error: 'Failed to correct visit',
      message: 'Internal server error'
    });
  }
});

// GET /api/visits/open - Get all open visits
router.get('/open', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const visits = await Visit.find({ isOpen: true })
      .populate('startedBy', 'fullName')
      .populate('patient', 'patientId fullName cabinetNumber shelfNumber folderNumber')
      .lean();

    const startToday = startOfTodayLagos();

    const visitsWithDetails = visits.map(visit => ({
      ...visit,
      carriedOver: visit.startedAt < startToday,
      currentLocation: formatLocation(visit.patient)
    }));

    // Sort: carriedOver first, then by stage order (needs_recording, with_doctor, waiting_for_file), then oldest first
    const stageOrder = { needs_recording: 0, with_doctor: 1, waiting_for_file: 2, filed: 3 };
    visitsWithDetails.sort((a, b) => {
      if (a.carriedOver && !b.carriedOver) return -1;
      if (!a.carriedOver && b.carriedOver) return 1;
      const stageCompare = stageOrder[a.stage] - stageOrder[b.stage];
      if (stageCompare !== 0) return stageCompare;
      return a.startedAt - b.startedAt;
    });

    res.json({
      visits: visitsWithDetails,
      total: visitsWithDetails.length
    });

  } catch (error) {
    console.error('Get open visits error:', error);
    res.status(500).json({
      error: 'Failed to retrieve open visits',
      message: 'Internal server error'
    });
  }
});

// GET /api/visits/patient/:patientId - Get patient visit history
router.get('/patient/:patientId', requireAccessLevel(...ALL_ROLES), async (req, res) => {
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

    // Get visits (including unfinished)
    const visits = await Visit.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('filedBy', 'fullName')
      .populate('startedBy', 'fullName')
      .populate('lastEditedBy', 'fullName')
      .lean();

    // Log activity (once per call)
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
router.get('/:id', requireAccessLevel(...ALL_ROLES), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: "That isn't a valid record."
      });
    }

    const visit = await Visit.findById(id)
      .populate('startedBy', 'fullName')
      .populate('sentToDoctorBy', 'fullName')
      .populate('fileBackBy', 'fullName')
      .populate('filedBy', 'fullName')
      .populate('vitalsBy', 'fullName')
      .populate('lastEditedBy', 'fullName')
      .populate('patient', 'patientId fullName cabinetNumber shelfNumber folderNumber')
      .lean();

    if (!visit) {
      return res.status(404).json({
        error: 'Visit not found',
        message: 'That visit record was not found'
      });
    }

    res.json({ 
      visit: {
        ...visit,
        currentLocation: formatLocation(visit.patient)
      }
    });

  } catch (error) {
    console.error('Get visit error:', error);
    res.status(500).json({
      error: 'Failed to retrieve visit',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
