import express from 'express';
import { PatientFile, PatientFileData } from '../models/PatientFile';

const router = express.Router();

// GET /api/patients/search - Search patient files
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({
        patients: [],
        total: 0,
        message: 'Search query must be at least 2 characters'
      });
    }

    const startTime = Date.now();
    const patients = await PatientFile.search(q.trim());
    const searchTime = Date.now() - startTime;

    // Add locationDisplay to each result
    const patientsWithLocation = patients.map(patient => ({
      ...patient,
      locationDisplay: PatientFile.getLocationDisplay(patient)
    }));

    res.json({
      patients: patientsWithLocation,
      total: patients.length,
      searchTime,
      query: q.trim()
    });
    return;

  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
    return;
  }
});

// GET /api/patients - Get all patients (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const patients = await PatientFile.findAll({ limit, offset });
    const total = await PatientFile.count();

    const patientsWithLocation = patients.map(patient => ({
      ...patient,
      locationDisplay: PatientFile.getLocationDisplay(patient)
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
    return;

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patients',
      message: 'Internal server error'
    });
    return;
  }
});

// GET /api/patients/:id - Get specific patient
router.get('/:id', async (req, res) => {
  try {
    const patient = await PatientFile.findByPatientId(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    res.json({
      ...patient,
      locationDisplay: PatientFile.getLocationDisplay(patient)
    });
    return;

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patient',
      message: 'Internal server error'
    });
    return;
  }
});

// POST /api/patients - Add new patient file
router.post('/', async (req, res) => {
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
    const existingPatient = await PatientFile.findByPatientId(trimmedPatientId);
    if (existingPatient) {
      return res.status(409).json({
        error: 'Patient ID already exists',
        message: `A patient with ID ${trimmedPatientId} already exists`
      });
    }

    // Create new patient file
    const newPatient = await PatientFile.create({
      patientId: trimmedPatientId,
      fullName: trimmedFullName,
      phoneNumber: trimmedPhoneNumber,
      cabinetNumber: cabinet,
      shelfNumber: shelf,
      folderNumber: folder
    });

    res.status(201).json({
      message: 'Patient file created successfully',
      patient: {
        ...newPatient,
        locationDisplay: `Cabinet ${newPatient.cabinetNumber} → Shelf ${newPatient.shelfNumber} → Folder ${newPatient.folderNumber}`
      }
    });
    return;

  } catch (error) {
    console.error('Create patient error:', error);
    
    if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'Patient ID already exists',
        message: 'This patient ID is already in use'
      });
    }

    res.status(500).json({
      error: 'Failed to create patient file',
      message: 'Internal server error'
    });
    return;
  }
});

// PUT /api/patients/:id/location - Update patient file location
router.put('/:id/location', async (req, res) => {
  try {
    const { cabinetNumber, shelfNumber, folderNumber, reason } = req.body;

    if (!cabinetNumber || !shelfNumber || !folderNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cabinet, shelf, and folder numbers are required'
      });
    }

    const patient = await PatientFile.updateLocation(
      req.params.id,
      parseInt(cabinetNumber),
      parseInt(shelfNumber),
      parseInt(folderNumber),
      reason || 'Location updated via API'
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    res.json({
      message: 'Patient file location updated successfully',
      patient: {
        ...patient,
        locationDisplay: PatientFile.getLocationDisplay(patient)
      }
    });
    return;

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      error: 'Failed to update location',
      message: 'Internal server error'
    });
    return;
  }
});

// DELETE /api/patients/:id - Delete patient file (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const patient = await PatientFile.findByPatientId(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${req.params.id}`
      });
    }

    const deleted = await PatientFile.delete(req.params.id);
    
    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to delete patient file',
        message: 'Delete operation failed'
      });
    }

    res.json({
      message: 'Patient file deleted successfully',
      deletedPatient: {
        patientId: patient.patientId,
        fullName: patient.fullName
      }
    });
    return;

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      error: 'Failed to delete patient file',
      message: 'Internal server error'
    });
    return;
  }
});

export default router;