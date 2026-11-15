const express = require('express');
const PatientFile = require('../models/PatientFile');
const { loadRanges, attachLocation } = require('../utils/storageMap');
const router = express.Router();

// GET /api/dashboard/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get basic counts
    const totalPatients = await PatientFile.countDocuments();
    const patientsWithPhone = await PatientFile.countDocuments({ 
      phoneNumber: { $ne: null, $ne: '' } 
    });

    // Get staff count (active users with staff accounts)
    const Staff = require('../models/Staff');
    const staffCount = await Staff.countDocuments();

    // Get files out count
    const Visit = require('../models/Visit');
    const filesOut = await Visit.countDocuments({ isOpen: true });

    // Get recent patients (last 5 added)
    const recentPatients = await PatientFile.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Add locationDisplay to recent patients using storage map
    const ranges = await loadRanges();
    const recentPatientsWithLocation = attachLocation(recentPatients, ranges);

    res.json({
      totalPatients,
      patientsWithPhone,
      staffCount,
      filesOut,
      recentPatients: recentPatientsWithLocation,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard statistics',
      message: 'Internal server error'
    });
  }
});

// GET /api/dashboard/search-stats - Search performance stats
router.get('/search-stats', async (req, res) => {
  try {
    // This would typically come from a search analytics system
    // For now, we'll return static/calculated stats
    
    const totalFiles = await PatientFile.countDocuments();
    const filesWithPhone = await PatientFile.countDocuments({ 
      phoneNumber: { $ne: null, $ne: '' } 
    });

    res.json({
      searchableFields: {
        patientId: totalFiles,
        fullName: totalFiles,
        phoneNumber: filesWithPhone
      },
      averageSearchTime: '<200ms',
      indexedFields: ['patientId', 'fullName', 'phoneNumber'],
      searchTips: [
        'Search by Patient ID for fastest results',
        'Use partial names for flexible matching',
        'Phone numbers are fully searchable',
        'Search is case-insensitive'
      ]
    });

  } catch (error) {
    console.error('Search stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve search statistics',
      message: 'Internal server error'
    });
  }
});

module.exports = router;